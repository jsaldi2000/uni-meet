const express = require('express');
const router = express.Router();
const db = require('../database');
const xss = require('xss');

// GET all meetings (optional: filter by template_id)
router.get('/', (req, res) => {
    try {
        const { plantilla_id } = req.query;
        let query = 'SELECT ri.*, p.titulo as plantilla_titulo FROM ReunionInstancia ri JOIN Plantilla p ON ri.plantilla_id = p.id';
        const params = [];

        if (plantilla_id) {
            query += ' WHERE ri.plantilla_id = ?';
            params.push(plantilla_id);
        }

        query += ' ORDER BY ri.fecha_actualizacion DESC';
        const meetings = db.prepare(query).all(...params);
        res.json(meetings);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET one meeting with values
router.get('/:id', (req, res) => {
    try {
        const meeting = db.prepare('SELECT * FROM ReunionInstancia WHERE id = ?').get(req.params.id);
        if (!meeting) return res.status(404).json({ error: 'Meeting not found' });

        const values = db.prepare('SELECT * FROM ValorCampo WHERE instancia_id = ?').all(req.params.id);
        const attachments = db.prepare('SELECT * FROM Adjunto WHERE instancia_id = ?').all(req.params.id);

        res.json({ ...meeting, values, attachments });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create meeting (Initialization)
router.post('/', (req, res) => {
    const { plantilla_id, titulo, subtitulo } = req.body;

    if (!plantilla_id || !titulo) return res.status(400).json({ error: 'Template ID and Title are required' });

    try {
        const result = db.prepare('INSERT INTO ReunionInstancia (plantilla_id, titulo, subtitulo, fecha_reunion) VALUES (?, ?, ?, CURRENT_TIMESTAMP)').run(plantilla_id, titulo, subtitulo || '');
        res.status(201).json({ id: result.lastInsertRowid, message: 'Meeting created' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST duplicate meeting
router.post('/:id/duplicate', (req, res) => {
    const meetingId = req.params.id;

    const duplicateTransaction = db.transaction(() => {
        // 1. Get original meeting
        const original = db.prepare('SELECT * FROM ReunionInstancia WHERE id = ?').get(meetingId);
        if (!original) throw new Error('Meeting not found');

        // 2. Create new instance
        const newTitle = `Copy of ${original.titulo}`;
        const result = db.prepare('INSERT INTO ReunionInstancia (plantilla_id, titulo, subtitulo, fecha_reunion) VALUES (?, ?, ?, CURRENT_TIMESTAMP)')
            .run(original.plantilla_id, newTitle, original.subtitulo || '');
        const newMeetingId = result.lastInsertRowid;

        // 3. Copy values
        const values = db.prepare('SELECT * FROM ValorCampo WHERE instancia_id = ?').all(meetingId);
        const insertValue = db.prepare(`
            INSERT INTO ValorCampo (instancia_id, campo_id, valor_texto, valor_numero, valor_booleano, valor_fecha)
            VALUES (?, ?, ?, ?, ?, ?)
        `);

        values.forEach(val => {
            insertValue.run(
                newMeetingId,
                val.campo_id,
                val.valor_texto,
                val.valor_numero,
                val.valor_booleano,
                val.valor_fecha
            );
        });

        return newMeetingId;
    });

    try {
        const newId = duplicateTransaction();
        res.status(201).json({ id: newId, message: 'Meeting duplicated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update meeting (Save values)
router.put('/:id', (req, res, next) => {
    const { titulo, subtitulo, estado, fecha_reunion, valores } = req.body;
    const meetingId = req.params.id;

    try {
        const saveMeeting = db.transaction(() => {
            // 1. Update Instance Metadata
            db.prepare('UPDATE ReunionInstancia SET titulo = ?, subtitulo = ?, estado = ?, fecha_reunion = ?, fecha_actualizacion = CURRENT_TIMESTAMP WHERE id = ?')
                .run(titulo, subtitulo, estado || 'borrador', fecha_reunion, meetingId);

            // 2. Save Field Values
            if (valores && Array.isArray(valores)) {
                const upsertValue = db.prepare(`
                    INSERT INTO ValorCampo (instancia_id, campo_id, valor_texto, valor_numero, valor_booleano, valor_fecha)
                    VALUES (?, ?, ?, ?, ?, ?)
                    ON CONFLICT(instancia_id, campo_id) DO UPDATE SET
                    valor_texto = excluded.valor_texto,
                    valor_numero = excluded.valor_numero,
                    valor_booleano = excluded.valor_booleano,
                    valor_fecha = excluded.valor_fecha
                `);

                valores.forEach(val => {
                    const safeText = val.valor_texto ? xss(val.valor_texto) : null;
                    upsertValue.run(
                        meetingId,
                        val.campo_id,
                        safeText,
                        val.valor_numero || null,
                        val.valor_booleano ? 1 : (val.valor_booleano === false ? 0 : null),
                        val.valor_fecha || null
                    );
                });
            }
        });

        saveMeeting();
        res.json({ message: 'Meeting saved' });
    } catch (error) {
        next(error);
    }
});

// DELETE meeting
router.delete('/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM ReunionInstancia WHERE id = ?').run(req.params.id);
        res.json({ message: 'Meeting deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
