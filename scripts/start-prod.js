#!/usr/bin/env node

/**
 * 🏭 Script de Lancement Environnement PRODUCTION
 * ⚠️  ATTENTION: ARGENT RÉEL EN JEU !
 */

// Définir l'environnement
process.env.ENVIRONMENT = 'PROD';
process.env.NODE_ENV = 'PROD';

console.log('🏭 Lancement du bot en mode PRODUCTION');
console.log('🚨 ATTENTION: API BINANCE RÉELLE - ARGENT RÉEL !');
console.log('📊 Base de données : db/trading-prod.db');
console.log('💱 Mode : API RÉELLE (production)');
console.log('💰 Montant : 100 USDC par trade');
console.log('📝 Logs : WARN (optimisé)');
console.log('');
console.log('⚠️  Assurez-vous que votre configuration est correcte !');
console.log('');

// Lancer l'application principale
require('../app.js');