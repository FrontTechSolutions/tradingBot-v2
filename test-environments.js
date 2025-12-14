#!/usr/bin/env node

/**
 * 🔧 Script de Test Configuration Multi-Environnements
 * 
 * Teste les 3 environnements : LOCAL, DEV, PROD
 */

const ConfigService = require('./src/config/ConfigService');

// Liste des environnements à tester
const environments = ['LOCAL', 'DEV', 'PROD'];

this.logger.info('🧪 TEST DE LA CONFIGURATION MULTI-ENVIRONNEMENTS\n');

environments.forEach(env => {
    this.logger.info(`\n${'='.repeat(70)}`);
    this.logger.info(`🔍 TEST ENVIRONNEMENT: ${env}`);
    this.logger.info(`${'='.repeat(70)}`);
    
    // Définir l'environnement temporairement
    const originalEnv = process.env.ENVIRONMENT;
    const originalNodeEnv = process.env.NODE_ENV;
    
    process.env.ENVIRONMENT = env;
    process.env.NODE_ENV = env;
    
    try {
        const configService = new ConfigService();
        // Ne pas afficher le résumé complet pour éviter la surcharge
        this.logger.info(`✅ Configuration ${env} chargée avec succès`);
        
        const config = configService.getConfig();
        
        this.logger.info(`📊 Résumé ${env}:`);
        this.logger.info(`   Environment: ${config.environment.name}`);
        this.logger.info(`   Testnet: ${config.exchange.sandbox ? '✅ Activé' : '❌ Désactivé'}`);
        this.logger.info(`   DB Path: ${config.bot.dbPath}`);
        this.logger.info(`   Log Level: ${config.logging.level}`);
        this.logger.info(`   Max Trades/jour: ${config.security.maxDailyTrades}`);
        
    } catch (error) {
        this.logger.info(`❌ Erreur configuration ${env}: ${error.message}`);
    }
    
    // Restaurer l'environnement original
    if (originalEnv) {
        process.env.ENVIRONMENT = originalEnv;
    } else {
        delete process.env.ENVIRONMENT;
    }
    
    if (originalNodeEnv) {
        process.env.NODE_ENV = originalNodeEnv;
    } else {
        delete process.env.NODE_ENV;
    }
});

this.logger.info(`\n${'='.repeat(70)}`);
this.logger.info('🎯 RÉSUMÉ DES TESTS');
this.logger.info(`${'='.repeat(70)}`);

this.logger.info('\n📋 FICHIERS DE CONFIGURATION REQUIS:');
environments.forEach(env => {
    const fileName = `.env.${env.toLowerCase()}`;
    const fs = require('fs');
    const exists = fs.existsSync(fileName);
    this.logger.info(`   ${exists ? '✅' : '❌'} ${fileName} ${exists ? '(existe)' : '(à créer depuis .env.example)'}`);
});

this.logger.info('\n🚀 COMMANDES DE LANCEMENT PAR ENVIRONNEMENT:');
this.logger.info('   🔧 LOCAL:       set ENVIRONMENT=LOCAL&& node app.js');
this.logger.info('   🔧 DEV:         set ENVIRONMENT=DEV&& node app.js');  
this.logger.info('   🔧 PROD:        set ENVIRONMENT=PROD&& node app.js');

this.logger.info('\n📊 COMMANDES DE VÉRIFICATION CONFIG:');
this.logger.info('   📋 LOCAL:       set ENVIRONMENT=LOCAL&& npm run config:check');
this.logger.info('   📋 DEV:         set ENVIRONMENT=DEV&& npm run config:check');
this.logger.info('   📋 PROD:        set ENVIRONMENT=PROD&& npm run config:check');

this.logger.info('\n⚠️  IMPORTANT - SÉCURITÉ:');
this.logger.info('   🔒 LOCAL/DEV:   BINANCE_TESTNET=true (obligatoire)');
this.logger.info('   🚨 PROD:        BINANCE_TESTNET=false (argent réel !)');

this.logger.info('\n' + '='.repeat(70));