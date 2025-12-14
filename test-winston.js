const { getLogger, winston } = require('./src/utils/Logger');

// Test du nouveau système de logging Winston
const logger = getLogger();

this.logger.info('=== Test du Système de Logging Winston ===\n');

// Test des niveaux de log avec modules
logger.info('BOT', 'Démarrage du bot de trading');
logger.debug('DATABASE', 'Connexion à la base de données SQLite');
logger.warn('EXCHANGE', 'Limite de rate limite approchée', { remaining: 10 });
logger.error('TRADING', 'Erreur lors du placement d\'ordre', { 
  orderId: 'ABC123', 
  error: 'Insufficient balance',
  balance: 0.001 
});

// Test avec données complexes
logger.info('INDICATORS', 'Calcul des indicateurs terminé', {
  rsi: 28.5,
  bollingerBands: {
    upper: 51500,
    middle: 50000,
    lower: 48500
  },
  signal: 'BUY'
});

// Test winston direct pour usage avancé
winston.log('info', 'Message direct Winston', { 
  timestamp: new Date().toISOString(),
  performance: { executionTime: '15ms' }
});

// Test changement de niveau
logger.setLevel('debug');
logger.debug('TEST', 'Ce message debug est maintenant visible');

this.logger.info('\n=== Logs sauvegardés dans ./logs/ ===');
this.logger.info('- Console : logs colorés et formatés');
this.logger.info('- Fichier : logs persistants avec rotation automatique');
this.logger.info('- Archive : rotation manuelle avec npm run logs:archive');

// Test de la rotation manuelle
setTimeout(() => {
  logger.info('BOT', 'Test de rotation des logs...');
  logger.archiveLogs();
}, 1000);