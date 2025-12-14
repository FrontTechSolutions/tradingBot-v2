#!/usr/bin/env node

/**
 * 🚀 Script de Lancement Environnement DEV
 */

// Définir l'environnement
process.env.ENVIRONMENT = 'DEV';
process.env.NODE_ENV = 'DEV';

this.logger.info('🚀 Lancement du bot en mode DEV (Staging)');
this.logger.info('📊 Base de données : db/trading-dev.db');
this.logger.info('💱 Mode : TESTNET (sécurisé)');
this.logger.info('💰 Montant : 25 USDC par trade');
this.logger.info('📝 Logs : INFO avec monitoring');
this.logger.info('');

// Lancer l'application principale
require('../app.js');