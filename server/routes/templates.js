const express = require('express');
const router = express.Router();
const db = require('../database');

// GET all templates
router.get('/', (req, res) => {
    try {
        const templates = db.prepare('SELECT * FROM Plantilla ORDER BY fecha_creacion DESC').all();
        res.json(templates);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET one template with fields
router.get('/:id', (req, res) => {
    try {
        const template = db.prepare('SELECT * FROM Plantilla WHERE id = ?').get(req.params.id);
        if (!template) return res.status(404).json({ error: 'Template not found' });

        const fields = db.prepare('SELECT * FROM CampoPlantilla WHERE plantilla_id = ? ORDER BY orden ASC').all(req.params.id);
        res.json({ ...template, fields });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// POST create template
router.post('/', (req, res) => {
    const { titulo, descripcion, campos } = req.body;

    if (!titulo) return res.status(400).json({ error: 'Title is required' });

    const createTemplate = db.transaction(() => {
        const result = db.prepare('INSERT INTO Plantilla (titulo, descripcion) VALUES (?, ?)').run(titulo, descripcion);
        const templateId = result.lastInsertRowid;

        if (campos && Array.isArray(campos)) {
            const insertField = db.prepare(`
                INSERT INTO CampoPlantilla (plantilla_id, nombre, tipo, orden, requerido, opciones)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            campos.forEach((field, index) => {
                insertField.run(
                    templateId,
                    field.nombre,
                    field.tipo,
                    index, // Use index as order
                    field.requerido ? 1 : 0,
                    field.opciones ? JSON.stringify(field.opciones) : null
                );
            });
        }
        return templateId;
    });

    try {
        const id = createTemplate();
        res.status(201).json({ id, message: 'Template created' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// PUT update template
router.put('/:id', (req, res) => {
    const { titulo, descripcion, campos } = req.body;
    const templateId = req.params.id;
    console.log(`Updating template ${templateId}`, { titulo, camposLength: campos?.length });

    const updateTemplate = db.transaction(() => {
        // 1. Update Template metadata
        db.prepare('UPDATE Plantilla SET titulo = ?, descripcion = ? WHERE id = ?').run(titulo, descripcion, templateId);

        // 2. Handle Fields
        // To preserve data, we should update existing fields if they have an ID, insert new ones, and delete missing ones.

        if (campos && Array.isArray(campos)) {
            // Get current field IDs from DB
            const currentFields = db.prepare('SELECT id FROM CampoPlantilla WHERE plantilla_id = ?').all(templateId);
            const currentIds = new Set(currentFields.map(f => f.id));
            const incomingIds = new Set(campos.filter(c => c.id).map(c => c.id));

            // Delete fields that are not in the incoming list
            const toDelete = [...currentIds].filter(id => !incomingIds.has(id));
            const deleteStmt = db.prepare('DELETE FROM CampoPlantilla WHERE id = ?');
            toDelete.forEach(id => deleteStmt.run(id));

            // Upsert fields
            const updateStmt = db.prepare(`
                UPDATE CampoPlantilla SET nombre = ?, tipo = ?, orden = ?, requerido = ?, opciones = ?
                WHERE id = ?
            `);
            const insertStmt = db.prepare(`
                INSERT INTO CampoPlantilla (plantilla_id, nombre, tipo, orden, requerido, opciones)
                VALUES (?, ?, ?, ?, ?, ?)
            `);

            campos.forEach((field, index) => {
                if (field.id && currentIds.has(field.id)) {
                    updateStmt.run(
                        field.nombre,
                        field.tipo,
                        index,
                        field.requerido ? 1 : 0,
                        (typeof field.opciones === 'object' ? JSON.stringify(field.opciones) : field.opciones) || null,
                        field.id
                    );
                } else {
                    insertStmt.run(
                        templateId,
                        field.nombre,
                        field.tipo,
                        index,
                        field.requerido ? 1 : 0,
                        (typeof field.opciones === 'object' ? JSON.stringify(field.opciones) : field.opciones) || null
                    );
                }
            });
        }
    });

    try {
        updateTemplate();
        res.json({ message: 'Template updated' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE template
router.delete('/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM Plantilla WHERE id = ?').run(req.params.id);
        res.json({ message: 'Template deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
