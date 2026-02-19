
const Database = require('better-sqlite3');
const path = require('path');

// Ensure we point to the correct DB file based on file listing
const dbPath = path.join(__dirname, 'database', 'meetings_v2.db');
console.log('Using DB:', dbPath);
const db = new Database(dbPath);

const LIST_ID = 1;

// 1. Get current state
const getCurrent = () => {
    try {
        const rows = db.prepare('SELECT campo_id, visible, orden FROM SeguimientoCampo WHERE lista_id = ? ORDER BY orden ASC').all(LIST_ID);
        console.log('Current DB State (First 3):', rows.slice(0, 3));
        return rows;
    } catch (e) {
        console.error('Error fetching current state:', e);
        return [];
    }
};

// 2. Simulate PUT
const simulatePut = () => {
    const fields = getCurrent();
    if (fields.length === 0) {
        console.log('No fields found for list 1. Aborting.');
        return;
    }

    // Let's pretend we want to HIDE the first field
    const allFields = fields.map(f => f.campo_id);
    const visibleFields = fields.slice(1).map(f => f.campo_id); // Remove first one

    console.log(`Simulating PUT: Total ${allFields.length}, Visible ${visibleFields.length}`);
    console.log(`Hiding field: ${fields[0].campo_id}`);

    // Call the logic exactly as in the route (simulated)
    try {
        db.prepare('DELETE FROM SeguimientoCampo WHERE lista_id = ?').run(LIST_ID);

        const normalize = (arr) => new Set((arr || []).map(String));
        const visibleSet = normalize(visibleFields);
        const principalesSet = new Set();

        const insertCampo = db.prepare(`
            INSERT INTO SeguimientoCampo (lista_id, campo_id, orden, es_principal, visible, modo_visualizacion, alias) VALUES (?, ?, ?, ?, ?, ?, ?)
        `);

        allFields.forEach((campoId, idx) => {
            const idStr = String(campoId);
            const isVisible = visibleSet.has(idStr) ? 1 : 0;
            const isPrincipal = principalesSet.has(idStr) ? 1 : 0;
            const aliasValue = null;

            insertCampo.run(LIST_ID, campoId, idx, isPrincipal, isVisible, 'contenido', aliasValue);
        });

        console.log('PUT simulation complete.');
    } catch (err) {
        console.error('PUT simulation failed:', err);
    }
};

// Run
console.log('--- BEFORE ---');
getCurrent();
simulatePut();
console.log('--- AFTER ---');
const after = getCurrent();
if (after.length > 0) {
    console.log('Visible status of first field (should be 0):', after[0].visible);
}
