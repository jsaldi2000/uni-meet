const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, '../database/meetings_v2.db');
const db = new Database(dbPath);

const meetingId = 2; // Álgebra

// Field IDs based on investigation:
// 9: Código (numero)
// 11: Semestre (texto_corto)
// 12: Profesor (texto_corto)
// 13: Coordinador (texto_corto)
// 15: La guía de aprendizaje está colgada... (booleano)
// 16: La guía de aprendizaje con plan de trabajo... (booleano)
// 17: La guía de aprendizaje web y del campus virtual... (booleano)
// 18: Se han celebrado reuniones de coordinación... (booleano)
// 19: Las actas de las reuniones de coordinación... (booleano)
// 20: Las actividades evaluables están calificadas... (booleano)
// 21: Se aplica feedback formativo... (booleano)
// 22: Evidencias de feedback formativo... (booleano)
// 23: Se han alcanzado los resultados de aprendizaje... (booleano)
// 24: Las actividades evaluables están alineadas... (booleano)
// 25: La metodología docente y las actividades... (booleano)
// 34: Indica qué dificultades has encontrado... (texto_largo)
// 26: Plan de Mejora de la materia (tabla)

const importData = [
    { id: 11, val: "S2", type: "texto" },
    { id: 12, val: "RUBEN TINO RAMOS", type: "texto" },
    { id: 13, val: "Rubén Tino Ramos", type: "texto" },
    { id: 15, val: 1, type: "booleano" },
    { id: 16, val: 1, type: "booleano" },
    { id: 17, val: 1, type: "booleano" },
    { id: 18, val: 0, type: "booleano", comment: "Soy el único docente de la asignatura." },
    { id: 19, val: 0, type: "booleano", comment: "Soy el único docente de la asignatura." },
    { id: 20, val: 1, type: "booleano", comment: "Sí, todas" },
    { id: 21, val: 1, type: "booleano" },
    { id: 22, val: 1, type: "booleano" },
    { id: 23, val: 1, type: "booleano", comment: "Sí, todos" },
    { id: 24, val: 1, type: "booleano" },
    { id: 25, val: 1, type: "booleano" },
    { id: 34, val: "Temario muy amplio y de nivel elevado. Se ha intentado explicar con ejemplos para que no sea tan abstracto.", type: "texto" },
    {
        id: 26, val: JSON.stringify([
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
        ]), type: "texto"
    }
];

const upsertValue = db.prepare(`
    INSERT INTO ValorCampo (instancia_id, campo_id, valor_texto, valor_booleano)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(instancia_id, campo_id) DO UPDATE SET
    valor_texto = excluded.valor_texto,
    valor_booleano = excluded.valor_booleano
`);

db.transaction(() => {
    for (const data of importData) {
        upsertValue.run(
            meetingId,
            data.id,
            data.type === 'texto' ? data.val : (data.comment || null),
            data.type === 'booleano' ? data.val : null
        );
    }
})();

db.close();
console.log('Import for Álgebra completed successfully.');
