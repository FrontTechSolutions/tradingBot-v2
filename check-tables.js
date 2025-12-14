const Database = require('better-sqlite3');
const path = require('path');
require('dotenv').config({ path: '.env.dev' });

const dbPath = path.join(__dirname, process.env.DB_PATH);
const db = new Database(dbPath);

console.log(`📂 Base de données : ${dbPath}`);
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log('📋 Tables trouvées :', tables.map(t => t.name));
