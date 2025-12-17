const TradingService = require('./TradingService');
const { getLogger } = require('../utils/Logger');

/**
 * Service de gestion du trading multi-paires
 * Orchestre plusieurs instances de TradingService pour différentes paires
 */
class MultiTradingService {
        /**
         * Vérifie l'exécution des ordres stop-loss natifs sur toutes les paires
         * et met à jour la position si le stop-loss a été exécuté
         */
        async checkAllStopLossOrders() {
            for (const [symbol, tradingService] of this.tradingServices) {
                try {
                    const position = tradingService.databaseService.getPosition();
                    if (position && position.isActive() && position.stopLossOrderId) {
                        const stopOrder = await tradingService.exchangeService.fetchOrderStatus(
                            position.stopLossOrderId,
                            symbol
                        );
                        if (stopOrder && (stopOrder.status === 'closed' || stopOrder.status === 'filled')) {
                            this.logger.info(`[MULTI-TRADING] Stop-loss exécuté pour ${symbol} (orderId: ${position.stopLossOrderId})`);
                            // Met à jour la position comme vendue
                            position.close && position.close();
                            tradingService.databaseService.savePosition(position);
                            // Crée le trade de sortie
                            const Trade = require('../models/Trade');
                            const trade = Trade.createSellTrade(
                                symbol,
                                stopOrder.price || stopOrder.average || 0,
                                position.quantity,
                                position.stopLossOrderId
                            );
                            tradingService.databaseService.executeSellTransaction(trade);
                        }
                    }
                } catch (err) {
                    this.logger.info(`[MULTI-TRADING] Erreur vérification stop-loss natif pour ${symbol}: ${err.message}`);
                }
            }
        }
    constructor(config) {
        this.config = config;
        this.logger = getLogger();
        this.isRunning = false;
        this.tradingServices = new Map();
        this.tickInterval = null;
        this.isProcessing = false;
    }

    /**
     * Initialise tous les services de trading pour chaque paire
     */
    async initialize() {
        this.logger.info('MULTI-TRADING', 'Initialisation du trading multi-paires...');
        
        const symbols = this.config.trading.symbols || [this.config.trading.symbol];
        
        this.logger.info(`\n🔄 ════════════════════════════════════════════════════════════════`);
        this.logger.info(`📊 INITIALISATION MULTI-PAIRES`);
        this.logger.info(`🔄 ════════════════════════════════════════════════════════════════`);
        this.logger.info(`💱 Paires à analyser : ${symbols.join(', ')}`);
        this.logger.info(`⏰ Timeframe : ${this.config.trading.timeframe}`);
        this.logger.info(`💰 Montant par trade : ${this.config.trading.amount} USDC`);
        this.logger.info(`🔄 ════════════════════════════════════════════════════════════════\n`);
        
        // Affichage du portefeuille une seule fois pour toutes les paires
        if (symbols.length > 0) {
            const firstPairConfig = {
                ...this.config,
                trading: { ...this.config.trading, symbol: symbols[0] }
            };
            const tempTradingService = new TradingService(firstPairConfig);
            await tempTradingService.initialize(true); // Afficher le portefeuille
        }

        // Créer un service de trading pour chaque paire
        for (const symbol of symbols) {
            try {

                
                // Configuration spécifique à cette paire
                const pairConfig = {
                    ...this.config,
                    trading: {
                        ...this.config.trading,
                        symbol: symbol
                    }
                };

                // Créer le service de trading pour cette paire (sans affichage portefeuille)
                const tradingService = new TradingService(pairConfig);
                await tradingService.initialize(false);
                
                this.tradingServices.set(symbol, tradingService);
                this.logger.info(`✅ ${symbol} initialisé avec succès`);
                
            } catch (error) {
                console.error(`❌ Erreur initialisation ${symbol}: ${error.message}`);
                // Continue avec les autres paires même si une échoue
            }
        }

        this.logger.info(`\n🚀 ${this.tradingServices.size} paire(s) prête(s) pour le trading\n`);
        this.logger.info('MULTI-TRADING', `${this.tradingServices.size} paires initialisées`);
    }

    /**
     * Démarre le trading sur toutes les paires
     */
    async start() {
        if (this.isRunning) return;
        
        this.isRunning = true;
        this.logger.info(`\n🎯 Démarrage du trading multi-paires...`);
        
        // Premier cycle d'analyse
        await this.processAllPairs();
        
        // Cycles récurrents
        this.tickInterval = setInterval(async () => {
            if (this.isRunning) {
                await this.processAllPairs();
            }
        }, this.config.bot.tickInterval);
        
        this.logger.info(`✅ Trading multi-paires démarré (intervalle: ${this.config.bot.tickInterval}ms)`);
    }

    /**
     * Affiche un récapitulatif des positions actives
     */
    logActivePositionsSummary(signals = []) {
        const activePositions = [];
        
        for (const [symbol, tradingService] of this.tradingServices) {
            try {
                const position = tradingService.databaseService.getPosition();
                if (position && position.isActive()) {
                    // Récupérer le prix actuel depuis les signaux
                    const signalData = signals.find(s => s.symbol === symbol);
                    const currentPrice = signalData ? signalData.price : null;
                    
                    // Calcul du PnL si possible
                    let pnlStr = '';
                    if (currentPrice) {
                        const pnl = position.getUnrealizedPnLPercent(currentPrice);
                        const pnlSign = pnl >= 0 ? '+' : '';
                        pnlStr = ` (${pnlSign}${pnl.toFixed(2)}%)`;
                    }

                    activePositions.push({
                        symbol: symbol,
                        buyPrice: position.buyPrice,
                        currentPrice: currentPrice,
                        quantity: position.quantity,
                        type: position.isOCOOrder() ? 'OCO' : 'INDICATORS',
                        date: new Date(position.createdAt).toLocaleTimeString(),
                        pnlStr: pnlStr
                    });
                }
            } catch (error) {
                // Ignore errors
            }
        }

        if (activePositions.length > 0) {
            this.logger.info(`\n📋 RÉCAPITULATIF DES POSITIONS (${activePositions.length})`);
            this.logger.info(`────────────────────────────────────────────────────────────────────────`);
            activePositions.forEach(pos => {
                const priceDisplay = pos.currentPrice ? pos.currentPrice : 'N/A';
                this.logger.info(`   🔹 ${pos.symbol.padEnd(8)} | Achat: ${pos.buyPrice} | Actuel: ${priceDisplay}${pos.pnlStr} | Qté: ${pos.quantity} | ${pos.date}`);
            });
            this.logger.info(`────────────────────────────────────────────────────────────────────────\n`);
        } else {
            this.logger.info(`\n📋 Aucune position active en cours\n`);
        }
    }

    /**
     * Analyse toutes les paires avec gestion des trades simultanés
     */
    async processAllPairs() {
        // Log d'appel pour debug (détecter les appels multiples)
        if (this.isProcessing) {
            this.logger.info('[MULTI-TRADING] Analyse en cours, ignore ce cycle...');
            return;
        }

        this.isProcessing = true;

        try {
            // Vérification des stop-loss natifs sur toutes les paires
            await this.checkAllStopLossOrders();

            const timestamp = new Date().toLocaleTimeString();
            this.logger.info(`\n⏰ [${timestamp}] ═══ ANALYSE MULTI-PAIRES ═══`);

            // 1. Compter les positions actives
            const activeTrades = this.countActiveTrades();
            const maxTrades = this.config.trading.maxConcurrentTrades || 1;
            const availableSlots = maxTrades - activeTrades;

            this.logger.info(`📊 Positions: ${activeTrades}/${maxTrades} | Slots disponibles: ${availableSlots}`);

            // 2. Analyser toutes les paires pour détecter les signaux
            const signals = await this.analyzeAllPairs();

            // 3. Filtrer et prioriser les signaux
            const buySignals = signals.filter(s => s.signal === 'BUY' && s.canTrade);

            // Identifier les positions actives (pour vérifier SL/TP/Trailing même sans signal de vente)
            const activePositionSignals = signals.filter(s => {
                const position = s.tradingService.databaseService.getPosition();
                return position && position.isActive();
            });

            this.logger.info(`🔍 Signaux détectés: ${buySignals.length} ACHAT`);
            this.logger.info(`🔍 Positions actives à vérifier: ${activePositionSignals.length}`);

            // Récapitulatif des positions
            this.logActivePositionsSummary(signals);

            // 4. Gérer les positions existantes (Stop Loss, Trailing Stop, Vente technique)
            for (const signal of activePositionSignals) {
                // On force le traitement pour vérifier les conditions de sortie (SL/TP)
                await this.processSinglePair(signal.symbol, signal.tradingService);
            }

            // 5. Traiter les achats selon les slots disponibles
            if (availableSlots > 0 && buySignals.length > 0) {
                // Trier par force du signal (RSI le plus bas = meilleure opportunité)
                buySignals.sort((a, b) => a.rsi - b.rsi);

                const signalsToProcess = buySignals.slice(0, availableSlots);
                this.logger.info(`🎯 Traitement de ${signalsToProcess.length} signaux d'achat prioritaires`);

                for (const signal of signalsToProcess) {
                    await this.processSinglePair(signal.symbol, signal.tradingService);
                }
            }

            this.logger.info(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);

        } catch (error) {
            console.error(`[MULTI-TRADING] Erreur analyse globale: ${error.message}`);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Compte le nombre de trades actifs sur toutes les paires
     */
    countActiveTrades() {
        let activeTrades = 0;
        for (const [symbol, tradingService] of this.tradingServices) {
            try {
                const position = tradingService.databaseService.getPosition();
                if (position && position.isActive()) {
                    activeTrades++;
                }
            } catch (error) {
                // Ignore les erreurs de lecture de position
            }
        }
        return activeTrades;
    }

    /**
     * Analyse toutes les paires pour détecter les signaux
     */
    async analyzeAllPairs() {
        const signals = [];
        
        for (const [symbol, tradingService] of this.tradingServices) {
            try {
                // Récupérer les données de marché
                const marketData = await tradingService.getMarketData();
                const indicators = tradingService.indicatorService.calculateIndicators(marketData.ohlcv);
                const signalAnalysis = tradingService.indicatorService.analyzeSignals(indicators, marketData.ticker.last, symbol);
                
                // Vérifier si cette paire peut trader (pas de position active)
                const position = tradingService.databaseService.getPosition();
                const botStatus = tradingService.databaseService.getBotStatus();
                const canTrade = botStatus.isIdle() && (!position.isActive());
                
                signals.push({
                    symbol: symbol,
                    tradingService: tradingService,
                    signal: signalAnalysis.buySignal ? 'BUY' : (signalAnalysis.sellSignal ? 'SELL' : 'HOLD'),
                    rsi: indicators.rsi,
                    price: marketData.ticker.last,
                    canTrade: canTrade,
                    reason: signalAnalysis.reason
                });
                
            } catch (error) {
                console.error(`[${symbol}] Erreur analyse: ${error.message}`);
            }
        }
        
        return signals;
    }

    /**
     * Analyse une paire spécifique
     */
    async processSinglePair(symbol, tradingService) {
        try {
            await tradingService.processMarketTick();
        } catch (error) {
            console.error(`[${symbol}] Erreur: ${error.message}`);
        }
    }

    /**
     * Arrête le trading sur toutes les paires
     */
    async stop() {
        if (!this.isRunning) return;
        
        this.logger.info('\n🛑 Arrêt du trading multi-paires...');
        this.isRunning = false;
        
        if (this.tickInterval) {
            clearInterval(this.tickInterval);
            this.tickInterval = null;
        }
        
        // Arrêter tous les services de trading
        const stopPromises = [];
        for (const [symbol, tradingService] of this.tradingServices) {
            this.logger.info(`⏹️  Arrêt de ${symbol}...`);
            stopPromises.push(tradingService.stop());
        }
        
        await Promise.all(stopPromises);
        this.logger.info('✅ Trading multi-paires arrêté');
        
        this.logger.info('MULTI-TRADING', 'Service arrêté');
    }

    /**
     * Récupère les statistiques globales
     */
    getTradingStats() {
        const globalStats = {
            totalTrades: 0,
            totalPnL: 0,
            activePositions: 0,
            pairs: {}
        };

        for (const [symbol, tradingService] of this.tradingServices) {
            try {
                const stats = tradingService.getTradingStats();
                globalStats.pairs[symbol] = stats;
                globalStats.totalTrades += stats.totalTrades || 0;
                globalStats.totalPnL += stats.totalPnL || 0;
                if (stats.currentPosition) {
                    globalStats.activePositions++;
                }
            } catch (error) {
                // Ignore errors
            }
        }
        
        return globalStats;
    }


    /**
     * Récupère le service de trading pour une paire spécifique
     */
    getTradingService(symbol) {
        return this.tradingServices.get(symbol);
    }

    /**
     * Récupère toutes les paires actives
     */
    getActiveSymbols() {
        return Array.from(this.tradingServices.keys());
    }

    /**
     * Vérifie si le service est en cours d'exécution
     */
    isActive() {
        return this.isRunning;
    }
}

module.exports = MultiTradingService;