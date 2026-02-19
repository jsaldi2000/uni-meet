const db = require('./database');

const subjects = [
    "Desarrollo Web Front-end",
    "Desarrollo Web Back-end",
    "Desarrollo de Apps Móviles",
    "Liderazgo Emprendedor I",
    "Liderazgo Emprendedor II",
    "Coordinación Académica 2025",
    "Planificación Estratégica",
    "Gestión de Calidad (ISO 9001)",
    "Auditoría Interna de Procesos",
    "Diseño de Interfaces (UI/UX)",
    "Arquitectura de Software",
    "Bases de Datos Avanzadas",
    "Seguridad Informática",
    "Inteligencia Artificial",
    "Gestión de Proyectos Ágiles",
    "Comunicaciones en Redes",
    "Sistemas Distribuidos"
];

const telecomPlantillaId = 2;
const telecomSourceListId = 1;

try {
    // Get fields from the existing telecom list to copy them
    const fieldsToCopy = db.prepare('SELECT * FROM SeguimientoCampo WHERE lista_id = ?').all(telecomSourceListId);

    const insertList = db.prepare('INSERT INTO SeguimientoLista (nombre, plantilla_id) VALUES (?, ?)');
    const insertCampo = db.prepare('INSERT INTO SeguimientoCampo (lista_id, campo_id, orden, es_principal, visible, modo_visualizacion, alias) VALUES (?, ?, ?, ?, ?, ?, ?)');

    for (const name of subjects) {
        const result = insertList.run(name, telecomPlantillaId);
        const newListId = result.lastInsertRowid;

        for (const field of fieldsToCopy) {
            insertCampo.run(
                newListId,
                field.campo_id,
                field.orden,
                field.es_principal,
                field.visible,
                field.modo_visualizacion,
                field.alias
            );
        }
        console.log(`Created list: ${name} (ID: ${newListId})`);
    }

    console.log('Seeding complete.');
} catch (err) {
    console.error('Error seeding:', err);
}
