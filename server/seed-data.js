
const Database = require('better-sqlite3');
const path = require('path');

const dbPath = path.join(__dirname, '../database/meetings_v2.db');
const db = new Database(dbPath, { verbose: console.log });

try {
    const insertTemplate = db.prepare('INSERT INTO Plantilla (titulo, descripcion) VALUES (?, ?)');
    const insertField = db.prepare(`
        INSERT INTO CampoPlantilla (plantilla_id, nombre, tipo, orden, requerido, opciones)
        VALUES (?, ?, ?, ?, ?, ?)
    `);

    db.transaction(() => {
        // Create "Reunión de Seguimiento" Template
        const info = insertTemplate.run('Reunión de Seguimiento', 'Plantilla estándar para seguimiento de proyectos');
        const templateId = info.lastInsertRowid;

        const fields = [
            { nombre: 'Información General', tipo: 'seccion', orden: 0, req: 0, ops: null },
            { nombre: 'Participantes', tipo: 'texto_largo', orden: 1, req: 1, ops: null },
            { nombre: 'Fecha Próxima', tipo: 'fecha', orden: 2, req: 0, ops: null },

            { nombre: 'Progreso', tipo: 'seccion', orden: 3, req: 0, ops: null },
            { nombre: 'Hitos Completados', tipo: 'booleano', orden: 4, req: 0, ops: null },

            { nombre: 'Detalle de Tareas', tipo: 'seccion', orden: 5, req: 0, ops: null },
            {
                nombre: 'Lista de Tareas',
                tipo: 'tabla',
                orden: 6,
                req: 0,
                ops: JSON.stringify([
                    { nombre: 'Tarea', tipo: 'texto_corto' },
                    { nombre: 'Responsable', tipo: 'texto_corto' },
                    { nombre: 'Estimación (h)', tipo: 'numero' },
                    { nombre: 'Completado', tipo: 'booleano' }
                ])
            }
        ];

        fields.forEach(f => {
            insertField.run(templateId, f.nombre, f.tipo, f.orden, f.req, f.ops);
        });

        console.log('Sample template created successfully!');
    })();

} catch (error) {
    console.error('SEED ERROR:', error);
} finally {
    db.close();
}
