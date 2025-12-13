const fs = require('fs');
const path = require('path');
const { createLogger, format, transports } = require('winston');
const { combine, timestamp, printf, errors } = format;

const isDevelopment = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'local';
const logDir = path.join(process.cwd(), 'logs');
const archiveDir = path.join(logDir, 'archive');
const logFilePath = path.join(logDir, isDevelopment ? 'trading-bot.log' : 'trading-bot-prod.log');

// Création du répertoire de logs si inexistant
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Création du répertoire d'archive si inexistant
if (!fs.existsSync(archiveDir)) {
  fs.mkdirSync(archiveDir, { recursive: true });
}

// Création du fichier de logs si inexistant
if (!fs.existsSync(logFilePath)) {
  fs.writeFileSync(logFilePath, '');
}

// Format de logs avec module
const logFormat = printf(({ level, message, timestamp, module, stack, ...meta }) => {
  const moduleFormatted = module ? `[${module.toUpperCase()}]`.padEnd(12) : '[SYSTEM]'.padEnd(12);
  const metaString = Object.keys(meta).length ? ` | ${JSON.stringify(meta)}` : '';
  return `${timestamp} ${moduleFormatted} [${level.toUpperCase()}]: ${stack || message}${metaString}`;
});

// Logger Winston
const winstonLogger = createLogger({
  level: isDevelopment ? 'debug' : 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    errors({ stack: true }),
    logFormat
  ),
  transports: [
    new transports.Console({
      format: combine(
        format.colorize(),
        timestamp({ format: 'HH:mm:ss' }),
        logFormat
      )
    }),
    new transports.File({
      filename: logFilePath,
      level: isDevelopment ? 'debug' : 'info',
      maxsize: 5242880, // 5MB
      maxFiles: 5
    })
  ]
});

/**
 * Wrapper pour maintenir la compatibilité avec l'ancienne interface
 */
class Logger {
    constructor() {
        this.winston = winstonLogger;
    }

    error(module, message, data = {}) {
        this.winston.error(message, { module, ...data });
    }

    warn(module, message, data = {}) {
        this.winston.warn(message, { module, ...data });
    }

    info(module, message, data = {}) {
        this.winston.info(message, { module, ...data });
    }

    debug(module, message, data = {}) {
        this.winston.debug(message, { module, ...data });
    }

    setLevel(level) {
        this.winston.level = level;
        this.info('LOGGER', `Niveau de log changé vers: ${level}`);
    }

    // Méthodes Winston directes pour usage avancé
    log(level, message, meta = {}) {
        this.winston.log(level, message, meta);
    }

    // Rotation manuelle des logs
    archiveLogs() {
        const timestamp = new Date().toISOString().slice(0, 19).replace(/[T:]/g, '-');
        const archiveFile = path.join(archiveDir, `trading-bot-${timestamp}.log`);
        
        if (fs.existsSync(logFilePath)) {
            fs.copyFileSync(logFilePath, archiveFile);
            fs.writeFileSync(logFilePath, '');
            this.info('LOGGER', `Logs archivés vers: ${archiveFile}`);
        }
    }
}

// Instance singleton
let loggerInstance = null;

function getLogger() {
    if (!loggerInstance) {
        loggerInstance = new Logger();
    }
    return loggerInstance;
}

// Export direct de winston pour usage avancé
module.exports = { 
    Logger, 
    getLogger,
    winston: winstonLogger
};