const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../database/meetings_v2.db'));

try {
    db.exec(`ALTER TABLE SeguimientoCampo ADD COLUMN modo_visualizacion TEXT DEFAULT 'contenido';`);
    console.log('Column modo_visualizacion added.');
} catch (e) {
    if (e.message.includes('duplicate column')) console.log('Column already exists.');
    else throw e;
}
db.close();
