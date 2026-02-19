const express = require('express');
const router = express.Router();
const db = require('../database');

// GET /api/seguimiento
router.get('/', (req, res) => {
    try {
        const listas = db.prepare(`
            SELECT sl.*, p.titulo as plantilla_nombre
            FROM SeguimientoLista sl
            JOIN Plantilla p ON p.id = sl.plantilla_id
            ORDER BY sl.creado_en DESC
        `).all();

        const result = listas.map(lista => {
            const principales = db.prepare(`
                SELECT cp.nombre FROM SeguimientoCampo sc
                JOIN CampoPlantilla cp ON cp.id = sc.campo_id
                WHERE sc.lista_id = ? AND sc.es_principal = 1
                ORDER BY sc.orden
            `).all(lista.id);
            return { ...lista, campos_principales: principales.map(c => c.nombre) };
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// GET /api/seguimiento/:id
router.get('/:id', (req, res) => {
    try {
        const lista = db.prepare(`
            SELECT sl.*, p.titulo as plantilla_nombre
            FROM SeguimientoLista sl
            JOIN Plantilla p ON p.id = sl.plantilla_id
            WHERE sl.id = ?
        `).get(req.params.id);

        if (!lista) return res.status(404).json({ error: 'No encontrado' });

        const campos = db.prepare(`
            SELECT sc.campo_id, sc.orden, sc.es_principal, sc.visible, sc.modo_visualizacion, sc.alias, cp.nombre, cp.tipo, cp.opciones
            FROM SeguimientoCampo sc
            JOIN CampoPlantilla cp ON cp.id = sc.campo_id
            WHERE sc.lista_id = ?
            ORDER BY sc.orden ASC
        `).all(req.params.id);

        const instancias = db.prepare(`
            SELECT id, titulo, fecha_reunion FROM ReunionInstancia
            WHERE plantilla_id = ?
            ORDER BY fecha_reunion DESC, id DESC
        `).all(lista.plantilla_id);

        const allCampoIds = campos.map(c => c.campo_id);

        const filas = instancias.map(instancia => {
            const valores = {};
            allCampoIds.forEach(campoId => {
                const val = db.prepare(`
                    SELECT valor_texto, valor_booleano, valor_numero
                    FROM ValorCampo WHERE instancia_id = ? AND campo_id = ?
                `).get(instancia.id, campoId);
                valores[campoId] = val || null;
            });
            return { ...instancia, valores };
        });

        res.json({ ...lista, campos, filas });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/seguimiento
router.post('/', (req, res) => {
    try {
        const { nombre, plantilla_id, campo_ids, campos_principales, modos_visualizacion, aliases } = req.body;
        if (!nombre || !plantilla_id) {
            return res.status(400).json({ error: 'Nombre y plantilla son obligatorios' });
        }

        const result = db.prepare(`
            INSERT INTO SeguimientoLista (nombre, plantilla_id) VALUES (?, ?)
        `).run(nombre, plantilla_id);

        const listaId = result.lastInsertRowid;
        const principalesSet = new Set(campos_principales || []);
        const modos = modos_visualizacion || {};
        const aliasMap = aliases || {};

        if (campo_ids && campo_ids.length > 0) {
            const insertCampo = db.prepare(`
                INSERT OR REPLACE INTO SeguimientoCampo (lista_id, campo_id, orden, es_principal, modo_visualizacion, alias)
                VALUES (?, ?, ?, ?, ?, ?)
            `);
            campo_ids.forEach((campoId, idx) => {
                const aliasValue = aliasMap[campoId] || aliasMap[String(campoId)] || null;
                insertCampo.run(listaId, campoId, idx, principalesSet.has(campoId) ? 1 : 0, modos[campoId] || 'contenido', aliasValue);
            });
            principalesSet.forEach(campoId => {
                if (!campo_ids.includes(campoId)) {
                    insertCampo.run(listaId, campoId, -1, 1, modos[campoId] || 'contenido', aliasMap[campoId] || null);
                }
            });
        }

        res.status(201).json({ id: listaId });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/seguimiento/:id
router.put('/:id', (req, res) => {
    try {
        const { nombre, campo_ids, campos_principales, modos_visualizacion, aliases } = req.body;
        console.log('PUT seguimiento body:', {
            nombre,
            aliases_keys: Object.keys(aliases || {}),
            campo_ids_count: campo_ids?.length,
            visible_fields_count: req.body.visible_fields?.length
        });

        db.prepare(`UPDATE SeguimientoLista SET nombre = ? WHERE id = ?`)
            .run(nombre, req.params.id);

        db.prepare('DELETE FROM SeguimientoCampo WHERE lista_id = ?').run(req.params.id);


        // Helper to normalize IDs to strings for Set lookups to avoid type mismatches
        const normalize = (arr) => new Set((arr || []).map(String));

        const principalesSet = normalize(campos_principales);
        const modos = modos_visualizacion || {};
        const aliasMap = aliases || {};

        if (campo_ids && campo_ids.length > 0) {
            const insertCampo = db.prepare(`
                INSERT INTO SeguimientoCampo (lista_id, campo_id, orden, es_principal, visible, modo_visualizacion, alias) VALUES (?, ?, ?, ?, ?, ?, ?)
            `);

            const { all_fields_ordered, visible_fields } = req.body;

            // Fallback for older frontend version
            const fieldsToInsert = all_fields_ordered || campo_ids;

            // If visible_fields is explicitly provided (even empty), use it. 
            // Otherwise fallback to campo_ids (legacy behavior where everything sent was visible)
            const visibleSource = visible_fields !== undefined ? visible_fields : campo_ids;
            const visibleSet = normalize(visibleSource);

            fieldsToInsert.forEach((campoId, idx) => {
                const idStr = String(campoId);
                const isVisible = visibleSet.has(idStr) ? 1 : 0;
                const isPrincipal = principalesSet.has(idStr) ? 1 : 0;
                const aliasValue = aliasMap[campoId] || aliasMap[idStr] || null;

                insertCampo.run(req.params.id, campoId, idx, isPrincipal, isVisible, modos[campoId] || 'contenido', aliasValue);
            });
        }

        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/seguimiento/:id
router.delete('/:id', (req, res) => {
    try {
        db.prepare('DELETE FROM SeguimientoLista WHERE id = ?').run(req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
