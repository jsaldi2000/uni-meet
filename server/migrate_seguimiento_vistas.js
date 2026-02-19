const db = require('./database');

try {
    console.log('Creating SeguimientoVista table...');

    db.prepare(`
        CREATE TABLE IF NOT EXISTS SeguimientoVista (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lista_id INTEGER NOT NULL,
            nombre TEXT NOT NULL,
            config_json TEXT NOT NULL,
            creado_en DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (lista_id) REFERENCES SeguimientoLista(id) ON DELETE CASCADE
        )
    `).run();

    console.log('Migration successful.');
} catch (err) {
    console.error('Migration failed:', err.message);
}
