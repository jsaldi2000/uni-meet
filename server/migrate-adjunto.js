
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/meetings_v2.db');
const db = new Database(dbPath, { verbose: console.log });

try {
    console.log('Starting migration to add "adjunto" type...');

    db.transaction(() => {
        // 1. Rename existing table
        db.prepare("ALTER TABLE CampoPlantilla RENAME TO CampoPlantilla_old").run();

        // 2. Create new table with updated CHECK constraint
        db.prepare(`
            CREATE TABLE CampoPlantilla (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                plantilla_id INTEGER NOT NULL,
                nombre TEXT NOT NULL,
                -- Tipo: texto_corto, texto_largo, booleano, fecha, fecha_hora, numero, seccion, tabla, adjunto
                tipo TEXT NOT NULL CHECK(tipo IN ('texto_corto', 'texto_largo', 'booleano', 'fecha', 'fecha_hora', 'numero', 'seccion', 'tabla', 'adjunto')),
                orden INTEGER NOT NULL,
                requerido BOOLEAN DEFAULT 0,
                opciones TEXT,
                FOREIGN KEY (plantilla_id) REFERENCES Plantilla(id) ON DELETE CASCADE
            )
        `).run();

        // 3. Copy data
        db.prepare(`
            INSERT INTO CampoPlantilla (id, plantilla_id, nombre, tipo, orden, requerido, opciones)
            SELECT id, plantilla_id, nombre, tipo, orden, requerido, opciones
            FROM CampoPlantilla_old
        `).run();

        // 4. Drop old table
        db.prepare("DROP TABLE CampoPlantilla_old").run();

        // 5. Re-create index
        db.prepare("CREATE INDEX IF NOT EXISTS idx_campoplantilla_plantilla ON CampoPlantilla(plantilla_id)").run();

    })();

    console.log('Migration successful!');

} catch (error) {
    console.error('MIGRATION ERROR:', error);
} finally {
    db.close();
}
