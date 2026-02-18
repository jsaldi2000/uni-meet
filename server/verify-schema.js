
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/meetings_v2.db');
const db = new Database(dbPath, { verbose: console.log });

try {
    const table = db.prepare("SELECT sql FROM sqlite_master WHERE type='table' AND name='CampoPlantilla'").get();
    console.log('--- SCHEMA ---');
    console.log(table ? table.sql : 'TABLE NOT FOUND');
    console.log('--------------');

    if (table) {
        console.log('Attempting to check constraints...');
        try {
            // Check if we can insert 'tabla'
            // We use a transaction that we roll back immediately just to test the constraint
            const test = db.transaction(() => {
                db.prepare(`
                    INSERT INTO CampoPlantilla (plantilla_id, nombre, tipo, orden, requerido, opciones)
                    VALUES (1, 'Test Table', 'tabla', 999, 0, '[]')
                `).run();
                console.log('Insert successful (Constraint passed)!');
                throw new Error('ROLLBACK_TEST'); // Rollback
            });
            test();
        } catch (e) {
            if (e.message !== 'ROLLBACK_TEST') {
                console.error('INSERT FAILED:', e.message);
            }
        }
    }

} catch (error) {
    console.error('VERIFICATION ERROR:', error.message);
} finally {
    db.close();
}
