#!/usr/bin/env node

/**
 * 🏭 Script de Lancement Environnement PRODUCTION
 * ⚠️  ATTENTION: ARGENT RÉEL EN JEU !
 */

// Définir l'environnement
process.env.ENVIRONMENT = 'PROD';
process.env.NODE_ENV = 'PROD';

this.logger.info('🏭 Lancement du bot en mode PRODUCTION');
this.logger.info('🚨 ATTENTION: API BINANCE RÉELLE - ARGENT RÉEL !');
this.logger.info('📊 Base de données : db/trading-prod.db');
this.logger.info('💱 Mode : API RÉELLE (production)');
this.logger.info('💰 Montant : 100 USDC par trade');
this.logger.info('📝 Logs : WARN (optimisé)');
this.logger.info('');
this.logger.info('⚠️  Assurez-vous que votre configuration est correcte !');
this.logger.info('');

// Lancer l'application principale
require('../app.js');