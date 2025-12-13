const fs = require('fs');
const path = require('path');

/**
 * Service de gestion de la configuration multi-environnements
 */
class ConfigService {
    constructor() {
        this.environment = this.detectEnvironment();
        this.loadEnvironmentFile();
        this.config = this.loadConfiguration();
        this.validateConfiguration();
    }

    /**
     * Détecte l'environnement courant
     */
    detectEnvironment() {
        // Ordre de priorité : ENVIRONMENT > NODE_ENV > défaut LOCAL
        return process.env.ENVIRONMENT || 
               process.env.NODE_ENV || 
               'LOCAL';
    }

    /**
     * Charge le fichier .env approprié selon l'environnement
     */
    loadEnvironmentFile() {
        const envFiles = {
            'LOCAL': '.env.local',
            'DEV': '.env.dev', 
            'PROD': '.env.prod'
        };

        const envFile = envFiles[this.environment.toUpperCase()];
        const envPath = path.join(process.cwd(), envFile);

        if (fs.existsSync(envPath)) {
            console.log(`🔧 Chargement configuration: ${envFile}`);
            require('dotenv').config({ path: envPath });
        } else {
            console.warn(`⚠️  Fichier de configuration manquant: ${envFile}`);
            console.log(`📝 Créer le fichier ${envFile} depuis .env.example`);
            // Fallback vers .env générique
            require('dotenv').config();
        }
    }

    /**
     * Charge la configuration depuis les variables d'environnement
     */
    loadConfiguration() {
        // S'assurer que les variables d'environnement sont chargées avant de les utiliser
        const dbPath = process.env.DB_PATH || this.getDefaultDbPath();
        const logLevel = process.env.LOG_LEVEL || this.getDefaultLogLevel();
        
        return {
            // Informations d'environnement
            environment: {
                name: this.environment,
                nodeEnv: process.env.NODE_ENV || 'development',
                isProduction: this.environment === 'PROD',
                isDevelopment: ['LOCAL', 'DEV'].includes(this.environment),
                debugMode: process.env.DEBUG_MODE === 'true'
            },

            // Configuration API Binance
            exchange: {
                apiKey: process.env.BINANCE_API_KEY,
                secret: process.env.BINANCE_SECRET_KEY, // Nouveau nom cohérent
                sandbox: process.env.BINANCE_TESTNET === 'true'
            },

            // Configuration de trading
            trading: {
                symbol: process.env.TRADING_SYMBOL || 'BTC/USDC',                    // Paire principale
                symbols: this.parseTradingSymbols(process.env.TRADING_SYMBOLS),      // Multiples paires
                timeframe: process.env.TRADING_TIMEFRAME || '5m',
                amount: parseFloat(process.env.TRADE_AMOUNT) || 50,
                orderTimeout: parseInt(process.env.ORDER_TIMEOUT) || 30000,
                
                // Mode de trading
                tradingMode: process.env.TRADING_MODE || 'INDICATORS',
                
                // Mode Indicateurs (Bollinger + RSI)
                stopLossPercent: parseFloat(process.env.STOP_LOSS_PERCENT) || null,
                takeProfitPercent: parseFloat(process.env.TAKE_PROFIT_PERCENT) || null,
                
                // Mode OCO (automatique)
                ocoStopLossPercent: parseFloat(process.env.OCO_STOP_LOSS_PERCENT) || 2.0,
                ocoTakeProfitPercent: parseFloat(process.env.OCO_TAKE_PROFIT_PERCENT) || 3.0,
                
                // Trailing Stop / Secure Profit
                secureProfitTrigger: parseFloat(process.env.SECURE_PROFIT_TRIGGER) || 1.5,
                secureProfitDrop: parseFloat(process.env.SECURE_PROFIT_DROP) || 0.5,

                // Sécurité - Stop loss d'urgence même en mode indicateurs
                emergencyStopLossPercent: parseFloat(process.env.EMERGENCY_STOP_LOSS_PERCENT) || 5.0,
                
                // Gestion multi-paires
                maxConcurrentTrades: parseInt(process.env.MAX_CONCURRENT_TRADES) || 1
            },

            // Configuration des indicateurs
            indicators: {
                rsiPeriod: parseInt(process.env.RSI_PERIOD) || 14,
                bbPeriod: parseInt(process.env.BB_PERIOD) || 20,
                bbStdDev: parseFloat(process.env.BB_STDDEV) || 2,
                rsiOversold: parseFloat(process.env.RSI_OVERSOLD) || 30,
                rsiOverbought: parseFloat(process.env.RSI_OVERBOUGHT) || 70
            },

            // Configuration du bot
            bot: {
                tickInterval: parseInt(process.env.TICK_INTERVAL) || 10000,
                dbPath: dbPath,
                logLevel: logLevel
            },

            // Configuration de sécurité par environnement
            security: {
                maxPositionCount: parseInt(process.env.MAX_POSITION_COUNT) || 1,
                minBalanceUSDC: parseFloat(process.env.MIN_BALANCE_USDC) || 10,
                maxDailyTrades: parseInt(process.env.MAX_DAILY_TRADES) || this.getDefaultMaxTrades(),
                maxDailyLoss: parseFloat(process.env.MAX_DAILY_LOSS) || null
            },

            // Configuration de logging par environnement
            logging: {
                level: process.env.LOG_LEVEL || this.getDefaultLogLevel(),
                maxFiles: parseInt(process.env.LOG_MAX_FILES) || 5,
                maxSize: parseInt(process.env.LOG_MAX_SIZE) || 10485760, // 10MB
                verboseLogs: process.env.VERBOSE_LOGS === 'true'
            },

            // Configuration de monitoring
            monitoring: {
                performanceMonitoring: process.env.PERFORMANCE_MONITORING === 'true',
                errorNotifications: process.env.ERROR_NOTIFICATIONS === 'true',
                healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL) || 60000
            }
        };
    }

    /**
     * Obtient le chemin par défaut de la base de données selon l'environnement
     */
    getDefaultDbPath() {
        const paths = {
            'LOCAL': './db/trading-local.db',
            'DEV': './db/trading-dev.db',
            'PROD': './db/trading-prod.db'
        };
        return paths[this.environment] || './db/trading.db';
    }

    /**
     * Obtient le niveau de log par défaut selon l'environnement
     */
    getDefaultLogLevel() {
        const levels = {
            'LOCAL': 'debug',
            'DEV': 'info',
            'PROD': 'warn'
        };
        return levels[this.environment] || 'info';
    }

    /**
     * Obtient le nombre max de trades par défaut selon l'environnement
     */
    getDefaultMaxTrades() {
        const maxTrades = {
            'LOCAL': 10,
            'DEV': 25,
            'PROD': 100
        };
        return maxTrades[this.environment] || 50;
    }

    /**
     * Valide la configuration chargée
     */
    validateConfiguration() {
        const errors = [];

        // Validation des clés API
        if (!this.config.exchange.apiKey || !this.config.exchange.secret) {
            errors.push('BINANCE_API_KEY et BINANCE_SECRET sont requis');
        }

        // Validation des paramètres de trading
        if (this.config.trading.orderSize <= 0) {
            errors.push('ORDER_SIZE doit être supérieur à 0');
        }

        if (!this.isValidSymbol(this.config.trading.symbol)) {
            errors.push('FORMAT de SYMBOL invalide (ex: BTC/USDC)');
        }

        if (!this.isValidTimeframe(this.config.trading.timeframe)) {
            errors.push('TIMEFRAME invalide (ex: 1m, 5m, 15m, 1h, 4h, 1d)');
        }

        // Validation des indicateurs
        if (this.config.indicators.rsiPeriod < 2 || this.config.indicators.rsiPeriod > 100) {
            errors.push('RSI_PERIOD doit être entre 2 et 100');
        }

        if (this.config.indicators.bbPeriod < 2 || this.config.indicators.bbPeriod > 100) {
            errors.push('BB_PERIOD doit être entre 2 et 100');
        }

        if (this.config.indicators.bbStdDev <= 0 || this.config.indicators.bbStdDev > 5) {
            errors.push('BB_STDDEV doit être entre 0 et 5');
        }

        if (this.config.indicators.rsiOversold >= this.config.indicators.rsiOverbought) {
            errors.push('RSI_OVERSOLD doit être inférieur à RSI_OVERBOUGHT');
        }

        // Validation des paramètres du bot
        if (this.config.bot.tickInterval < 1000) {
            errors.push('TICK_INTERVAL doit être d\'au moins 1000ms');
        }

        if (errors.length > 0) {
            console.error('[CONFIG] Erreurs de configuration:');
            errors.forEach(error => console.error(`  - ${error}`));
            throw new Error(`Configuration invalide: ${errors.join(', ')}`);
        }

        console.log('[CONFIG] Configuration validée avec succès');
    }

    /**
     * Vérifie si le format du symbole est valide
     */
    isValidSymbol(symbol) {
        return /^[A-Z]+\/[A-Z]+$/.test(symbol);
    }

    /**
     * Vérifie si le timeframe est valide
     */
    isValidTimeframe(timeframe) {
        const validTimeframes = ['1m', '3m', '5m', '15m', '30m', '1h', '2h', '4h', '6h', '8h', '12h', '1d', '3d', '1w', '1M'];
        return validTimeframes.includes(timeframe);
    }

    /**
     * Retourne la configuration complète
     */
    getConfig() {
        return JSON.parse(JSON.stringify(this.config)); // Deep clone
    }

    /**
     * Retourne une section spécifique de la configuration
     */
    getExchangeConfig() {
        return { ...this.config.exchange };
    }

    getTradingConfig() {
        return { ...this.config.trading };
    }

    getIndicatorConfig() {
        return { ...this.config.indicators };
    }

    getBotConfig() {
        return { ...this.config.bot };
    }

    getSecurityConfig() {
        return { ...this.config.security };
    }

    /**
     * Met à jour une valeur de configuration (runtime seulement)
     */
    updateConfig(section, key, value) {
        if (this.config[section] && this.config[section].hasOwnProperty(key)) {
            const oldValue = this.config[section][key];
            this.config[section][key] = value;
            
            console.log(`[CONFIG] ${section}.${key}: ${oldValue} -> ${value}`);
            
            // Re-validation si nécessaire
            if (section === 'trading' || section === 'indicators') {
                this.validateConfiguration();
            }
        } else {
            throw new Error(`Configuration ${section}.${key} non trouvée`);
        }
    }

    /**
     * Affiche un résumé de la configuration multi-environnements (sans les secrets)
     */
    displayConfigSummary() {
        console.log('\n🔧 ════════════════════════════════════════════════════════════════');
        console.log(`📦 CONFIGURATION ENVIRONNEMENT: ${this.environment}`);
        console.log('🔧 ════════════════════════════════════════════════════════════════');
        
        // Environnement
        console.log(`\n🌍 ENVIRONNEMENT:`);
        console.log(`   Nom                    : ${this.config.environment.name}`);
        console.log(`   Node.js ENV            : ${this.config.environment.nodeEnv}`);
        console.log(`   Mode Production        : ${this.config.environment.isProduction ? '✅ OUI' : '❌ NON'}`);
        console.log(`   Mode Développement     : ${this.config.environment.isDevelopment ? '✅ OUI' : '❌ NON'}`);
        console.log(`   Debug activé           : ${this.config.environment.debugMode ? '✅ OUI' : '❌ NON'}`);
        
        // Exchange
        console.log(`\n💱 EXCHANGE (BINANCE):`);
        console.log(`   Mode Testnet           : ${this.config.exchange.sandbox ? '✅ TESTNET' : '⚠️  PRODUCTION RÉELLE'}`);
        console.log(`   API configurée         : ${this.config.exchange.apiKey ? '✅ OUI' : '❌ NON'}`);
        
        // Trading
        console.log(`\n📊 CONFIGURATION TRADING:`);
        console.log(`   Paire                  : ${this.config.trading.symbol}`);
        console.log(`   Timeframe              : ${this.config.trading.timeframe}`);
        console.log(`   Montant par trade      : ${this.config.trading.amount} USDC`);
        console.log(`   Mode de trading        : ${this.config.trading.tradingMode}`);
        console.log(`   Stop Loss              : ${this.config.trading.stopLossPercent || 'N/A'}%`);
        console.log(`   Take Profit            : ${this.config.trading.takeProfitPercent || 'N/A'}%`);
        console.log(`   Stop Loss d'urgence    : ${this.config.trading.emergencyStopLossPercent}%`);
        
        // Sécurité
        console.log(`\n🛡️  SÉCURITÉ ET LIMITES:`);
        console.log(`   Positions max          : ${this.config.security.maxPositionCount}`);
        console.log(`   Solde minimum          : ${this.config.security.minBalanceUSDC} USDC`);
        console.log(`   Trades max/jour        : ${this.config.security.maxDailyTrades || 'Illimité'}`);
        console.log(`   Perte max/jour         : ${this.config.security.maxDailyLoss ? this.config.security.maxDailyLoss + ' USDC' : 'Illimité'}`);
        
        // Indicateurs
        console.log(`\n📈 INDICATEURS TECHNIQUES:`);
        console.log(`   RSI Période            : ${this.config.indicators.rsiPeriod}`);
        console.log(`   RSI Seuils             : ${this.config.indicators.rsiOversold}-${this.config.indicators.rsiOverbought}`);
        console.log(`   Bollinger Période      : ${this.config.indicators.bbPeriod}`);
        console.log(`   Bollinger Écart-type   : ${this.config.indicators.bbStdDev}σ`);
        
        // Système
        console.log(`\n⚙️  CONFIGURATION SYSTÈME:`);
        console.log(`   Intervalle tick        : ${this.config.bot.tickInterval}ms (${Math.floor(this.config.bot.tickInterval/1000)}s)`);
        console.log(`   Base de données        : ${this.config.bot.dbPath}`);
        console.log(`   Niveau de log          : ${this.config.logging.level.toUpperCase()}`);
        console.log(`   Logs verbeux           : ${this.config.logging.verboseLogs ? '✅ OUI' : '❌ NON'}`);
        console.log(`   Monitoring perf        : ${this.config.monitoring.performanceMonitoring ? '✅ OUI' : '❌ NON'}`);
        
        console.log('\n🔧 ════════════════════════════════════════════════════════════════\n');
        
        // Avertissements par environnement
        this.displayEnvironmentWarnings();
    }

    /**
     * Affiche des avertissements spécifiques à l'environnement
     */
    displayEnvironmentWarnings() {
        switch (this.environment) {
            case 'PROD':
                if (this.config.exchange.sandbox) {
                    console.log('⚠️  ATTENTION: Testnet activé en PRODUCTION !');
                } else {
                    console.log('🚨 PRODUCTION: ARGENT RÉEL EN JEU !');
                }
                break;
                
            case 'DEV':
                if (!this.config.exchange.sandbox) {
                    console.log('⚠️  ATTENTION: API réelle en DEV, recommandé d\'utiliser TESTNET !');
                } else {
                    console.log('✅ DEV: Testnet activé, parfait pour les tests !');
                }
                break;
                
            case 'LOCAL':
                if (!this.config.exchange.sandbox) {
                    console.log('⚠️  ATTENTION: API réelle en LOCAL, utilisez TESTNET !');
                } else {
                    console.log('✅ LOCAL: Testnet activé, parfait pour le développement !');
                }
                break;
        }
    }

    /**
     * Sauvegarde la configuration actuelle dans un fichier
     */
    exportConfig(filePath = './config-backup.json') {
        const fs = require('fs');
        
        const exportData = {
            ...this.config,
            exchange: {
                ...this.config.exchange,
                apiKey: '***HIDDEN***',
                secret: '***HIDDEN***'
            },
            timestamp: new Date().toISOString()
        };

        fs.writeFileSync(filePath, JSON.stringify(exportData, null, 2));
        console.log(`[CONFIG] Configuration exportée vers: ${filePath}`);
    }

    /**
     * Vérifie si la configuration permet le trading en mode sécurisé
     */
    isSafeForLiveTrading() {
        const checks = {
            hasStopLoss: this.config.trading.stopLossPercent !== null,
            reasonableOrderSize: this.config.trading.orderSize <= 0.01, // Max 0.01 BTC
            reasonableTimeout: this.config.bot.tickInterval >= 5000, // Min 5 secondes
            emergencyStop: this.config.security.emergencyStopLoss < 0
        };

        const passedChecks = Object.values(checks).filter(Boolean).length;
        const totalChecks = Object.keys(checks).length;

        console.log(`[CONFIG] Vérifications sécurité: ${passedChecks}/${totalChecks}`);
        
        if (passedChecks < totalChecks) {
            console.warn('[CONFIG] Recommandations pour le trading en live:');
            if (!checks.hasStopLoss) console.warn('  - Configurer STOP_LOSS_PERCENT');
            if (!checks.reasonableOrderSize) console.warn('  - Réduire ORDER_SIZE (≤ 0.01)');
            if (!checks.reasonableTimeout) console.warn('  - Augmenter TICK_INTERVAL (≥ 5000ms)');
            if (!checks.emergencyStop) console.warn('  - Configurer EMERGENCY_STOP_LOSS');
        }

        return passedChecks === totalChecks;
    }

    /**
     * Retourne les variables d'environnement manquantes
     */
    getMissingEnvVars() {
        const requiredVars = ['BINANCE_API_KEY', 'BINANCE_SECRET'];
        const missingVars = requiredVars.filter(varName => !process.env[varName]);
        
        return missingVars;
    }

    /**
     * Génère un fichier .env d'exemple avec les valeurs actuelles
     */
    generateEnvExample() {
        const envContent = `# Configuration générée le ${new Date().toISOString()}

# Binance API Configuration
BINANCE_API_KEY=${this.config.exchange.apiKey ? 'your_api_key_here' : ''}
BINANCE_SECRET=${this.config.exchange.secret ? 'your_secret_here' : ''}
BINANCE_SANDBOX=${this.config.exchange.sandbox}

# Trading Configuration
SYMBOL=${this.config.trading.symbol}
TIMEFRAME=${this.config.trading.timeframe}
ORDER_SIZE=${this.config.trading.orderSize}
ORDER_TIMEOUT=${this.config.trading.orderTimeout}
STOP_LOSS_PERCENT=${this.config.trading.stopLossPercent || ''}
TAKE_PROFIT_PERCENT=${this.config.trading.takeProfitPercent || ''}

# Indicator Configuration
RSI_PERIOD=${this.config.indicators.rsiPeriod}
BB_PERIOD=${this.config.indicators.bbPeriod}
BB_STDDEV=${this.config.indicators.bbStdDev}
RSI_OVERSOLD=${this.config.indicators.rsiOversold}
RSI_OVERBOUGHT=${this.config.indicators.rsiOverbought}

# Bot Configuration
TICK_INTERVAL=${this.config.bot.tickInterval}
DB_PATH=${this.config.bot.dbPath}
LOG_LEVEL=${this.config.bot.logLevel}

# Security Configuration
MAX_DAILY_TRADES=${this.config.security.maxDailyTrades || ''}
MAX_DAILY_LOSS=${this.config.security.maxDailyLoss || ''}
EMERGENCY_STOP_LOSS=${this.config.security.emergencyStopLoss}
`;

        return envContent;
    }

    /**
     * Parse les symboles de trading depuis une chaîne séparée par virgules
     */
    parseTradingSymbols(symbolsString) {
        if (!symbolsString) {
            return ['BTC/USDC']; // Défaut
        }
        
        return symbolsString
            .split(',')
            .map(symbol => symbol.trim())
            .filter(symbol => symbol.length > 0)
            .filter(symbol => symbol.includes('/'));
    }
}

module.exports = ConfigService;