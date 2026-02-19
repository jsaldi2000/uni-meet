
const db = require('./database');

try {
    console.log('Creating table SeguimientoEntrada...');
    db.exec(`
        CREATE TABLE IF NOT EXISTS SeguimientoEntrada (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            lista_id INTEGER NOT NULL,
            instancia_id INTEGER NOT NULL,
            contenido TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            usuario_id INTEGER,
            FOREIGN KEY(lista_id) REFERENCES SeguimientoLista(id) ON DELETE CASCADE,
            FOREIGN KEY(instancia_id) REFERENCES ReunionInstancia(id) ON DELETE CASCADE
        );
    `);
    console.log('Table SeguimientoEntrada created successfully.');

    // Index for performance
    console.log('Creating indexes...');
    db.exec(`CREATE INDEX IF NOT EXISTS idx_seguimiento_entrada_lista ON SeguimientoEntrada(lista_id);`);
    db.exec(`CREATE INDEX IF NOT EXISTS idx_seguimiento_entrada_instancia ON SeguimientoEntrada(instancia_id);`);
    console.log('Indexes created.');

} catch (err) {
    console.error('Error migrating SeguimientoEntrada:', err);
}
