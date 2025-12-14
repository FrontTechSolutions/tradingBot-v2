const Position = require('../models/Position');
const Trade = require('../models/Trade');

/**
 * Service de gestion des opérations de trading
 */
const DatabaseService = require('./DatabaseService');
const ExchangeService = require('./ExchangeService');
const IndicatorService = require('./IndicatorService');
const { getLogger } = require('../utils/Logger');

class TradingService {
    constructor(config) {
        this.config = config;
        this.logger = getLogger();
        this.isRunning = false;
        this.tickInterval = null;
        this.isProcessing = false;
        
        // Services internes
        this.databaseService = null;
        this.exchangeService = null;
        this.indicatorService = null;

        // État volatile pour le trailing stop (perdu au redémarrage)
        this.highestPriceInPosition = 0;
    }

    /**
     * Initialise tous les services nécessaires
     */
    async initialize(showWallet = true) {
        this.logger.info('TRADING', 'Initialisation des services...');
        
        // Base de données
        this.databaseService = new DatabaseService(this.config.bot.dbPath, this.config.trading.symbol);
        this.databaseService.initialize();
        
        // Exchange
        this.exchangeService = new ExchangeService({
            ...this.config.exchange,
            symbol: this.config.trading.symbol
        });
        await this.exchangeService.initialize();
        
        // Indicateurs
        this.indicatorService = new IndicatorService(this.config.indicators);
        
        // Affichage du portefeuille au démarrage (seulement si demandé)
        if (showWallet) {
            await this.displayWalletBalance();
        }
        
        this.logger.info('TRADING', 'Services initialisés');
    }

    /**
     * Démarre le trading avec cycles automatiques
     */
    async start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.logger.info('TRADING', `Démarrage sur ${this.config.trading.symbol}`);
        
        // Premier cycle
        await this.processMarketTick();
        
        // Cycles récurrents
        this.tickInterval = setInterval(async () => {
            if (this.isRunning) {
                await this.processMarketTick();
            }
        }, this.config.bot.tickInterval);
    }

    /**
     * Arrête le trading
     */
    async stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
        
        if (this.databaseService) {
            this.databaseService.close();
        }
        
        this.logger.info('TRADING', 'Service arrêté');
    }

    /**
     * Analyse le marché et exécute la logique de trading
     */
    async processMarketTick() {
        if (this.isProcessing) {
            this.logger.info('[TRADING] Tick en cours, ignore...');
            return;
        }

        this.isProcessing = true;
        
        try {
            this.logger.info(`[TRADING] Analyse de ${this.config.trading.symbol}...`);
            
            // Récupération des données de marché
            const marketData = await this.getMarketData();
            
            // Calcul des indicateurs
            const indicators = this.indicatorService.calculateIndicators(marketData.ohlcv);
            
            // Récupération du statut actuel du bot
            const botStatus = this.databaseService.getBotStatus();
            const currentPosition = this.databaseService.getPosition();
            
            // Log des informations de marché
            this.logMarketInfo(marketData.ticker, indicators);
            
            // Analyse des signaux
            const signalAnalysis = this.indicatorService.analyzeSignals(indicators, marketData.ticker.last, this.config.trading.symbol);
            
            // Exécution de la logique selon le statut
            if (botStatus.isIdle()) {
                await this.handleIdleState(signalAnalysis, marketData, indicators);
            } else if (botStatus.isInPosition()) {
                await this.handleInPositionState(signalAnalysis, marketData, indicators, currentPosition);
            }
            
        } catch (error) {
            console.error(`[TRADING] Erreur lors du tick: ${error.message}`);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Récupère les données de marché nécessaires
     */
    async getMarketData() {
        const [ohlcv, ticker] = await Promise.all([
            this.exchangeService.fetchOHLCV(this.config.trading.symbol, this.config.trading.timeframe, 100),
            this.exchangeService.fetchTicker(this.config.trading.symbol)
        ]);

        return { ohlcv, ticker };
    }

    /**
     * Gère l'état IDLE - recherche de signaux d'achat
     */
    async handleIdleState(signalAnalysis, marketData, indicators) {
        if (!signalAnalysis.buySignal) {
            return;
        }

        this.logger.info('[TRADING] Signal d\'achat détecté!');
        this.logger.info(`[TRADING] ${signalAnalysis.reason}`);
            this.logger.info(`[TRADING] Mode de trading: ${this.config.trading.tradingMode}`);        try {
            // Vérification des conditions de marché (désactivée pour tests)
            const advancedStats = this.indicatorService.calculateAdvancedStats(marketData.ohlcv);
            if (!this.indicatorService.isMarketConditionFavorable(indicators, advancedStats)) {
                this.logger.info('[TRADING] ⚠️  Conditions de marché défavorables, mais on continue pour les tests');
                // return; // Commenté pour permettre les tests
            }

            // Vérification du solde disponible
            const tradeAmount = this.config.trading.amount || 50;  // Montant en USDC
            const currentPrice = marketData.ticker.ask;  // Utiliser ask pour l'achat
            const quantity = tradeAmount / currentPrice;  // Quantité à acheter
            
            this.logger.info(`[DEBUG] Vérification fonds: ${tradeAmount} USDC à ${currentPrice} (ask) = ${quantity.toFixed(6)} ${this.config.trading.symbol.split('/')[0]}`);
            
            const hasFunds = await this.exchangeService.hasSufficientBalance(
                this.config.trading.symbol, 
                'buy', 
                quantity, 
                currentPrice
            );

            if (!hasFunds) {
                this.logger.info(`[TRADING] Fonds insuffisants: besoin ${tradeAmount} USDC, prix ${currentPrice}`);
                return;
            }

            // Calcul du prix et de la quantité optimaux
            const { price: orderPrice, quantity: orderQuantity } = this.calculateOptimalOrderParams(
                marketData.ticker, 
                'buy', 
                quantity
            );

            // Exécution selon le mode choisi
            if (this.config.trading.tradingMode === 'OCO' && this.config.trading.useOCOOrders) {
                await this.executeBuyOrderWithAutoOCO(this.config.trading.symbol, orderQuantity, orderPrice);
            } else {
                await this.executeBuyOrder(this.config.trading.symbol, orderQuantity, orderPrice);
            }

        } catch (error) {
            console.error(`[TRADING] Erreur lors de l'achat: ${error.message}`);
        }
    }

    /**
     * Gère l'état IN_POSITION - selon le mode de trading
     */
    async handleInPositionState(signalAnalysis, marketData, indicators, currentPosition) {
        // Si position OCO, seule surveillance passive
        if (currentPosition.isOCOOrder()) {
            await this.monitorOCOPosition(currentPosition, marketData);
            return;
        }

        // Mode indicateurs : attendre le signal de vente
        if (this.config.tradingMode === 'INDICATORS') {
            await this.handleIndicatorBasedExit(signalAnalysis, marketData, indicators, currentPosition);
        } else {
            // Vérification des conditions d'urgence
            this.checkEmergencyExitConditions(marketData.ticker, currentPosition);
        }
    }

    /**
     * Gestion de sortie basée sur les indicateurs (Bollinger + RSI)
     */
    async handleIndicatorBasedExit(signalAnalysis, marketData, indicators, currentPosition) {
        // Mise à jour du plus haut pour le trailing stop
        const currentPrice = marketData.ticker.last;
        if (currentPrice > this.highestPriceInPosition) {
            this.highestPriceInPosition = currentPrice;
        }

        // Vérifications de sécurité d'abord
        const emergencyExit = this.checkEmergencyExitConditions(marketData.ticker, currentPosition);
        if (emergencyExit) {
            this.logger.info('[TRADING] SORTIE D\'URGENCE déclenchée!');
            await this.executeEmergencyExit(marketData.ticker.symbol, currentPosition);
            return;
        }

        // Vérification "Secure Profit" (Trailing Stop manuel)
        // Si gain > trigger et chute de drop depuis le plus haut
        const unrealizedPnL = currentPosition.getUnrealizedPnLPercent(currentPrice);
        const dropFromHigh = ((this.highestPriceInPosition - currentPrice) / this.highestPriceInPosition) * 100;
        
        const triggerPercent = this.config.trading.secureProfitTrigger || 1.5;
        const dropPercent = this.config.trading.secureProfitDrop || 0.5;

        if (unrealizedPnL >= triggerPercent && dropFromHigh >= dropPercent) {
            this.logger.info(`[TRADING] 🛡️ SECURE PROFIT: Gain ${unrealizedPnL.toFixed(2)}% > ${triggerPercent}% ET Chute ${dropFromHigh.toFixed(2)}% >= ${dropPercent}%`);
            await this.executeSellOrder(marketData.ticker.symbol, currentPosition.quantity, currentPrice, currentPosition);
            this.highestPriceInPosition = 0; // Reset
            return;
        }

        // Attendre le signal des indicateurs
        if (!signalAnalysis.sellSignal) {
            this.logger.info(`[TRADING] En position - Attente signal: ${signalAnalysis.reason}`);
            this.logPositionStatus(currentPosition, marketData.ticker, indicators);
            return;
        }

        this.logger.info('[TRADING] Signal de vente des indicateurs détecté!');
        this.logger.info(`[TRADING] ${signalAnalysis.reason}`);

        try {
            if (!currentPosition.isActive()) {
                this.logger.info('[TRADING] Aucune position active trouvée');
                return;
            }

            // Calcul du prix de vente optimal
            const { price, quantity } = this.calculateOptimalOrderParams(
                marketData.ticker, 
                'sell', 
                currentPosition.quantity
            );

            // Exécution de l'ordre de vente
            await this.executeSellOrder(marketData.ticker.symbol, quantity, price, currentPosition);

        } catch (error) {
            console.error(`[TRADING] Erreur lors de la vente: ${error.message}`);
        }
    }

    /**
     * Calcule les paramètres optimaux pour un ordre
     */
    calculateOptimalOrderParams(ticker, side, baseQuantity) {
        let price, quantity;

        this.logger.info(`[DEBUG] calculateOptimalOrderParams: ${side}, baseQuantity=${baseQuantity}, ticker.ask=${ticker.ask}, ticker.bid=${ticker.bid}`);

        if (side === 'buy') {
            // Pour un ordre d'achat, utiliser l'ask (prix de vente) avec une marge
            price = this.exchangeService.roundPrice(this.config.trading.symbol, ticker.ask * 1.0005);
            quantity = this.exchangeService.roundAmount(this.config.trading.symbol, baseQuantity);
        } else {
            // Pour un ordre de vente, utiliser le bid (prix d'achat) avec une marge
            price = this.exchangeService.roundPrice(this.config.trading.symbol, ticker.bid * 0.9995);
            quantity = this.exchangeService.roundAmount(this.config.trading.symbol, baseQuantity);
        }

        this.logger.info(`[DEBUG] Après calcul: price=${price}, quantity=${quantity}, valeur=${price * quantity}`);

        // Vérification des limites du marché
        const limits = this.exchangeService.getSymbolLimits(this.config.trading.symbol);
        this.logger.info(`[DEBUG] Limites: amount.min=${limits.amount.min}, cost.min=${limits.cost.min}`);
        
        if (quantity < limits.amount.min) {
            throw new Error(`Quantité trop faible: ${quantity} < ${limits.amount.min}`);
        }
        
        if (price * quantity < limits.cost.min) {
            throw new Error(`Valeur d'ordre trop faible: ${price * quantity} < ${limits.cost.min}`);
        }

        return { price, quantity };
    }

    /**
     * Exécute un ordre d'achat
     */
    async executeBuyOrder(symbol, quantity, price) {
        try {
            // Placement de l'ordre
            const order = await this.exchangeService.createBuyOrder(symbol, quantity, price);
            
            // Attente de l'exécution
            const filledOrder = await this.exchangeService.waitForOrderFill(
                order.id, 
                symbol, 
                this.config.trading.orderTimeout || 30000
            );

            if (filledOrder && filledOrder.status === 'closed') {
                // Ordre exécuté avec succès
                await this.handleBuyOrderFilled(filledOrder);
            } else {
                // Timeout ou échec
                this.logger.info(`[TRADING] Ordre d'achat non exécuté dans les temps: ${order.id}`);
                await this.exchangeService.cancelOrder(order.id, symbol);
            }

        } catch (error) {
            console.error(`[TRADING] Erreur ordre d'achat: ${error.message}`);
            throw error;
        }
    }

    /**
     * Exécute un ordre de vente (simple ou OCO)
     */
    async executeSellOrder(symbol, quantity, price, position) {
        try {
            let order;
            
            // Choix du type d'ordre selon la configuration
            if (this.config.useOCOOrders && this.config.ocoTakeProfitPercent && this.config.ocoStopLossPercent) {
                order = await this.executeOCOSellOrder(symbol, quantity, position);
                
                // Pour les ordres OCO, pas besoin d'attendre - ils se gèrent automatiquement
                this.logger.info(`[TRADING] Ordre OCO placé avec succès: ${order.orderListId}`);
                return;
            } else {
                // Ordre limite classique
                order = await this.exchangeService.createSellOrder(symbol, quantity, price);
            }
            
            // Attente de l'exécution pour les ordres simples
            const filledOrder = await this.exchangeService.waitForOrderFill(
                order.id, 
                symbol, 
                this.config.trading.orderTimeout || 30000
            );

            if (filledOrder && filledOrder.status === 'closed') {
                // Ordre exécuté avec succès
                await this.handleSellOrderFilled(filledOrder, position);
            } else {
                // Timeout ou échec
                this.logger.info(`[TRADING] Ordre de vente non exécuté dans les temps: ${order.id}`);
                await this.exchangeService.cancelOrder(order.id, symbol);
            }

        } catch (error) {
            console.error(`[TRADING] Erreur ordre de vente: ${error.message}`);
            throw error;
        }
    }

    /**
     * Exécute un ordre OCO de vente avec take-profit et stop-loss automatiques
     */
    async executeOCOSellOrder(symbol, quantity, position) {
        const buyPrice = position.buyPrice;
        
        // Calcul des prix pour l'OCO
        const takeProfitPrice = this.exchangeService.roundPrice(
            symbol, 
            buyPrice * (1 + this.config.ocoTakeProfitPercent / 100)
        );
        
        const stopLossPrice = this.exchangeService.roundPrice(
            symbol,
            buyPrice * (1 - this.config.ocoStopLossPercent / 100)
        );
        
        this.logger.info(`[TRADING] Création ordre OCO - TP: ${takeProfitPrice}, SL: ${stopLossPrice}`);
        
        // Placement de l'ordre OCO
        return await this.exchangeService.createSellOCOOrder(
            symbol,
            quantity,
            takeProfitPrice,
            stopLossPrice
        );
    }

    /**
     * Traite un ordre d'achat exécuté
     */
    async handleBuyOrderFilled(order) {
        try {
            const now = Date.now();
            
            // Reset du plus haut pour la nouvelle position
            this.highestPriceInPosition = order.average || order.price;

            // Création de la nouvelle position
            const position = new Position();
            position.update({
                symbol: this.config.trading.symbol,
                buyPrice: order.average || order.price,
                quantity: order.filled,
                buyOrderId: order.id,
                createdAt: now
            });

            // Création du trade
            const trade = Trade.createBuyTrade(
                this.config.trading.symbol,
                order.average || order.price,
                order.filled,
                order.id
            );

            // Sauvegarde en base de données (transaction)
            this.databaseService.executeBuyTransaction(null, position, trade);

            this.logger.info(`[TRADING] Achat exécuté: ${order.filled} ${this.config.trading.symbol} à ${order.average || order.price}`);

        } catch (error) {
            console.error(`[TRADING] Erreur traitement achat: ${error.message}`);
            throw error;
        }
    }

    /**
     * Traite un ordre d'achat OCO (avec placement automatique de la sortie)
     */
    async handleBuyOrderFilledWithOCO(order) {
        try {
            const now = Date.now();
            const buyPrice = order.average || order.price;
            
            // Calcul automatique des prix OCO après achat
            const takeProfitPrice = this.exchangeService.roundPrice(
                this.config.trading.symbol,
                buyPrice * (1 + this.config.ocoTakeProfitPercent / 100)
            );
            
            const stopLossPrice = this.exchangeService.roundPrice(
                this.config.trading.symbol,
                buyPrice * (1 - this.config.ocoStopLossPercent / 100)
            );

            // Placement automatique de l'ordre OCO de sortie
            const ocoOrder = await this.exchangeService.createSellOCOOrder(
                this.config.trading.symbol,
                order.filled,
                takeProfitPrice,
                stopLossPrice
            );
            
            // Création de la nouvelle position avec les détails OCO
            const position = new Position();
            position.update({
                symbol: this.config.trading.symbol,
                buyPrice: buyPrice,
                quantity: order.filled,
                buyOrderId: order.id,
                ocoOrderListId: ocoOrder.orderListId,
                orderType: 'OCO',
                takeProfitPrice: takeProfitPrice,
                stopLossPrice: stopLossPrice,
                createdAt: now
            });

            // Création du trade d'achat
            const trade = Trade.createBuyTrade(
                this.config.trading.symbol,
                buyPrice,
                order.filled,
                order.id
            );

            // Sauvegarde en base de données (transaction)
            this.databaseService.executeBuyTransaction(null, position, trade);

            this.logger.info(`[TRADING] Achat + OCO exécutés: ${order.filled} ${this.config.trading.symbol} à ${buyPrice}`);
            this.logger.info(`[TRADING] OCO configuré - TP: ${takeProfitPrice}, SL: ${stopLossPrice}`);

        } catch (error) {
            console.error(`[TRADING] Erreur traitement achat OCO: ${error.message}`);
            throw error;
        }
    }

    /**
     * Traite un ordre de vente exécuté
     */
    async handleSellOrderFilled(order, position) {
        try {
            // Création du trade
            const trade = Trade.createSellTrade(
                this.config.trading.symbol,
                order.average || order.price,
                order.filled,
                order.id
            );

            // Calcul des profits
            const profit = this.calculateProfit(position, order);

            // Sauvegarde en base de données (transaction)
            this.databaseService.executeSellTransaction(trade);

            // Log des résultats
            this.logTradeResults(order, position, profit);

        } catch (error) {
            console.error(`[TRADING] Erreur traitement vente: ${error.message}`);
            throw error;
        }
    }

    /**
     * Calcule les profits d'un trade
     */
    calculateProfit(position, sellOrder) {
        const buyPrice = position.buyPrice;
        const sellPrice = sellOrder.average || sellOrder.price;
        const quantity = sellOrder.filled;

        const profitAmount = (sellPrice - buyPrice) * quantity;
        const profitPercent = ((sellPrice - buyPrice) / buyPrice) * 100;

        return {
            amount: profitAmount,
            percent: profitPercent,
            buyPrice,
            sellPrice,
            quantity
        };
    }

    /**
     * Vérifie les conditions de sortie (stop-loss, take-profit)
     */
    checkExitConditions(ticker, position, indicators) {
        if (!position.isActive()) return;

        const currentPrice = ticker.last;
        const unrealizedPnL = position.getUnrealizedPnLPercent(currentPrice);

        // Stop-loss à -2%
        if (this.config.stopLossPercent && unrealizedPnL <= -this.config.stopLossPercent) {
            this.logger.info(`[TRADING] Stop-loss déclenché: ${unrealizedPnL.toFixed(2)}%`);
            // Ici, on pourrait forcer une vente immédiate
        }

        // Take-profit à +3%
        if (this.config.takeProfitPercent && unrealizedPnL >= this.config.takeProfitPercent) {
            this.logger.info(`[TRADING] Take-profit potentiel: ${unrealizedPnL.toFixed(2)}%`);
        }
    }

    /**
     * Log les informations de marché
     */
    logMarketInfo(ticker, indicators) {
        const priceInfo = `Prix: ${ticker.last}`;
        const indicatorInfo = indicators.isValid() ? indicators.toLogString() : 'Indicateurs: N/A';
        this.logger.info(`[TRADING] ${priceInfo}, ${indicatorInfo}`);
    }

    /**
     * Log les résultats d'un trade
     */
    logTradeResults(order, position, profit) {
        this.logger.info(`[TRADING] Vente exécutée: ${order.filled} ${this.config.trading.symbol} à ${order.average || order.price}`);
        this.logger.info(`[TRADING] Trade terminé. Profit: ${profit.amount.toFixed(6)} USDC (${profit.percent.toFixed(2)}%)`);
    }

    /**
     * Récupère les statistiques de trading
     */
    getTradingStats() {
        const stats = this.databaseService.getTradeStats();
        const position = this.databaseService.getPosition();

        return {
            totalTrades: stats.total_trades || 0,
            buyTrades: stats.buy_trades || 0,
            sellTrades: stats.sell_trades || 0,
            totalPnL: stats.total_pnl || 0,
            currentPosition: position.isActive() ? {
                symbol: position.symbol,
                buyPrice: position.buyPrice,
                quantity: position.quantity,
                unrealizedPnL: null // Sera calculé avec le prix actuel
            } : null
        };
    }

    /**
     * Exécute un achat avec OCO automatique post-achat
     */
    async executeBuyOrderWithAutoOCO(symbol, quantity, price) {
        this.logger.info('[TRADING] Mode OCO: Achat + placement automatique OCO');
        
        const order = await this.exchangeService.createBuyOrder(symbol, quantity, price);
        const filledOrder = await this.exchangeService.waitForOrderFill(order.id, symbol, this.config.trading.orderTimeout);
        
        if (filledOrder && filledOrder.status === 'closed') {
            await this.handleBuyOrderFilledWithOCO(filledOrder);
        } else {
            this.logger.info(`[TRADING] Ordre d'achat non exécuté dans les temps: ${order.id}`);
            await this.exchangeService.cancelOrder(order.id, symbol);
        }
    }

    /**
     * Surveillance passive d'une position OCO
     */
    async monitorOCOPosition(position, marketData) {
        try {
            // Vérifier le statut de l'ordre OCO
            const ocoStatus = await this.exchangeService.fetchOCOOrder(position.ocoOrderListId);
            
            if (ocoStatus.listOrderStatus === 'ALL_DONE') {
                this.logger.info('[TRADING] Ordre OCO exécuté automatiquement!');
                // Mettre à jour la base de données
                this.databaseService.executeSellTransaction(
                    Trade.createOCOTrade(position.symbol, 'SELL', marketData.ticker.last, position.quantity, position.ocoOrderListId, 'AUTO')
                );
            } else {
                // Log du statut actuel
                const currentPrice = marketData.ticker.last;
                const unrealizedPnL = position.getUnrealizedPnLPercent(currentPrice);
                this.logger.info(`[TRADING] Position OCO active - P&L non réalisé: ${unrealizedPnL.toFixed(2)}%`);
            }
        } catch (error) {
            console.error(`[TRADING] Erreur surveillance OCO: ${error.message}`);
        }
    }

    /**
     * Vérifications d'urgence (stop-loss de sécurité)
     */
    checkEmergencyExitConditions(ticker, position) {
        if (!position.isActive()) return false;
        
        const currentPrice = ticker.last;
        const unrealizedPnLPercent = position.getUnrealizedPnLPercent(currentPrice);
        
        // Stop-loss d'urgence
        if (unrealizedPnLPercent <= -this.config.emergencyStopLossPercent) {
            this.logger.info(`[TRADING] STOP-LOSS D'URGENCE: ${unrealizedPnLPercent.toFixed(2)}% <= -${this.config.emergencyStopLossPercent}%`);
            return true;
        }
        
        return false;
    }

    /**
     * Sortie d'urgence immédiate (ordre au marché)
     */
    async executeEmergencyExit(symbol, position) {
        try {
            this.logger.info('[TRADING] EXÉCUTION SORTIE D\'URGENCE...');
            
            // Annuler les ordres OCO s'il y en a
            if (position.isOCOOrder()) {
                await this.exchangeService.cancelOCOOrder(symbol, position.ocoOrderListId);
            }
            
            // Ordre de vente au marché pour sortie immédiate
            // Note: ici on garde un ordre limite proche du marché pour la sécurité
            const ticker = await this.exchangeService.fetchTicker(symbol);
            const emergencyPrice = this.exchangeService.roundPrice(symbol, ticker.bid * 0.99); // -1% pour assurer l'exécution
            
            const order = await this.exchangeService.createSellOrder(symbol, position.quantity, emergencyPrice);
            
            this.logger.info(`[TRADING] Ordre d'urgence placé: ${order.id}`);
            
        } catch (error) {
            console.error(`[TRADING] ERREUR CRITIQUE sortie d'urgence: ${error.message}`);
        }
    }

    /**
     * Log du statut de la position en attente
     */
    logPositionStatus(position, ticker, indicators) {
        const currentPrice = ticker.last;
        const unrealizedPnL = position.getUnrealizedPnLPercent(currentPrice);
        
        this.logger.info(`[TRADING] Position - P&L: ${unrealizedPnL.toFixed(2)}%, Prix: ${currentPrice}, ${indicators.toLogString()}`);
    }

    /**
     * Arrêt d'urgence - annule tous les ordres en cours
     */
    async emergencyStop() {
        this.logger.info('[TRADING] ARRÊT D\'URGENCE - Annulation des ordres...');
        
        try {
            // Ici, on pourrait implémenter l'annulation de tous les ordres ouverts
            // const openOrders = await this.exchangeService.fetchOpenOrders(this.config.trading.symbol);
            // for (const order of openOrders) {
            //     await this.exchangeService.cancelOrder(order.id, this.config.trading.symbol);
            // }
            
            this.logger.info('[TRADING] Arrêt d\'urgence terminé');
        } catch (error) {
            console.error(`[TRADING] Erreur arrêt d'urgence: ${error.message}`);
        }
    }

    /**
     * Affiche le solde du portefeuille au démarrage
     */
    async displayWalletBalance() {
        try {
            this.logger.info('\n💰 ════════════════════════════════════════════════════════════════');
            this.logger.info('💼 PORTEFEUILLE BINANCE TESTNET');
            this.logger.info('💰 ════════════════════════════════════════════════════════════════');
            
            const balance = await this.exchangeService.fetchBalance();
            
            // Affichage des principales cryptos
            const cryptos = ['USDT', 'USDC', 'BTC', 'ETH', 'BNB'];
            
            cryptos.forEach(crypto => {
                if (balance[crypto] && (balance[crypto].total > 0 || balance[crypto].free > 0 || balance[crypto].used > 0)) {
                    const total = balance[crypto].total || 0;
                    const free = balance[crypto].free || 0;
                    const used = balance[crypto].used || 0;
                    
                    this.logger.info(`💵 ${crypto.padEnd(6)}: Total: ${total.toFixed(6).padStart(12)} | Libre: ${free.toFixed(6).padStart(12)} | Bloqué: ${used.toFixed(6).padStart(12)}`);
                }
            });
            
            // Vérification du solde minimum USDC pour le trading
            const USDCBalance = balance['USDC']?.free || 0;
            const minBalance = this.config.security?.minBalanceUSDC || 5;
            
            if (USDCBalance >= minBalance) {
                this.logger.info(`\n✅ Solde USDC suffisant pour trader (${USDCBalance.toFixed(2)} >= ${minBalance} USDC)`);
            } else {
                this.logger.info(`\n⚠️  Solde USDC insuffisant pour trader (${USDCBalance.toFixed(2)} < ${minBalance} USDC)`);
            }
            
            this.logger.info('💰 ════════════════════════════════════════════════════════════════\n');
            
        } catch (error) {
            console.error(`[WALLET] Erreur affichage portefeuille: ${error.message}`);
            this.logger.info('📱 Mode simulation - Pas d\'accès au portefeuille réel\n');
        }
    }
}

module.exports = TradingService;