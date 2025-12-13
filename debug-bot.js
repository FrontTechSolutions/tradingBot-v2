#!/usr/bin/env node

/**
 * 🔍 Test de Debug du Bot
 */

// Définir l'environnement
process.env.ENVIRONMENT = 'LOCAL';
process.env.NODE_ENV = 'LOCAL';

console.log('🔍 Test de debug du bot...');

try {
    console.log('1. Test import ConfigService...');
    const ConfigService = require('./src/config/ConfigService');
    console.log('✅ ConfigService importé');
    
    console.log('2. Test création ConfigService...');
    const configService = new ConfigService();
    console.log('✅ ConfigService créé');
    
    console.log('3. Test getConfig...');
    const config = configService.getConfig();
    console.log('✅ Config obtenue');
    
    console.log('4. Test import TradingService...');
    const TradingService = require('./src/services/TradingService');
    console.log('✅ TradingService importé');
    
    console.log('5. Test import Logger...');
    const { getLogger } = require('./src/utils/Logger');
    const logger = getLogger();
    console.log('✅ Logger créé');
    
    console.log('6. Test création TradingService...');
    const tradingService = new TradingService(config);
    console.log('✅ TradingService créé');
    
    console.log('🎉 Tous les composants fonctionnent !');
    
} catch (error) {
    console.error('❌ Erreur détectée:');
    console.error('Message:', error.message);
    console.error('Stack:', error.stack);
}