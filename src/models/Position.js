/**
 * Modèle pour une position de trading
 */
class Position {
    constructor(data = {}) {
        this.symbol = data.symbol || null;
        this.buyPrice = data.buy_price || null;
        this.quantity = data.quantity || null;
        this.buyOrderId = data.buy_order_id || null;
        this.ocoOrderListId = data.oco_order_list_id || null;
        this.orderType = data.order_type || 'LIMIT'; // LIMIT ou OCO
        this.takeProfitPrice = data.take_profit_price || null;
        this.stopLossPrice = data.stop_loss_price || null;
        this.highestPrice = data.highest_price || data.buy_price || null;
        this.createdAt = data.created_at || null;
        this.updatedAt = data.updated_at || null;
    }

    /**
     * Vérifie si la position est active
     */
    isActive() {
        return this.symbol && this.buyPrice && this.quantity;
    }

    /**
     * Calcule la valeur actuelle de la position
     */
    getCurrentValue(currentPrice) {
        if (!this.isActive()) return 0;
        return this.quantity * currentPrice;
    }

    /**
     * Calcule le profit/perte non réalisé
     */
    getUnrealizedPnL(currentPrice) {
        if (!this.isActive()) return 0;
        return (currentPrice - this.buyPrice) * this.quantity;
    }

    /**
     * Calcule le pourcentage de profit/perte
     */
    getUnrealizedPnLPercent(currentPrice) {
        if (!this.isActive()) return 0;
        return ((currentPrice - this.buyPrice) / this.buyPrice) * 100;
    }

    /**
     * Met à jour la position avec de nouvelles données
     */
    update(data) {
        this.symbol = data.symbol;
        this.buyPrice = data.buyPrice;
        this.quantity = data.quantity;
        this.buyOrderId = data.buyOrderId;
        this.ocoOrderListId = data.ocoOrderListId || null;
        this.orderType = data.orderType || 'LIMIT';
        this.takeProfitPrice = data.takeProfitPrice || null;
        this.stopLossPrice = data.stopLossPrice || null;
        // AJOUT: Mise à jour de highestPrice
        if (data.highestPrice) {
            this.highestPrice = data.highestPrice;
        }        
        this.createdAt = data.createdAt || Date.now();
        this.updatedAt = Date.now();
    }

    /**
     * Vérifie si la position utilise un ordre OCO
     */
    isOCOOrder() {
        return this.orderType === 'OCO' && this.ocoOrderListId !== null;
    }

    /**
     * Calcule le profit potentiel si le take-profit se déclenche
     */
    getPotentialTakeProfit() {
        if (!this.isActive() || !this.takeProfitPrice) return 0;
        return (this.takeProfitPrice - this.buyPrice) * this.quantity;
    }

    /**
     * Calcule la perte potentielle si le stop-loss se déclenche
     */
    getPotentialStopLoss() {
        if (!this.isActive() || !this.stopLossPrice) return 0;
        return (this.stopLossPrice - this.buyPrice) * this.quantity;
    }

    /**
     * Retourne un résumé de la position OCO
     */
    getOCOSummary() {
        if (!this.isOCOOrder()) return null;
        
        return {
            orderListId: this.ocoOrderListId,
            takeProfitPrice: this.takeProfitPrice,
            stopLossPrice: this.stopLossPrice,
            potentialProfit: this.getPotentialTakeProfit(),
            potentialLoss: this.getPotentialStopLoss(),
            profitPercent: this.takeProfitPrice ? ((this.takeProfitPrice - this.buyPrice) / this.buyPrice * 100).toFixed(2) : null,
            lossPercent: this.stopLossPrice ? ((this.stopLossPrice - this.buyPrice) / this.buyPrice * 100).toFixed(2) : null
        };
    }

    /**
     * Efface la position
     */
    clear() {
        this.symbol = null;
        this.buyPrice = null;
        this.quantity = null;
        this.buyOrderId = null;
        this.updatedAt = Date.now();
    }

    /**
     * Convertit vers un format de base de données
     */
    toDatabaseFormat() {
        return {
            symbol: this.symbol,
            buy_price: this.buyPrice,
            quantity: this.quantity,
            buy_order_id: this.buyOrderId,
            oco_order_list_id: this.ocoOrderListId,
            order_type: this.orderType,
            take_profit_price: this.takeProfitPrice,
            stop_loss_price: this.stopLossPrice,
            highest_price: this.highestPrice,
            created_at: this.createdAt,
            updated_at: this.updatedAt
        };
    }
}

module.exports = Position;