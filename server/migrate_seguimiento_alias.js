const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../database/meetings_v2.db'));

try {
    db.exec(`ALTER TABLE SeguimientoCampo ADD COLUMN alias TEXT;`);
    console.log('Column alias added to SeguimientoCampo.');
} catch (e) {
    if (e.message.includes('duplicate column')) {
        console.log('Column alias already exists in SeguimientoCampo.');
    } else {
        console.error('Error adding column:', e);
    }
}

db.close();
