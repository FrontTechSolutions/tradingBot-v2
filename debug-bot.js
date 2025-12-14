#!/usr/bin/env node

/**
 * 🔍 Test de Debug du Bot
 */

// Définir l'environnement
process.env.ENVIRONMENT = 'LOCAL';
process.env.NODE_ENV = 'LOCAL';

this.logger.info('🔍 Test de debug du bot...');

try {
    this.logger.info('1. Test import ConfigService...');
    const ConfigService = require('./src/config/ConfigService');
    this.logger.info('✅ ConfigService importé');
    
    this.logger.info('2. Test création ConfigService...');
    const configService = new ConfigService();
    this.logger.info('✅ ConfigService créé');
    
    this.logger.info('3. Test getConfig...');
    const config = configService.getConfig();
    this.logger.info('✅ Config obtenue');
    
    this.logger.info('4. Test import TradingService...');
    const TradingService = require('./src/services/TradingService');
    this.logger.info('✅ TradingService importé');
    
    this.logger.info('5. Test import Logger...');
    const { getLogger } = require('./src/utils/Logger');
    const logger = getLogger();
    this.logger.info('✅ Logger créé');
    
    this.logger.info('6. Test création TradingService...');
    const tradingService = new TradingService(config);
    this.logger.info('✅ TradingService créé');
    
    this.logger.info('🎉 Tous les composants fonctionnent !');
    
} catch (error) {
    console.error('❌ Erreur détectée:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
}