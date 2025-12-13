#!/usr/bin/env node

/**
 * 🗄️ Test de Connexion Base de Données par Environnement
 */

const path = require('path');
const fs = require('fs');
const ConfigService = require('./src/config/ConfigService');
const DatabaseService = require('./src/services/DatabaseService');

console.log('🗄️ TEST DES BASES DE DONNÉES PAR ENVIRONNEMENT\n');

const environments = ['LOCAL', 'DEV', 'PROD'];

environments.forEach(env => {
    console.log(`📊 ENVIRONNEMENT: ${env}`);
    console.log('─'.repeat(50));
    
    // Configuration temporaire
    process.env.ENVIRONMENT = env;
    
    try {
        const configService = new ConfigService();
        const config = configService.getConfig();
        const dbPath = config.bot.dbPath;
        
        console.log(`📁 Chemin DB configuré  : ${dbPath}`);
        console.log(`📍 Chemin DB absolu     : ${path.resolve(dbPath)}`);
        console.log(`📋 Existe déjà          : ${fs.existsSync(dbPath) ? '✅ OUI' : '❌ NON'}`);
        
        // Test de création/connexion
        const dbService = new DatabaseService(dbPath);
        console.log(`🔗 Test connexion       : En cours...`);
        
        dbService.initialize();
        console.log(`✅ Connexion réussie    : ${dbPath}`);
        
        // Vérifier les tables
        const botStatus = dbService.getBotStatus();
        console.log(`📊 Statut bot           : ${botStatus ? botStatus.status : 'N/A'}`);
        
        const stats = dbService.getTradeStats();
        console.log(`📈 Trades enregistrés   : ${stats.total_trades}`);
        
        dbService.close();
        console.log(`🔒 Connexion fermée     : OK`);
        
    } catch (error) {
        console.log(`❌ Erreur              : ${error.message}`);
    }
    
    console.log('');
});

        console.log('🎯 RÉSUMÉ CHEMINS DE BASES DE DONNÉES:');
        console.log('─'.repeat(60));
        console.log(`🔧 LOCAL : C:\\Users\\elodi\\Documents\\workspace\\tradingBot-v2\\db\\trading-local.db`);
        console.log(`🚀 DEV   : C:\\Users\\elodi\\Documents\\workspace\\tradingBot-v2\\db\\trading-dev.db`);
        console.log(`🏭 PROD  : C:\\Users\\elodi\\Documents\\workspace\\tradingBot-v2\\db\\trading-prod.db`);console.log('\n💡 COMMANDES WINDOWS UTILES:');
console.log('─'.repeat(60));
console.log(`📁 Voir les DBs         : dir db\\*.db`);
console.log(`🗑️  Supprimer DB locale  : del db\\trading-local.db`);
console.log(`📋 Copier DB locale     : copy db\\trading-local.db db\\backup-local.db`);
console.log(`📊 Taille des DBs       : for %f in (db\\*.db) do @echo %f: %~zf bytes`);

console.log('\n' + '='.repeat(60));