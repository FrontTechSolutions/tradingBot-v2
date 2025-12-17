#!/usr/bin/env node

/**
 * 🔧 Script de Lancement Environnement LOCAL
 */

// Définir l'environnement
process.env.ENVIRONMENT = 'LOCAL';
process.env.NODE_ENV = 'LOCAL';

const { getLogger } = require('../src/utils/Logger');
const logger = getLogger();

logger.info('🔧 Lancement du bot en mode LOCAL');
logger.info('📊 Base de données : db/trading-local.db');
logger.info('💱 Mode : TESTNET (sécurisé)');
logger.info('💰 Montant : 10 USDC par trade');
logger.info('📝 Logs : DEBUG (verbeux)');
logger.info('');

// Lancer l'application principale
try {
    logger.info('🚀 Chargement de l\'application...');
    const CryptoTradingBot = require('../app.js');
    
    logger.info('🤖 Démarrage du bot...');
    
    // Créer et démarrer le bot
    async function startBot() {
        const bot = new CryptoTradingBot();
        await bot.start();        
    }
    
    startBot().catch(error => {
        console.error('❌ Erreur de démarrage du bot:', error.message);
        process.exit(1);
    });
    
} catch (error) {
    console.error('❌ Erreur de lancement:', error.message);
    console.error('📍 Stack trace:', error.stack);
    process.exit(1);
}