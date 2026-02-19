const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/meetings_v2.db');
const db = new Database(dbPath);

try {
    const adjuntos = db.prepare('SELECT * FROM Adjunto').all();
    const adjuntoMap = {}; // instancia_id -> [adjuntos]
    adjuntos.forEach(a => {
        if (!adjuntoMap[a.instancia_id]) adjuntoMap[a.instancia_id] = [];
        adjuntoMap[a.instancia_id].push({
            id: a.id,
            path: a.ruta_archivo,
            name: a.nombre_archivo,
            originalName: a.nombre_archivo
        });
    });

    const instances = db.prepare('SELECT id FROM ReunionInstancia').all();
    console.log(`Syncing metadata for ${instances.length} meeting instances...`);

    const updateStmt = db.prepare('UPDATE ValorCampo SET valor_texto = ? WHERE instancia_id = ? AND (valor_texto LIKE \'[{"path":%\' OR valor_texto LIKE \'attachments/%\')');

    for (const r of instances) {
        const instanceAdjuntos = adjuntoMap[r.id] || [];
        if (instanceAdjuntos.length > 0) {
            const newVal = JSON.stringify(instanceAdjuntos);
            updateStmt.run(newVal, r.id);
            console.log(`  [Synced] Instance ID ${r.id}`);
        }
    }
    console.log('Sync complete.');
} catch (e) {
    console.error('Error Syncing:', e);
} finally {
    db.close();
}
