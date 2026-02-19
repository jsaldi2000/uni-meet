const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../database/meetings_v2.db'));

db.exec(`
CREATE TABLE IF NOT EXISTS SeguimientoLista (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    plantilla_id INTEGER NOT NULL REFERENCES Plantilla(id) ON DELETE CASCADE,
    campo_principal_id INTEGER REFERENCES CampoPlantilla(id),
    creado_en DATETIME DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS SeguimientoCampo (
    lista_id INTEGER NOT NULL REFERENCES SeguimientoLista(id) ON DELETE CASCADE,
    campo_id INTEGER NOT NULL REFERENCES CampoPlantilla(id) ON DELETE CASCADE,
    orden INTEGER DEFAULT 0,
    PRIMARY KEY (lista_id, campo_id)
);
`);

console.log('Seguimiento tables created OK');
db.close();
