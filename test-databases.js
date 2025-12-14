#!/usr/bin/env node

/**
 * 🗄️ Test de Connexion Base de Données par Environnement
 */

const path = require('path');
const fs = require('fs');
const ConfigService = require('./src/config/ConfigService');
const DatabaseService = require('./src/services/DatabaseService');

this.logger.info('🗄️ TEST DES BASES DE DONNÉES PAR ENVIRONNEMENT\n');

const environments = ['LOCAL', 'DEV', 'PROD'];

environments.forEach(env => {
    this.logger.info(`📊 ENVIRONNEMENT: ${env}`);
    this.logger.info('─'.repeat(50));
    
    // Configuration temporaire
    process.env.ENVIRONMENT = env;
    
    try {
        const configService = new ConfigService();
        const config = configService.getConfig();
        const dbPath = config.bot.dbPath;
        
        this.logger.info(`📁 Chemin DB configuré  : ${dbPath}`);
        this.logger.info(`📍 Chemin DB absolu     : ${path.resolve(dbPath)}`);
        this.logger.info(`📋 Existe déjà          : ${fs.existsSync(dbPath) ? '✅ OUI' : '❌ NON'}`);
        
        // Test de création/connexion
        const dbService = new DatabaseService(dbPath);
        this.logger.info(`🔗 Test connexion       : En cours...`);
        
        dbService.initialize();
        this.logger.info(`✅ Connexion réussie    : ${dbPath}`);
        
        // Vérifier les tables
        const botStatus = dbService.getBotStatus();
        this.logger.info(`📊 Statut bot           : ${botStatus ? botStatus.status : 'N/A'}`);
        
        const stats = dbService.getTradeStats();
        this.logger.info(`📈 Trades enregistrés   : ${stats.total_trades}`);
        
        dbService.close();
        this.logger.info(`🔒 Connexion fermée     : OK`);
        
    } catch (error) {
        this.logger.info(`❌ Erreur              : ${error.message}`);
    }
    
    this.logger.info('');
});

        this.logger.info('🎯 RÉSUMÉ CHEMINS DE BASES DE DONNÉES:');
        this.logger.info('─'.repeat(60));
        this.logger.info(`🔧 LOCAL : C:\\Users\\elodi\\Documents\\workspace\\tradingBot-v2\\db\\trading-local.db`);
        this.logger.info(`🚀 DEV   : C:\\Users\\elodi\\Documents\\workspace\\tradingBot-v2\\db\\trading-dev.db`);
        this.logger.info(`🏭 PROD  : C:\\Users\\elodi\\Documents\\workspace\\tradingBot-v2\\db\\trading-prod.db`);this.logger.info('\n💡 COMMANDES WINDOWS UTILES:');
this.logger.info('─'.repeat(60));
this.logger.info(`📁 Voir les DBs         : dir db\\*.db`);
this.logger.info(`🗑️  Supprimer DB locale  : del db\\trading-local.db`);
this.logger.info(`📋 Copier DB locale     : copy db\\trading-local.db db\\backup-local.db`);
this.logger.info(`📊 Taille des DBs       : for %f in (db\\*.db) do @echo %f: %~zf bytes`);

this.logger.info('\n' + '='.repeat(60));