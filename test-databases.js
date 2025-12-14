#!/usr/bin/env node

/**
 * 🗄️ Test de Connexion Base de Données par Environnement
 */

const path = require('path');
const fs = require('fs');
const ConfigService = require('./src/config/ConfigService');
const DatabaseService = require('./src/services/DatabaseService');
const { getLogger } = require('./src/utils/Logger');

const logger = getLogger();

logger.info('🗄️ TEST DES BASES DE DONNÉES PAR ENVIRONNEMENT\n');

const environments = ['LOCAL', 'DEV', 'PROD'];

environments.forEach(env => {
    logger.info(`📊 ENVIRONNEMENT: ${env}`);
    logger.info('─'.repeat(50));
    
    // Configuration temporaire
    process.env.ENVIRONMENT = env;
    
    try {
        const configService = new ConfigService();
        const config = configService.getConfig();
        const dbPath = config.bot.dbPath;
        
        logger.info(`📁 Chemin DB configuré  : ${dbPath}`);
        logger.info(`📍 Chemin DB absolu     : ${path.resolve(dbPath)}`);
        logger.info(`📋 Existe déjà          : ${fs.existsSync(dbPath) ? '✅ OUI' : '❌ NON'}`);
        
        // Test de création/connexion
        const dbService = new DatabaseService(dbPath, 'TEST');
        logger.info(`🔗 Test connexion       : En cours...`);
        
        dbService.initialize();
        logger.info(`✅ Connexion réussie    : ${dbPath}`);
        
        // Vérifier les tables
        const botStatus = dbService.getBotStatus();
        logger.info(`📊 Statut bot           : ${botStatus ? botStatus.status : 'N/A'}`);
        
        const stats = dbService.getTradeStats();
        logger.info(`📈 Trades enregistrés   : ${stats.totalTrades || 0}`);
        
        if (dbService.db) dbService.db.close();
        logger.info(`🔒 Connexion fermée     : OK`);
        
    } catch (error) {
        logger.info(`❌ Erreur              : ${error.message}`);
    }
    
    logger.info('');
});

logger.info('🎯 RÉSUMÉ CHEMINS DE BASES DE DONNÉES:');
logger.info('─'.repeat(60));
logger.info(`🔧 LOCAL : C:\\Users\\elodi\\Documents\\workspace\\tradingBot-v2\\db\\trading-local.db`);
logger.info(`🚀 DEV   : C:\\Users\\elodi\\Documents\\workspace\\tradingBot-v2\\db\\trading-dev.db`);
logger.info(`🏭 PROD  : C:\\Users\\elodi\\Documents\\workspace\\tradingBot-v2\\db\\trading-prod.db`);
logger.info('\n💡 COMMANDES WINDOWS UTILES:');
logger.info('─'.repeat(60));
logger.info(`📁 Voir les DBs         : dir db\\*.db`);
logger.info(`🗑️  Supprimer DB locale  : del db\\trading-local.db`);
logger.info(`📋 Copier DB locale     : copy db\\trading-local.db db\\backup-local.db`);
logger.info(`📏 Taille des DBs       : for %f in (db\\*.db) do @echo %f: %~zf bytes`);

logger.info('\n' + '='.repeat(60));