
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, 'server/database/meetings.db');
const db = new Database(dbPath, { verbose: console.log });

try {
    const table = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='CampoPlantilla'").get();
    console.log('--- SCHEMA ---');
    console.log(table.sql);
    console.log('--------------');

    console.log('Attempting to insert a table field...');
    const stmt = db.prepare(`
        INSERT INTO CampoPlantilla (plantilla_id, nombre, tipo, orden, requerido, opciones)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    // Check if plantilla_id 1 exists
    const plantilla = db.prepare('SELECT id FROM Plantilla WHERE id = 1').get();
    const pid = plantilla ? plantilla.id : 1;
    if (!plantilla) {
        db.prepare("INSERT INTO Plantilla (id, titulo) VALUES (1, 'Test')").run();
    }

    stmt.run(pid, 'Test Table', 'tabla', 999, 0, '[]');
    console.log('Insert successful!');

} catch (error) {
    console.error('VERIFICATION ERROR:', error.message);
} finally {
    db.close();
}
