const os = require('os');
const packageJson = require('./package.json');
const ConfigService = require('./src/config/ConfigService');
const MultiTradingService = require('./src/services/MultiTradingService');
const { getLogger } = require('./src/utils/Logger');

/**
 * Utilitaires pour le message de démarrage
 */
function getDbPath() {
    return process.env.DB_PATH || './trading.db';
}

function formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${days}j ${hours}h ${minutes}m`;
}

function getCpuModel() {
    const cpus = os.cpus();
    return cpus.length > 0 ? cpus[0].model : 'CPU inconnu';
}

function getIntervalMinutes(config) {
    return Math.floor((config?.TICK_INTERVAL || 10000) / 1000 / 60) || 1;
}

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
        const intervalMinutes = getIntervalMinutes(config);
        
        // Message de démarrage stylisé
        const startupMessage = `

************************************************************************************************************************

    #######  ######     ###    #####    #######  ###  ##   #####            #####     #####   ####### 
    #######  ###  ##   #####   ### ##     ###    ###  ##  ###               ##  ##   ###  ##  ####### 
    #######  ###  ##   ## ##   ###  ##    ###    #### ##  ### ##            #####    ###  ##  ####### 
      ###    #######  ##   ##  ###  ##    ###    #######  ###  ##           ##  ##   ###  ##    ###   
      ###    ######   ##   ##  ### ###    ###    #######  ###  ##           ##  ###  ###  ##    ###   
      ###    ### ###  ## ####  #######  #######  ### ###  #######           #######  #######    ###   
      ###    ### ###  ## ####  #######  #######  ###  ##  #######           ######   #######    ###   
      ###    ### ###  ## ####  ######   #######  ###  ##   #####            ######    #####     ###   

    Nom de l'application                                  : ${packageJson.name}
    Version                                               : ${packageJson.version}
    Version de Node.js                                    : ${process.version}
    Environnement                                         : ${process.env.NODE_ENV || 'development'}
    Chemin de la base de données SQLite                   : ${getDbPath()}
    Paires de Trading                                     : ${config.trading.symbols ? config.trading.symbols.join(', ') : config.trading.symbol}
    Intervalle de Trading                                 : ${intervalMinutes} minutes
    Mode de Trading                                       : ${config.trading.tradingMode || 'INDICATORS'}
    Système                                               : ${os.type()} ${os.release()} (${os.arch()})
    Uptime                                                : ${formatUptime(os.uptime())}
    CPU                                                   : ${getCpuModel()}
    Mémoire totale                                        : ${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} Go
    Mémoire libre                                         : ${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} Go
    
************************************************************************************************************************
`;
        this.logger.info({ message: startupMessage });
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
        
        await this.setup();
        this.isRunning = true;
        
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

    /**
     * Affiche les statistiques
     */
    displayStats() {
        if (this.tradingService) {
            const stats = this.tradingService.getTradingStats();
            this.logger.info('BOT', 'Statistiques', stats);
        }
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
        
        // Stats toutes les 5 minutes
        setInterval(() => bot.displayStats(), 300000);
        
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