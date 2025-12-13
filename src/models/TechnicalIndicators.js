/**
 * Modèle pour les indicateurs techniques
 */
class TechnicalIndicators {
    constructor(data = {}) {
        this.rsi = data.rsi || null;
        this.bbUpper = data.bbUpper || null;
        this.bbMiddle = data.bbMiddle || null;
        this.bbLower = data.bbLower || null;
        this.timestamp = data.timestamp || Date.now();
    }

    /**
     * Vérifie si les indicateurs sont valides
     */
    isValid() {
        return this.rsi !== null && 
               this.bbUpper !== null && 
               this.bbMiddle !== null && 
               this.bbLower !== null;
    }

    /**
     * Vérifie les conditions d'achat (RSI survente + prix sous BB inférieure)
     */
    isBuySignal(currentPrice, rsiOversold = 30) {
        return this.isValid() && 
               currentPrice < this.bbLower && 
               this.rsi < rsiOversold;
    }

    /**
     * Vérifie les conditions de vente (RSI surachat + prix au-dessus BB supérieure)
     */
    isSellSignal(currentPrice, rsiOverbought = 70) {
        return this.isValid() && 
               currentPrice > this.bbUpper && 
               this.rsi > rsiOverbought;
    }

    /**
     * Retourne la largeur des bandes de Bollinger
     */
    getBollingerBandWidth() {
        if (!this.isValid()) return null;
        return ((this.bbUpper - this.bbLower) / this.bbMiddle) * 100;
    }

    /**
     * Retourne la position du prix par rapport aux bandes de Bollinger (0-1)
     */
    getBollingerPosition(currentPrice) {
        if (!this.isValid()) return null;
        return (currentPrice - this.bbLower) / (this.bbUpper - this.bbLower);
    }

    /**
     * Retourne un résumé formaté des indicateurs
     */
    getSummary() {
        if (!this.isValid()) return 'Indicateurs non disponibles';
        
        return {
            rsi: parseFloat(this.rsi.toFixed(2)),
            bollingerBands: {
                upper: parseFloat(this.bbUpper.toFixed(2)),
                middle: parseFloat(this.bbMiddle.toFixed(2)),
                lower: parseFloat(this.bbLower.toFixed(2))
            },
            timestamp: new Date(this.timestamp).toISOString()
        };
    }

    /**
     * Convertit vers un format loggable
     */
    toLogString() {
        if (!this.isValid()) return 'RSI: N/A, BB: N/A';
        
        return `RSI: ${this.rsi.toFixed(2)}, BB Lower: ${this.bbLower.toFixed(2)}, BB Upper: ${this.bbUpper.toFixed(2)}`;
    }
}

module.exports = TechnicalIndicators;