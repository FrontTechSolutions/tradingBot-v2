#!/usr/bin/env node

/**
 * 🔧 Script de Lancement Environnement LOCAL
 */

// Définir l'environnement
process.env.ENVIRONMENT = 'LOCAL';
process.env.NODE_ENV = 'LOCAL';

console.log('🔧 Lancement du bot en mode LOCAL');
console.log('📊 Base de données : db/trading-local.db');
console.log('💱 Mode : TESTNET (sécurisé)');
console.log('💰 Montant : 10 USDC par trade');
console.log('📝 Logs : DEBUG (verbeux)');
console.log('');

// Lancer l'application principale
try {
    console.log('🚀 Chargement de l\'application...');
    const CryptoTradingBot = require('../app.js');
    
    console.log('🤖 Démarrage du bot...');
    
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