const os = require('os');
const packageJson = require('./package.json');
const ConfigService = require('./src/config/ConfigService');
const MultiTradingService = require('./src/services/MultiTradingService');
const { getLogger } = require('./src/utils/Logger');



/**
 * Bot de Trading Crypto - Point d'entrée principal
 * Architecture modulaire et code simplifié
 */
class CryptoTradingBot {
    constructor() {
        this.logger = getLogger();
        this.isRunning = false;
        this.tradingService = null;
    }

    /**
     * Initialise le bot complet
     */
    async setup() {
        this.logger.info('BOT', 'Initialisation...');
        
        const configService = new ConfigService();
        const config = configService.getConfig();
        this.logger.info('BOT', 'Informations système affichées');
        
        configService.displayConfigSummary();
        
        this.tradingService = new MultiTradingService(config);
        await this.tradingService.initialize();
        
        this.logger.info('BOT', 'Bot multi-paires prêt à trader !');
    }

    /**
     * Démarre le trading
     */
    async start() {
        if (this.isRunning) {
            this.logger.warn('BOT', 'Déjà démarré');
            return;
        }
        
        // Initialisation complète
        await this.setup();
        this.isRunning = true;
        
        // Démarrer le service de trading
        await this.tradingService.start();
        this.logger.info('BOT', 'Trading démarré');
    }

    /**
     * Arrête le trading
     */
    async stop() {
        if (!this.isRunning) return;
        
        this.isRunning = false;
        if (this.tradingService) {
            await this.tradingService.stop();
        }
        this.logger.info('BOT', 'Trading arrêté');
    }
}

// === GESTION DES ERREURS ===
process.on('uncaughtException', (error) => {
    console.error('Erreur critique:', error.message);
    process.exit(1);
});

process.on('unhandledRejection', (reason) => {
    console.error('Promesse rejetée:', reason);
    process.exit(1);
});

// === ARRÊT PROPRE ===
let bot = null;

const shutdown = async (signal) => {
    this.logger.info(`\n${signal} reçu - Arrêt en cours...`);
    if (bot) await bot.stop();
    process.exit(0);
};

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

// === DÉMARRAGE ===
async function main() {
    try {
        bot = new CryptoTradingBot();
        await bot.start();  
    } catch (error) {
        console.error('Échec démarrage:', error.message);
        process.exit(1);
    }
}

// Démarrage si exécution directe
if (require.main === module) {
    main();
}

module.exports = CryptoTradingBot;