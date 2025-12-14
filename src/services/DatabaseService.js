const Database = require('better-sqlite3');
const { getLogger } = require('../utils/Logger');
const BotStatus = require('../models/BotStatus');
const Position = require('../models/Position');
const Trade = require('../models/Trade');

/**
 * Service de gestion de la base de données SQLite
 */
class DatabaseService {
    constructor(dbPath = './bot.db', symbol = null) {
        this.dbPath = dbPath;
        this.symbol = symbol;
        this.db = null;
        this.statements = {};
        this.logger = getLogger();
    }

    /**
     * Initialise la connexion à la base de données
     */
    initialize() {
        try {
            this.db = new Database(this.dbPath);
            
            // Active le mode WAL pour une meilleure concurrence
            this.db.pragma('journal_mode = WAL');
            
            // Crée les tables si elles n'existent pas
            this.createTables();
            
            // Prépare les requêtes
            this.prepareStatements();
            
            // Initialise le statut par défaut si nécessaire
            if (this.symbol) {
                this.initializeDefaultData();
            }
            
            this.logger.info('DATABASE', 'Connexion initialisée', { dbPath: this.dbPath, symbol: this.symbol });
        } catch (error) {
            this.logger.error('DATABASE', 'Erreur d\'initialisation', { error: error.message });
            throw error;
        }
    }

    /**
     * Crée les tables de la base de données
     */
    createTables() {
        const botStatusTable = `
            CREATE TABLE IF NOT EXISTS bot_status (
                symbol TEXT PRIMARY KEY,
                status TEXT NOT NULL,
                updated_at INTEGER NOT NULL
            )
        `;

        const positionTable = `
            CREATE TABLE IF NOT EXISTS position (
                symbol TEXT PRIMARY KEY,
                buy_price REAL,
                quantity REAL,
                buy_order_id TEXT,
                oco_order_list_id TEXT,
                order_type TEXT DEFAULT 'LIMIT',
                take_profit_price REAL,
                stop_loss_price REAL,
                created_at INTEGER,
                updated_at INTEGER
            )
        `;

        const tradeHistoryTable = `
            CREATE TABLE IF NOT EXISTS trade_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                symbol TEXT NOT NULL,
                side TEXT NOT NULL,
                price REAL NOT NULL,
                quantity REAL NOT NULL,
                order_id TEXT,
                timestamp INTEGER NOT NULL
            )
        `;

        this.db.exec(botStatusTable);
        this.db.exec(positionTable);
        this.db.exec(tradeHistoryTable);
    }

    /**
     * Prépare les requêtes SQL pour de meilleures performances
     */
    prepareStatements() {
        this.statements = {
            // Bot Status
            getBotStatus: this.db.prepare('SELECT * FROM bot_status WHERE symbol = ?'),
            updateBotStatus: this.db.prepare('UPDATE bot_status SET status = ?, updated_at = ? WHERE symbol = ?'),
            insertBotStatus: this.db.prepare('INSERT OR IGNORE INTO bot_status (symbol, status, updated_at) VALUES (?, ?, ?)'),
            
            // Position
            getPosition: this.db.prepare('SELECT * FROM position WHERE symbol = ?'),
            insertPosition: this.db.prepare(`
                INSERT OR REPLACE INTO position 
                (symbol, buy_price, quantity, buy_order_id, oco_order_list_id, order_type, take_profit_price, stop_loss_price, highest_price, created_at, updated_at) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `),
            deletePosition: this.db.prepare('DELETE FROM position WHERE symbol = ?'),
            
            // Trade History
            insertTrade: this.db.prepare(`
                INSERT INTO trade_history 
                (symbol, side, price, quantity, order_id, timestamp) 
                VALUES (?, ?, ?, ?, ?, ?)
            `),
            getTradeHistory: this.db.prepare(`
                SELECT * FROM trade_history 
                ORDER BY timestamp DESC 
                LIMIT ?
            `),
            getTradeStats: this.db.prepare(`
                SELECT 
                    COUNT(*) as total_trades,
                    SUM(CASE WHEN side = 'BUY' THEN quantity * price ELSE -quantity * price END) as total_pnl,
                    COUNT(CASE WHEN side = 'BUY' THEN 1 END) as buy_trades,
                    COUNT(CASE WHEN side = 'SELL' THEN 1 END) as sell_trades
                FROM trade_history
                WHERE symbol = ?
            `)
        };
    }

    /**
     * Initialise les données par défaut
     */
    initializeDefaultData() {
        if (!this.symbol) return;
        this.statements.insertBotStatus.run(this.symbol, 'IDLE', Date.now());
    }

    /**
     * Récupère le statut du bot
     */
    getBotStatus() {
        if (!this.symbol) throw new Error('Symbol not set in DatabaseService');
        const data = this.statements.getBotStatus.get(this.symbol);
        return data ? new BotStatus(data) : new BotStatus({ status: 'IDLE' });
    }

    /**
     * Met à jour le statut du bot
     */
    updateBotStatus(status) {
        if (!this.symbol) throw new Error('Symbol not set in DatabaseService');
        const timestamp = Date.now();
        this.statements.updateBotStatus.run(status, timestamp, this.symbol);
        return new BotStatus({ status, updated_at: timestamp });
    }

    /**
     * Récupère la position actuelle
     */
    getPosition() {
        if (!this.symbol) throw new Error('Symbol not set in DatabaseService');
        const data = this.statements.getPosition.get(this.symbol);
        return new Position(data || { symbol: this.symbol });
    }

    /**
     * Sauvegarde une nouvelle position
     */
    savePosition(position) {
        const data = position.toDatabaseFormat();
        // Force le symbole du service si non présent
        const symbol = data.symbol || this.symbol;
        
        this.statements.insertPosition.run(
            symbol,
            data.buy_price,
            data.quantity,
            data.buy_order_id,
            data.oco_order_list_id,
            data.order_type,
            data.take_profit_price,
            data.stop_loss_price,
            data.highest_price,
            data.created_at,
            data.updated_at
        );
    }

    /**
     * Efface la position actuelle
     */
    clearPosition() {
        if (!this.symbol) throw new Error('Symbol not set in DatabaseService');
        this.statements.deletePosition.run(this.symbol);
    }

    /**
     * Ajoute un trade à l'historique
     */
    addTrade(trade) {
        const data = trade.toDatabaseFormat();
        this.statements.insertTrade.run(
            data.symbol,
            data.side,
            data.price,
            data.quantity,
            data.order_id,
            data.timestamp
        );
    }

    /**
     * Récupère l'historique des trades
     */
    getTradeHistory(limit = 100) {
        const trades = this.statements.getTradeHistory.all(limit);
        return trades.map(trade => new Trade(trade));
    }

    /**
     * Récupère les statistiques de trading
     */
    getTradeStats() {
        if (!this.symbol) throw new Error('Symbol not set in DatabaseService');
        return this.statements.getTradeStats.get(this.symbol) || {
            total_trades: 0,
            total_pnl: 0,
            buy_trades: 0,
            sell_trades: 0
        };
    }

    /**
     * Exécute une transaction de trading (achat)
     */
    executeBuyTransaction(botStatus, position, trade) {
        const transaction = this.db.transaction(() => {
            this.updateBotStatus('IN_POSITION');
            this.savePosition(position);
            this.addTrade(trade);
        });
        
        transaction();
    }

    /**
     * Exécute une transaction de trading (vente)
     */
    executeSellTransaction(trade) {
        const transaction = this.db.transaction(() => {
            this.updateBotStatus('IDLE');
            this.clearPosition();
            this.addTrade(trade);
        });
        
        transaction();
    }

    /**
     * Ferme la connexion à la base de données
     */
    close() {
        if (this.db) {
            this.db.close();
            this.logger.info('DATABASE', 'Connexion fermée');
        }
    }

    /**
     * Sauvegarde la base de données (checkpoint WAL)
     */
    checkpoint() {
        if (this.db) {
            this.db.pragma('wal_checkpoint');
        }
    }
}

module.exports = DatabaseService;