const ccxt = require('ccxt');
const { getLogger } = require('../utils/Logger');

/**
 * Service de gestion de l'exchange (Binance)
 */
class ExchangeService {
    constructor(config) {
        this.config = config;
        this.exchange = null;
        this.isInitialized = false;
        this.logger = getLogger();
    }

    /**
     * Initialise la connexion à l'exchange
     */
    async initialize() {
        try {
            this.exchange = new ccxt.binance({
                apiKey: this.config.apiKey,
                secret: this.config.secret,
                sandbox: this.config.sandbox || false,
                enableRateLimit: true,
                timeout: 30000,
                options: {
                    defaultType: 'spot'
                }
            });

            // Vérification de la connectivité
            await this.verifyConnection();
            
            this.isInitialized = true;
            this.logger.info('EXCHANGE', 'Connexion Binance initialisée', { 
                sandbox: this.config.sandbox,
                rateLimit: this.exchange.rateLimit 
            });
        } catch (error) {
            this.logger.error('EXCHANGE', 'Erreur d\'initialisation', { error: error.message });
            throw error;
        }
    }

    /**
     * Vérifie la connexion et les permissions
     */
    async verifyConnection() {
        try {
            // Charge les marchés disponibles
            await this.exchange.loadMarkets();
            
            // Vérifie que le symbole existe
            if (!this.exchange.markets[this.config.symbol]) {
                throw new Error(`Symbole ${this.config.symbol} non trouvé sur l'exchange`);
            }
            
            // Test des permissions en récupérant le solde
            await this.exchange.fetchBalance();
            
            this.logger.info(`[EXCHANGE] Connectivité vérifiée pour ${this.config.symbol}`);
        } catch (error) {
            throw new Error(`Vérification exchange échouée: ${error.message}`);
        }
    }

    /**
     * Récupère les données OHLCV pour un symbole
     */
    async fetchOHLCV(symbol, timeframe, limit = 100) {
        this.ensureInitialized();
        
        try {
            const ohlcv = await this.exchange.fetchOHLCV(symbol, timeframe, undefined, limit);
            
            if (ohlcv.length === 0) {
                throw new Error('Aucune donnée OHLCV reçue');
            }
            
            return ohlcv;
        } catch (error) {
            console.error(`[EXCHANGE] Erreur fetchOHLCV: ${error.message}`);
            throw error;
        }
    }

    /**
     * Récupère le ticker pour un symbole
     */
    async fetchTicker(symbol) {
        this.ensureInitialized();
        
        try {
            const ticker = await this.exchange.fetchTicker(symbol);
            return {
                symbol: ticker.symbol,
                last: ticker.last,
                bid: ticker.bid,
                ask: ticker.ask,
                high: ticker.high,
                low: ticker.low,
                volume: ticker.baseVolume,
                timestamp: ticker.timestamp
            };
        } catch (error) {
            console.error(`[EXCHANGE] Erreur fetchTicker: ${error.message}`);
            throw error;
        }
    }

    /**
     * Place un ordre d'achat limite
     */
    async createBuyOrder(symbol, quantity, price) {
        this.ensureInitialized();
        
        try {
            const order = await this.exchange.createLimitBuyOrder(symbol, quantity, price);
            
            this.logger.info(`[EXCHANGE] Ordre d'achat placé: ${order.id} - ${quantity} ${symbol} à ${price}`);
            
            return {
                id: order.id,
                symbol: order.symbol,
                side: 'buy',
                type: 'limit',
                amount: order.amount,
                price: order.price,
                status: order.status,
                timestamp: order.timestamp
            };
        } catch (error) {
            console.error(`[EXCHANGE] Erreur ordre d'achat: ${error.message}`);
            throw error;
        }
    }

    /**
     * Place un ordre de vente limite
     */
    async createSellOrder(symbol, quantity, price) {
        this.ensureInitialized();
        
        try {
            const order = await this.exchange.createLimitSellOrder(symbol, quantity, price);
            
            this.logger.info(`[EXCHANGE] Ordre de vente placé: ${order.id} - ${quantity} ${symbol} à ${price}`);
            
            return {
                id: order.id,
                symbol: order.symbol,
                side: 'sell',
                type: 'limit',
                amount: order.amount,
                price: order.price,
                status: order.status,
                timestamp: order.timestamp
            };
        } catch (error) {
            console.error(`[EXCHANGE] Erreur ordre de vente: ${error.message}`);
            throw error;
        }
    }

    /**
     * Récupère le statut d'un ordre
     */
    async fetchOrder(orderId, symbol) {
        this.ensureInitialized();
        
        try {
            const order = await this.exchange.fetchOrder(orderId, symbol);
            
            return {
                id: order.id,
                symbol: order.symbol,
                side: order.side,
                type: order.type,
                amount: order.amount,
                filled: order.filled,
                remaining: order.remaining,
                price: order.price,
                average: order.average,
                status: order.status,
                timestamp: order.timestamp,
                fee: order.fee
            };
        } catch (error) {
            console.error(`[EXCHANGE] Erreur récupération ordre: ${error.message}`);
            throw error;
        }
    }

    /**
     * Crée un ordre OCO (One-Cancels-Other)
     * Combine un take-profit et un stop-loss
     */
    async createOCOOrder(symbol, quantity, side, price, stopPrice, stopLimitPrice) {
        this.ensureInitialized();
        
        try {
            // Binance OCO order parameters
            const ocoParams = {
                symbol: symbol.replace('/', ''),
                side: side.toUpperCase(),
                quantity: quantity,
                price: price,                    // Take profit price
                stopPrice: stopPrice,            // Stop loss trigger price  
                stopLimitPrice: stopLimitPrice,  // Stop loss limit price
                stopLimitTimeInForce: 'GTC',     // Good Till Cancelled
                timeInForce: 'GTC'
            };
            
            const order = await this.exchange.privatePostOrderOco(ocoParams);
            
            this.logger.info(`[EXCHANGE] Ordre OCO placé: ${order.orderListId} - ${side} ${quantity} ${symbol}`);
            this.logger.info(`[EXCHANGE] Take Profit: ${price}, Stop Loss: ${stopPrice}/${stopLimitPrice}`);
            
            return {
                orderListId: order.orderListId,
                contingencyType: order.contingencyType,
                listStatusType: order.listStatusType,
                orders: order.orders.map(o => ({
                    id: o.orderId,
                    symbol: o.symbol,
                    side: o.side,
                    type: o.type,
                    price: o.price,
                    stopPrice: o.stopPrice
                })),
                timestamp: Date.now()
            };
        } catch (error) {
            console.error(`[EXCHANGE] Erreur ordre OCO: ${error.message}`);
            throw error;
        }
    }

    /**
     * Crée un ordre OCO de vente avec take-profit et stop-loss
     */
    async createSellOCOOrder(symbol, quantity, takeProfitPrice, stopLossPrice) {
        // Pour un OCO de vente :
        // - Take profit : ordre limit au-dessus du prix actuel
        // - Stop loss : ordre stop en dessous du prix actuel
        const stopLimitPrice = stopLossPrice * 0.995; // 0.5% en dessous du trigger
        
        return await this.createOCOOrder(
            symbol, 
            quantity, 
            'sell', 
            takeProfitPrice,     // Take profit (limite haute)
            stopLossPrice,       // Stop loss trigger (limite basse)
            stopLimitPrice       // Stop loss execution price
        );
    }

    /**
     * Annule un ordre OCO complet
     */
    async cancelOCOOrder(symbol, orderListId) {
        this.ensureInitialized();
        
        try {
            const result = await this.exchange.privateDeleteOrderList({
                symbol: symbol.replace('/', ''),
                orderListId: orderListId
            });
            
            this.logger.info(`[EXCHANGE] Ordre OCO annulé: ${orderListId}`);
            return result;
        } catch (error) {
            console.error(`[EXCHANGE] Erreur annulation OCO: ${error.message}`);
            throw error;
        }
    }

    /**
     * Récupère le statut d'un ordre OCO
     */
    async fetchOCOOrder(orderListId) {
        this.ensureInitialized();
        
        try {
            const result = await this.exchange.privateGetOrderList({
                orderListId: orderListId
            });
            
            return {
                orderListId: result.orderListId,
                contingencyType: result.contingencyType,
                listStatusType: result.listStatusType,
                listOrderStatus: result.listOrderStatus,
                orders: result.orders.map(o => ({
                    id: o.orderId,
                    symbol: o.symbol,
                    side: o.side,
                    type: o.type,
                    status: o.status,
                    price: o.price,
                    stopPrice: o.stopPrice,
                    filled: o.executedQty
                }))
            };
        } catch (error) {
            console.error(`[EXCHANGE] Erreur récupération OCO: ${error.message}`);
            throw error;
        }
    }

    /**
     * Annule un ordre
     */
    async cancelOrder(orderId, symbol) {
        this.ensureInitialized();
        
        try {
            const result = await this.exchange.cancelOrder(orderId, symbol);
            this.logger.info(`[EXCHANGE] Ordre annulé: ${orderId}`);
            return result;
        } catch (error) {
            console.error(`[EXCHANGE] Erreur annulation ordre: ${error.message}`);
            throw error;
        }
    }

    /**
     * Attend qu'un ordre soit exécuté avec timeout
     */
    async waitForOrderFill(orderId, symbol, timeoutMs = 30000) {
        const startTime = Date.now();
        
        while (Date.now() - startTime < timeoutMs) {
            try {
                const order = await this.fetchOrder(orderId, symbol);
                
                if (order.status === 'closed') {
                    this.logger.info(`[EXCHANGE] Ordre ${orderId} exécuté: ${order.filled} à ${order.average}`);
                    return order;
                } else if (order.status === 'canceled' || order.status === 'rejected') {
                    this.logger.info(`[EXCHANGE] Ordre ${orderId} ${order.status}`);
                    return null;
                }
                
                // Attendre 1 seconde avant de vérifier à nouveau
                await new Promise(resolve => setTimeout(resolve, 1000));
                
            } catch (error) {
                console.error(`[EXCHANGE] Erreur vérification ordre: ${error.message}`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }
        }
        
        this.logger.info(`[EXCHANGE] Timeout atteint pour l'ordre ${orderId}`);
        return null;
    }

    /**
     * Récupère le solde du compte
     */
    async fetchBalance() {
        this.ensureInitialized();
        
        try {
            const balance = await this.exchange.fetchBalance();
            return balance;
        } catch (error) {
            console.error(`[EXCHANGE] Erreur récupération solde: ${error.message}`);
            throw error;
        }
    }

    /**
     * Vérifie si suffisamment de fonds sont disponibles
     */
    async hasSufficientBalance(symbol, side, quantity, price) {
        try {
            const balance = await this.fetchBalance();
            const [base, quote] = symbol.split('/');
            
            if (side === 'buy') {
                const requiredQuote = quantity * price;
                const availableQuote = balance[quote]?.free || 0;
                
                this.logger.info(`[DEBUG] Solde ${quote}: ${availableQuote}, Requis: ${requiredQuote} (${quantity} x ${price})`);
                this.logger.info(`[DEBUG] Suffisant: ${availableQuote >= requiredQuote}`);
                
                return availableQuote >= requiredQuote;
            } else {
                const availableBase = balance[base]?.free || 0;
                this.logger.info(`[DEBUG] Solde ${base}: ${availableBase}, Requis: ${quantity}`);
                return availableBase >= quantity;
            }
        } catch (error) {
            console.error(`[EXCHANGE] Erreur vérification solde: ${error.message}`);
            return false;
        }
    }

    /**
     * Récupère les limites de trading pour un symbole
     */
    getSymbolLimits(symbol) {
        this.ensureInitialized();
        
        const market = this.exchange.markets[symbol];
        if (!market) {
            throw new Error(`Symbole ${symbol} non trouvé`);
        }
        
        return {
            amount: {
                min: market.limits.amount.min,
                max: market.limits.amount.max
            },
            price: {
                min: market.limits.price.min,
                max: market.limits.price.max
            },
            cost: {
                min: market.limits.cost.min,
                max: market.limits.cost.max
            },
            precision: {
                amount: market.precision.amount,
                price: market.precision.price
            }
        };
    }

    /**
     * Arrondit le prix selon la précision du marché
     */
    roundPrice(symbol, price) {
        this.ensureInitialized();
        const precise = this.exchange.priceToPrecision(symbol, price);
        return parseFloat(precise);
    }

    /**
     * Arrondit la quantité selon la précision du marché
     */
    roundAmount(symbol, amount) {
        this.ensureInitialized();
        const precise = this.exchange.amountToPrecision(symbol, amount);
        const rounded = parseFloat(precise);
        
        this.logger.info(`[DEBUG] roundAmount: ${symbol}, amount=${amount}, precise=${precise}, rounded=${rounded}`);
        
        return rounded;
    }

    /**
     * Vérifie si le service est initialisé
     */
    ensureInitialized() {
        if (!this.isInitialized || !this.exchange) {
            throw new Error('Service Exchange non initialisé');
        }
    }

    /**
     * Récupère les informations du serveur
     */
    async getServerTime() {
        this.ensureInitialized();
        
        try {
            return await this.exchange.fetchTime();
        } catch (error) {
            console.error(`[EXCHANGE] Erreur récupération temps serveur: ${error.message}`);
            throw error;
        }
    }
}

module.exports = ExchangeService;