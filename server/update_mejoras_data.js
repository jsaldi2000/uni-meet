const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '../database/meetings_v2.db');
const db = new Database(dbPath);

const meetingId = 1;
const fieldId = 26;

const tableData = [
    {
        "Acción de mejora": "Buscar e incorporar ejercicios resueltos",
        "Responsable": "Rubén Tino Ramos",
        "Fecha Inicio": "2025-07-01",
        "Fecha Fin": "2027-01-30",
        "Acciónes realizadas": "Se han incorporado ejercicios resueltos en las diapositivas de clase.",
        "Estado acciones": "En proceso"
    },
    {
        "Acción de mejora": "Incorporar vídeos explicativos para mejorar el aprendizaje visual del alumnado.",
        "Responsable": "Rubén Tino Ramos",
        "Fecha Inicio": "2025-07-01",
        "Fecha Fin": "2027-01-30",
        "Acciónes realizadas": "Se ha comenzado a incorporar vídeos explicativos de la materia, añadiendo algún ejemplo inicial",
        "Estado acciones": "En proceso"
    },
    {
        "Acción de mejora": "Incorporar una actividad de preguntas y respuestas en Vevox para cada tema de la asignatura",
        "Responsable": "Rubén Tino Ramos",
        "Fecha Inicio": "2025-07-01",
        "Fecha Fin": "2027-01-30",
        "Acciónes realizadas": "Se han empezado a incorporar preguntas y respuestas en Vevox, elaborando de momento una por cada unidad",
        "Estado acciones": "No iniciado"
    }
];

try {
    const jsonValue = JSON.stringify(tableData);
    const result = db.prepare(`
        INSERT INTO ValorCampo (instancia_id, campo_id, valor_texto)
        VALUES (?, ?, ?)
        ON CONFLICT(instancia_id, campo_id) DO UPDATE SET
        valor_texto = excluded.valor_texto
    `).run(meetingId, fieldId, jsonValue);

    console.log('Update result:', result);
    console.log('Data successfully incorporated into "Plan de Mejora de la materia".');
} catch (error) {
    console.error('Error updating table data:', error);
} finally {
    db.close();
}
