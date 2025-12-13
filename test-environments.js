#!/usr/bin/env node

/**
 * 🔧 Script de Test Configuration Multi-Environnements
 * 
 * Teste les 3 environnements : LOCAL, DEV, PROD
 */

const ConfigService = require('./src/config/ConfigService');

// Liste des environnements à tester
const environments = ['LOCAL', 'DEV', 'PROD'];

console.log('🧪 TEST DE LA CONFIGURATION MULTI-ENVIRONNEMENTS\n');

environments.forEach(env => {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`🔍 TEST ENVIRONNEMENT: ${env}`);
    console.log(`${'='.repeat(70)}`);
    
    // Définir l'environnement temporairement
    const originalEnv = process.env.ENVIRONMENT;
    const originalNodeEnv = process.env.NODE_ENV;
    
    process.env.ENVIRONMENT = env;
    process.env.NODE_ENV = env;
    
    try {
        const configService = new ConfigService();
        // Ne pas afficher le résumé complet pour éviter la surcharge
        console.log(`✅ Configuration ${env} chargée avec succès`);
        
        const config = configService.getConfig();
        
        console.log(`📊 Résumé ${env}:`);
        console.log(`   Environment: ${config.environment.name}`);
        console.log(`   Testnet: ${config.exchange.sandbox ? '✅ Activé' : '❌ Désactivé'}`);
        console.log(`   DB Path: ${config.bot.dbPath}`);
        console.log(`   Log Level: ${config.logging.level}`);
        console.log(`   Max Trades/jour: ${config.security.maxDailyTrades}`);
        
    } catch (error) {
        console.log(`❌ Erreur configuration ${env}: ${error.message}`);
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

console.log(`\n${'='.repeat(70)}`);
console.log('🎯 RÉSUMÉ DES TESTS');
console.log(`${'='.repeat(70)}`);

console.log('\n📋 FICHIERS DE CONFIGURATION REQUIS:');
environments.forEach(env => {
    const fileName = `.env.${env.toLowerCase()}`;
    const fs = require('fs');
    const exists = fs.existsSync(fileName);
    console.log(`   ${exists ? '✅' : '❌'} ${fileName} ${exists ? '(existe)' : '(à créer depuis .env.example)'}`);
});

console.log('\n🚀 COMMANDES DE LANCEMENT PAR ENVIRONNEMENT:');
console.log('   🔧 LOCAL:       set ENVIRONMENT=LOCAL&& node app.js');
console.log('   🔧 DEV:         set ENVIRONMENT=DEV&& node app.js');  
console.log('   🔧 PROD:        set ENVIRONMENT=PROD&& node app.js');

console.log('\n📊 COMMANDES DE VÉRIFICATION CONFIG:');
console.log('   📋 LOCAL:       set ENVIRONMENT=LOCAL&& npm run config:check');
console.log('   📋 DEV:         set ENVIRONMENT=DEV&& npm run config:check');
console.log('   📋 PROD:        set ENVIRONMENT=PROD&& npm run config:check');

console.log('\n⚠️  IMPORTANT - SÉCURITÉ:');
console.log('   🔒 LOCAL/DEV:   BINANCE_TESTNET=true (obligatoire)');
console.log('   🚨 PROD:        BINANCE_TESTNET=false (argent réel !)');

console.log('\n' + '='.repeat(70));