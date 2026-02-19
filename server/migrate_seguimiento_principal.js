const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../database/meetings_v2.db'));

// Add es_principal flag to SeguimientoCampo
try {
    db.exec(`ALTER TABLE SeguimientoCampo ADD COLUMN es_principal INTEGER DEFAULT 0;`);
    console.log('Column es_principal added.');
} catch (e) {
    if (e.message.includes('duplicate column')) {
        console.log('Column already exists, skipping.');
    } else {
        throw e;
    }
}

// Migrate existing campo_principal_id references
const listas = db.prepare('SELECT id, campo_principal_id FROM SeguimientoLista WHERE campo_principal_id IS NOT NULL').all();
for (const lista of listas) {
    // Make sure the campo is in SeguimientoCampo and mark it as principal
    const exists = db.prepare('SELECT 1 FROM SeguimientoCampo WHERE lista_id=? AND campo_id=?')
        .get(lista.id, lista.campo_principal_id);
    if (exists) {
        db.prepare('UPDATE SeguimientoCampo SET es_principal=1 WHERE lista_id=? AND campo_id=?')
            .run(lista.id, lista.campo_principal_id);
    } else {
        db.prepare('INSERT OR IGNORE INTO SeguimientoCampo (lista_id, campo_id, orden, es_principal) VALUES (?,?,0,1)')
            .run(lista.id, lista.campo_principal_id);
    }
    console.log(`Migrated lista ${lista.id} campo principal ${lista.campo_principal_id}`);
}

console.log('Migration done.');
db.close();
