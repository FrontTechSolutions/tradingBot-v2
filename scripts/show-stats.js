const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Configuration
let DB_PATH = process.env.DB_PATH;

if (!DB_PATH) {
    // Tentative de détection automatique
    const rootDir = path.join(__dirname, '..');
    const candidates = [
        path.join(rootDir, 'db', 'trading-local.db'),
        path.join(rootDir, 'db', 'trading-dev.db'),
        path.join(rootDir, 'db', 'trading-prod.db')
    ];
    
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) {
            DB_PATH = candidate;
            break;
        }
    }
    
    // Défaut si rien trouvé
    if (!DB_PATH) {
        DB_PATH = path.join(rootDir, 'db', 'trading-local.db');
    }
}

if (!fs.existsSync(DB_PATH)) {
    console.error(`❌ Base de données non trouvée: ${DB_PATH}`);
    process.exit(1);
}

const db = new Database(DB_PATH, { readonly: true });

console.log(`\n📊 ANALYSE DES GAINS (${DB_PATH})`);
console.log('════════════════════════════════════════════════════');

// Récupérer tout l'historique
const trades = db.prepare('SELECT * FROM trade_history ORDER BY timestamp ASC').all();

let globalPnL = 0;
let buyCount = 0;
let sellCount = 0;
const dailyStats = {};

trades.forEach(trade => {
    const date = new Date(trade.timestamp).toLocaleDateString('fr-FR');
    const value = trade.price * trade.quantity;
    const pnlChange = trade.side === 'SELL' ? value : -value;

    // Global
    globalPnL += pnlChange;
    if (trade.side === 'BUY') buyCount++;
    else sellCount++;

    // Daily
    if (!dailyStats[date]) {
        dailyStats[date] = { trades: 0, pnl: 0 };
    }
    dailyStats[date].trades++;
    dailyStats[date].pnl += pnlChange;
});

const pnlColor = globalPnL >= 0 ? '\x1b[32m' : '\x1b[31m';
const resetColor = '\x1b[0m';


// Comptage des positions ouvertes (table position)
let openPositionsNb = [];
try {
    openPositionsNb = db.prepare('SELECT * FROM position WHERE quantity > 0').all();
} catch (e) {
    // Table peut ne pas exister si jamais
}

console.log(`\n📈 GLOBAL:`);
console.log(`   Trades Total : ${trades.length}`);
console.log(`   Achats       : ${buyCount}`);
console.log(`   Ventes       : ${sellCount}`);
console.log(`   P&L Total    : ${pnlColor}${globalPnL.toFixed(2)} USDC${resetColor}`);
console.log(`   Positions ouvertes : ${openPositionsNb.length}`);

console.log(`\n📅 PAR JOUR:`);
console.log('   Date       | Trades | P&L (USDC)');
console.log('   ───────────|────────|───────────');

Object.keys(dailyStats).reverse().forEach(date => {
    const stat = dailyStats[date];
    const color = stat.pnl >= 0 ? '\x1b[32m' : '\x1b[31m';
    console.log(`   ${date} | ${stat.trades.toString().padEnd(6)} | ${color}${stat.pnl.toFixed(2).padStart(9)}${resetColor}`);
});

console.log('\n════════════════════════════════════════════════════');

// Analyse des cycles complets (Achat + Vente)
console.log(`\n🔄 TRADES TERMINÉS (Cycles Achat + Vente):`);
console.log('   Date       | Paire    | Prix Achat | Prix Vente | P&L (USDC) | P&L (%)');
console.log('   ───────────|──────────|────────────|────────────|────────────|────────');

const openPositions = {}; // symbol -> { quantity, totalCost }
const completedTrades = [];

trades.forEach(trade => {
    if (!openPositions[trade.symbol]) {
        openPositions[trade.symbol] = { quantity: 0, totalCost: 0 };
    }
    
    const pos = openPositions[trade.symbol];

    if (trade.side === 'BUY') {
        pos.quantity += trade.quantity;
        pos.totalCost += (trade.price * trade.quantity);
    } else if (trade.side === 'SELL') {
        if (pos.quantity > 0) {
            // Prix moyen d'achat pondéré
            const avgBuyPrice = pos.totalCost / pos.quantity;
            const costOfSold = avgBuyPrice * trade.quantity;
            const revenue = trade.price * trade.quantity;
            const pnl = revenue - costOfSold;
            const pnlPercent = ((trade.price - avgBuyPrice) / avgBuyPrice) * 100;

            completedTrades.push({
                date: new Date(trade.timestamp).toLocaleDateString('fr-FR'),
                symbol: trade.symbol,
                buyPrice: avgBuyPrice,
                sellPrice: trade.price,
                pnl: pnl,
                pnlPercent: pnlPercent
            });

            // Mise à jour de la position restante
            pos.quantity -= trade.quantity;
            pos.totalCost -= costOfSold;
            
            // Nettoyage si quantité négligeable (erreurs d'arrondi)
            if (pos.quantity < 0.00000001) {
                pos.quantity = 0;
                pos.totalCost = 0;
            }
        }
    }
});

let totalRealized = 0;

if (completedTrades.length === 0) {
    console.log('   Aucun trade complet pour le moment.');
} else {
    completedTrades.reverse().forEach(trade => {
        totalRealized += trade.pnl;
        const color = trade.pnl >= 0 ? '\x1b[32m' : '\x1b[31m';
        const pnlStr = trade.pnl >= 0 ? `+${trade.pnl.toFixed(2)}` : trade.pnl.toFixed(2);
        
        console.log(`   ${trade.date} | ${trade.symbol.padEnd(8)} | ${trade.buyPrice.toFixed(4).padEnd(10)} | ${trade.sellPrice.toFixed(4).padEnd(10)} | ${color}${pnlStr.padStart(10)}${resetColor} | ${color}${trade.pnlPercent.toFixed(2)}%${resetColor}`);
    });
}

console.log(`\n   💰 TOTAL RÉALISÉ : ${totalRealized >= 0 ? '\x1b[32m' : '\x1b[31m'}${totalRealized.toFixed(2)} USDC${resetColor}`);

console.log('\n════════════════════════════════════════════════════\n');
