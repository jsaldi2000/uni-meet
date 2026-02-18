
const Database = require('better-sqlite3');
const path = require('path');

const oldDbPath = path.join(__dirname, '../database/meetings.db');
const newDbPath = path.join(__dirname, '../database/meetings_v2.db');

console.log(`Migrating from ${oldDbPath} to ${newDbPath}`);

let oldDb, newDb;

try {
    oldDb = new Database(oldDbPath, { readonly: true });
    newDb = new Database(newDbPath);

    // 1. Get Old Template
    const oldTemplate = oldDb.prepare("SELECT * FROM Plantilla WHERE titulo LIKE '%CEA Meeting%'").get();

    if (!oldTemplate) {
        console.error('Template "CEA Meeting" not found in old database.');
        // Try listing all templates
        const allTemplates = oldDb.prepare("SELECT id, titulo FROM Plantilla").all();
        console.log('Available templates in old DB:', allTemplates);
        process.exit(1);
    }

    console.log('Found Template:', oldTemplate.titulo);

    // 2. Get Old Fields
    const oldFields = oldDb.prepare("SELECT * FROM CampoPlantilla WHERE plantilla_id = ? ORDER BY orden ASC").all(oldTemplate.id);
    console.log(`Found ${oldFields.length} fields.`);

    // 3. Insert into New DB
    const insertTemplate = newDb.prepare('INSERT INTO Plantilla (titulo, descripcion) VALUES (?, ?)');
    const insertField = newDb.prepare(`
        INSERT INTO CampoPlantilla (plantilla_id, nombre, tipo, orden, requerido, opciones)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    newDb.transaction(() => {
        const info = insertTemplate.run(oldTemplate.titulo, oldTemplate.descripcion);
        const newTemplateId = info.lastInsertRowid;
        console.log(`Created new template with ID: ${newTemplateId}`);

        oldFields.forEach(f => {
            // Check if type is valid in new schema (it should be, as old types are subset of new)
            // But 'seccion' was added recently, make sure it matches
            insertField.run(
                newTemplateId,
                f.nombre,
                f.tipo,
                f.orden,
                f.requerido,
                f.opciones
            );
        });
        console.log('Fields migrated successfully.');
    })();

} catch (error) {
    console.error('MIGRATION ERROR:', error);
} finally {
    if (oldDb) oldDb.close();
    if (newDb) newDb.close();
}
