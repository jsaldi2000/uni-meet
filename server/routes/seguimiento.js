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

        // Fetch Seguimiento entries for this list
        const entradas = db.prepare(`
            SELECT * FROM SeguimientoEntrada 
            WHERE lista_id = ? 
            ORDER BY orden ASC, created_at ASC
        `).all(req.params.id);

        // Map entries by instancia_id for easier frontend consumption
        const entradasMap = {};
        const global_entradas = [];

        entradas.forEach(e => {
            if (e.instancia_id) {
                if (!entradasMap[e.instancia_id]) entradasMap[e.instancia_id] = [];
                entradasMap[e.instancia_id].push(e);
            } else {
                global_entradas.push(e);
            }
        });

        res.json({
            ...lista,
            campos,
            filas,
            seguimiento_entradas: entradasMap,
            global_entradas
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/seguimiento/:id/entrada
router.post('/:id/entrada', (req, res) => {
    try {
        const { instancia_id, contenido } = req.body;
        if (contenido === undefined || contenido === null) {
            return res.status(400).json({ error: 'Contenido es obligatorio' });
        }

        // Get max order
        const maxOrder = db.prepare(`
            SELECT MAX(orden) as max_o FROM SeguimientoEntrada 
            WHERE lista_id = ? AND (instancia_id = ? OR (instancia_id IS NULL AND ? IS NULL))
        `).get(req.params.id, instancia_id, instancia_id)?.max_o || 0;

        const result = db.prepare(`
            INSERT INTO SeguimientoEntrada (lista_id, instancia_id, contenido, realizado, orden)
            VALUES (?, ?, ?, 0, ?)
        `).run(req.params.id, instancia_id, contenido, maxOrder + 1);

        res.json({ id: result.lastInsertRowid, created_at: new Date().toISOString() });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PUT /api/seguimiento/:id/entrada/reorder
router.put('/:id/entrada/reorder', (req, res) => {
    try {
        const { ids } = req.body; // Array of entry IDs in order
        if (!Array.isArray(ids)) return res.status(400).json({ error: 'ids debe ser un array' });

        const updateOrden = db.prepare(`
            UPDATE SeguimientoEntrada SET orden = ? WHERE id = ? AND lista_id = ?
        `);

        const transaction = db.transaction((idList, listaId) => {
            idList.forEach((id, idx) => {
                updateOrden.run(idx, id, listaId);
            });
        });

        transaction(ids, req.params.id);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// PATCH /api/seguimiento/:id/entrada/:entradaId
router.patch('/:id/entrada/:entradaId', (req, res) => {
    try {
        const { realizado, contenido } = req.body;

        if (contenido !== undefined) {
            db.prepare(`
                UPDATE SeguimientoEntrada 
                SET contenido = ?
                WHERE id = ? AND lista_id = ?
            `).run(contenido, req.params.entradaId, req.params.id);
            return res.json({ success: true });
        }

        if (realizado !== undefined) {
            const fechaRealizado = realizado ? new Date().toISOString() : null;
            db.prepare(`
                UPDATE SeguimientoEntrada 
                SET realizado = ?, fecha_realizado = ? 
                WHERE id = ? AND lista_id = ?
            `).run(realizado ? 1 : 0, fechaRealizado, req.params.entradaId, req.params.id);
            return res.json({ success: true, fecha_realizado: fechaRealizado });
        }

        res.status(400).json({ error: 'Faltan datos para actualizar' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/seguimiento/:id/entrada/:entradaId
router.delete('/:id/entrada/:entradaId', (req, res) => {
    try {
        const listaId = Number(req.params.id);
        const entradaId = Number(req.params.entradaId);

        console.log(`Deleting entry ${entradaId} from list ${listaId}`);

        const result = db.prepare(`
            DELETE FROM SeguimientoEntrada 
            WHERE id = ? AND lista_id = ?
        `).run(entradaId, listaId);

        console.log(`Delete result:`, result);
        res.json({ success: true });
    } catch (err) {
        console.error('Delete error:', err);
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
