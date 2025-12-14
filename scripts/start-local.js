#!/usr/bin/env node

/**
 * 🔧 Script de Lancement Environnement LOCAL
 */

// Définir l'environnement
process.env.ENVIRONMENT = 'LOCAL';
process.env.NODE_ENV = 'LOCAL';

this.logger.info('🔧 Lancement du bot en mode LOCAL');
this.logger.info('📊 Base de données : db/trading-local.db');
this.logger.info('💱 Mode : TESTNET (sécurisé)');
this.logger.info('💰 Montant : 10 USDC par trade');
this.logger.info('📝 Logs : DEBUG (verbeux)');
this.logger.info('');

// Lancer l'application principale
try {
    this.logger.info('🚀 Chargement de l\'application...');
    const CryptoTradingBot = require('../app.js');
    
    this.logger.info('🤖 Démarrage du bot...');
    
    // Créer et démarrer le bot
    async function startBot() {
        const bot = new CryptoTradingBot();
        await bot.start();
        
        // Stats toutes les 5 minutes
        setInterval(() => bot.displayStats(), 300000);
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