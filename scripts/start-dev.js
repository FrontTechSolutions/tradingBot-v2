#!/usr/bin/env node

/**
 * 🚀 Script de Lancement Environnement DEV
 */

// Définir l'environnement
process.env.ENVIRONMENT = 'DEV';
process.env.NODE_ENV = 'DEV';

console.log('🚀 Lancement du bot en mode DEV (Staging)');
console.log('📊 Base de données : db/trading-dev.db');
console.log('💱 Mode : TESTNET (sécurisé)');
console.log('💰 Montant : 25 USDC par trade');
console.log('📝 Logs : INFO avec monitoring');
console.log('');

// Lancer l'application principale
require('../app.js');