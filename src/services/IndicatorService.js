const { RSI, BollingerBands } = require('technicalindicators');
const { getLogger } = require('../utils/Logger');
const TechnicalIndicators = require('../models/TechnicalIndicators');

/**
 * Service de calcul des indicateurs techniques
 */
class IndicatorService {
    constructor(config) {
        this.config = {
            rsiPeriod: config.rsiPeriod || 14,
            bbPeriod: config.bbPeriod || 20,
            bbStdDev: config.bbStdDev || 2,
            rsiOversold: config.rsiOversold || 30,
            rsiOverbought: config.rsiOverbought || 70
        };
        this.logger = getLogger();
    }

    /**
     * Calcule tous les indicateurs techniques à partir des données OHLCV
     */
    calculateIndicators(ohlcvData) {
        try {
            if (!ohlcvData || ohlcvData.length === 0) {
                throw new Error('Données OHLCV manquantes');
            }

            const minDataLength = Math.max(this.config.rsiPeriod, this.config.bbPeriod);
            if (ohlcvData.length < minDataLength) {
                throw new Error(`Données insuffisantes: ${ohlcvData.length} < ${minDataLength} requises`);
            }

            // Extraction des prix de clôture
            const closes = this.extractCloses(ohlcvData);
            
            // Calcul du RSI
            const rsi = this.calculateRSI(closes);
            
            // Calcul des Bandes de Bollinger
            const bollinger = this.calculateBollingerBands(closes);
            
            if (rsi === null || !bollinger) {
                throw new Error('Erreur dans le calcul des indicateurs');
            }

            return new TechnicalIndicators({
                rsi: rsi,
                bbUpper: bollinger.upper,
                bbMiddle: bollinger.middle,
                bbLower: bollinger.lower,
                timestamp: Date.now()
            });

        } catch (error) {
            this.logger.error('INDICATORS', 'Erreur calcul indicateurs', { error: error.message });
            throw error;
        }
    }

    /**
     * Extrait les prix de clôture des données OHLCV
     */
    extractCloses(ohlcvData) {
        return ohlcvData.map(candle => {
            if (!Array.isArray(candle) || candle.length < 5) {
                throw new Error('Format OHLCV invalide');
            }
            return parseFloat(candle[4]); // Prix de clôture
        });
    }

    /**
     * Calcule le RSI (Relative Strength Index)
     */
    calculateRSI(closes) {
        try {
            const rsiValues = RSI.calculate({
                values: closes,
                period: this.config.rsiPeriod
            });

            if (!rsiValues || rsiValues.length === 0) {
                return null;
            }

            // Retourne la dernière valeur RSI
            return rsiValues[rsiValues.length - 1];
        } catch (error) {
            console.error(`[INDICATORS] Erreur calcul RSI: ${error.message}`);
            return null;
        }
    }

    /**
     * Calcule les Bandes de Bollinger
     */
    calculateBollingerBands(closes) {
        try {
            const bbValues = BollingerBands.calculate({
                values: closes,
                period: this.config.bbPeriod,
                stdDev: this.config.bbStdDev
            });

            if (!bbValues || bbValues.length === 0) {
                return null;
            }

            // Retourne la dernière valeur des bandes
            const lastBand = bbValues[bbValues.length - 1];
            return {
                upper: lastBand.upper,
                middle: lastBand.middle,
                lower: lastBand.lower
            };
        } catch (error) {
            console.error(`[INDICATORS] Erreur calcul Bollinger: ${error.message}`);
            return null;
        }
    }

    /**
     * Analyse les signaux de trading
     */
    analyzeSignals(indicators, currentPrice, symbol) {
        if (!indicators || !indicators.isValid()) {
            return {
                buySignal: false,
                sellSignal: false,
                reason: 'Indicateurs invalides'
            };
        }

        const buySignal = indicators.isBuySignal(currentPrice, this.config.rsiOversold);
        const sellSignal = indicators.isSellSignal(currentPrice, this.config.rsiOverbought);
        
        // Logs détaillés plus lisibles
        const priceBelowBB = currentPrice < indicators.bbLower;
        const rsiOversold = indicators.rsi < this.config.rsiOversold;
        
        const priceAboveBB = currentPrice > indicators.bbUpper;
        const rsiOverbought = indicators.rsi > this.config.rsiOverbought;

        console.log(`[SIGNAL] 📊 Analyse ==> ${symbol}: Prix=${currentPrice.toFixed(2)} | RSI=${indicators.rsi.toFixed(2)} | BB=[${indicators.bbLower.toFixed(2)} - ${indicators.bbUpper.toFixed(2)}]`);
        console.log(`[SIGNAL] 🟢 Achat : ${priceBelowBB ? '✅' : '❌'} Prix sous BB Bas | ${rsiOversold ? '✅' : '❌'} RSI < ${this.config.rsiOversold}`);
        console.log(`[SIGNAL] 🔴 Vente : ${priceAboveBB ? '✅' : '❌'} Prix sur BB Haut | ${rsiOverbought ? '✅' : '❌'} RSI > ${this.config.rsiOverbought}`);

        let reason = '';
        if (buySignal) {
            reason = `Signal d'achat: Prix (${currentPrice.toFixed(2)}) < BB Inf (${indicators.bbLower.toFixed(2)}) ET RSI (${indicators.rsi.toFixed(2)}) < ${this.config.rsiOversold}`;
        } else if (sellSignal) {
            reason = `Signal de vente: Prix (${currentPrice.toFixed(2)}) > BB Sup (${indicators.bbUpper.toFixed(2)}) ET RSI (${indicators.rsi.toFixed(2)}) > ${this.config.rsiOverbought}`;
        } else {
            reason = 'Aucun signal détecté';
        }

        return {
            buySignal,
            sellSignal,
            reason,
            indicators: indicators.getSummary()
        };
    }

    /**
     * Calcule des statistiques avancées sur les indicateurs
     */
    calculateAdvancedStats(ohlcvData) {
        try {
            const closes = this.extractCloses(ohlcvData);
            
            // Volatilité (écart-type des prix sur la période)
            const volatility = this.calculateVolatility(closes);
            
            // Momentum (variation de prix sur N périodes)
            const momentum = this.calculateMomentum(closes, 10);
            
            // Support et résistance approximatifs
            const supportResistance = this.calculateSupportResistance(ohlcvData);
            
            return {
                volatility: volatility,
                momentum: momentum,
                support: supportResistance.support,
                resistance: supportResistance.resistance,
                averageVolume: this.calculateAverageVolume(ohlcvData)
            };
        } catch (error) {
            console.error(`[INDICATORS] Erreur calcul stats avancées: ${error.message}`);
            return null;
        }
    }

    /**
     * Calcule la volatilité (écart-type)
     */
    calculateVolatility(closes, period = 20) {
        if (closes.length < period) return 0;
        
        const recentCloses = closes.slice(-period);
        const mean = recentCloses.reduce((sum, price) => sum + price, 0) / period;
        const variance = recentCloses.reduce((sum, price) => sum + Math.pow(price - mean, 2), 0) / period;
        
        return Math.sqrt(variance);
    }

    /**
     * Calcule le momentum
     */
    calculateMomentum(closes, period = 10) {
        if (closes.length < period + 1) return 0;
        
        const currentPrice = closes[closes.length - 1];
        const previousPrice = closes[closes.length - 1 - period];
        
        return ((currentPrice - previousPrice) / previousPrice) * 100;
    }

    /**
     * Calcule les niveaux de support et résistance approximatifs
     */
    calculateSupportResistance(ohlcvData, period = 20) {
        if (ohlcvData.length < period) {
            return { support: 0, resistance: 0 };
        }

        const recentData = ohlcvData.slice(-period);
        const highs = recentData.map(candle => parseFloat(candle[2])); // High
        const lows = recentData.map(candle => parseFloat(candle[3]));   // Low

        return {
            support: Math.min(...lows),
            resistance: Math.max(...highs)
        };
    }

    /**
     * Calcule le volume moyen
     */
    calculateAverageVolume(ohlcvData, period = 20) {
        if (ohlcvData.length < period) return 0;
        
        const recentData = ohlcvData.slice(-period);
        const volumes = recentData.map(candle => parseFloat(candle[5])); // Volume
        
        return volumes.reduce((sum, vol) => sum + vol, 0) / period;
    }

    /**
     * Vérifie si les conditions de marché sont favorables au trading
     */
    isMarketConditionFavorable(indicators, advancedStats) {
        if (!indicators || !indicators.isValid() || !advancedStats) {
            return false;
        }

        // Vérifie la volatilité (ni trop faible, ni trop élevée)
        const currentPrice = indicators.bbMiddle;
        const volatilityPercent = (advancedStats.volatility / currentPrice) * 100;
        
        // Conditions favorables: volatilité modérée (0.5% - 3%)
        const isVolatilityOk = volatilityPercent >= 0.5 && volatilityPercent <= 3.0;
        
        // Bandes de Bollinger suffisamment écartées
        const bbWidth = indicators.getBollingerBandWidth();
        const isBBWidthOk = bbWidth > 1.0; // Au moins 1% d'écart
        
        return isVolatilityOk && isBBWidthOk;
    }

    /**
     * Met à jour la configuration des indicateurs
     */
    updateConfig(newConfig) {
        this.config = {
            ...this.config,
            ...newConfig
        };
        
        this.logger.info('INDICATORS', 'Configuration mise à jour', this.config);
    }

    /**
     * Retourne la configuration actuelle
     */
    getConfig() {
        return { ...this.config };
    }
}

module.exports = IndicatorService;