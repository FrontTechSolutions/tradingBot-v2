const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: '.env.dev' });

// On fait la migration sur la base locale pour commencer
// On utilise le chemin défini dans le .env.dev
const dbPath = path.join(__dirname, process.env.DB_PATH);
const db = new Database(dbPath);

console.log(`🔄 Migration de la base de données : ${dbPath}`);

try {
    // Ajout de la colonne highest_price
    // ATTENTION: La table s'appelle 'position' (singulier) et non 'positions'
    db.prepare("ALTER TABLE position ADD COLUMN highest_price REAL").run();
    console.log('✅ Colonne highest_price ajoutée avec succès.');
    
    // Initialisation des valeurs existantes
    db.prepare("UPDATE position SET highest_price = buy_price WHERE highest_price IS NULL").run();
    console.log('✅ Valeurs highest_price initialisées.');
    
} catch (error) {
    if (error.message.includes('duplicate column name')) {
        console.log('ℹ️ La colonne existe déjà.');
    } else {
        console.error('❌ Erreur migration:', error);
    }
}