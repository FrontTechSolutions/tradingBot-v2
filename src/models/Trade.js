/**
 * Modèle pour un trade dans l'historique
 */
class Trade {
    constructor(data = {}) {
        this.id = data.id || null;
        this.symbol = data.symbol;
        this.side = data.side; // 'BUY' ou 'SELL'
        this.price = data.price;
        this.quantity = data.quantity;
        this.orderId = data.order_id || data.orderId;
        this.timestamp = data.timestamp || Date.now();
    }

    /**
     * Vérifie si c'est un trade d'achat
     */
    isBuy() {
        return this.side === 'BUY';
    }

    /**
     * Vérifie si c'est un trade de vente
     */
    isSell() {
        return this.side === 'SELL';
    }

    /**
     * Calcule la valeur totale du trade
     */
    getTotalValue() {
        return this.price * this.quantity;
    }

    /**
     * Formate la date du trade
     */
    getFormattedDate() {
        return new Date(this.timestamp).toISOString();
    }

    /**
     * Convertit vers un format de base de données
     */
    toDatabaseFormat() {
        return {
            symbol: this.symbol,
            side: this.side,
            price: this.price,
            quantity: this.quantity,
            order_id: this.orderId,
            timestamp: this.timestamp
        };
    }

    /**
     * Crée un trade d'achat
     */
    static createBuyTrade(symbol, price, quantity, orderId) {
        return new Trade({
            symbol,
            side: 'BUY',
            price,
            quantity,
            orderId,
            timestamp: Date.now()
        });
    }

    /**
     * Crée un trade de vente
     */
    static createSellTrade(symbol, price, quantity, orderId) {
        return new Trade({
            symbol,
            side: 'SELL',
            price,
            quantity,
            orderId,
            timestamp: Date.now()
        });
    }

    /**
     * Crée un trade OCO (avec orderListId)
     */
    static createOCOTrade(symbol, side, price, quantity, orderListId, triggeredOrderId) {
        return new Trade({
            symbol,
            side: side.toUpperCase(),
            price,
            quantity,
            orderId: `${orderListId}:${triggeredOrderId}`, // Format spécial pour OCO
            timestamp: Date.now()
        });
    }
}

module.exports = Trade;