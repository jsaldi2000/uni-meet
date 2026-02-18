const express = require('express');
const router = express.Router();
const db = require('../database');
const xlsx = require('xlsx');

// GET export meetings to Excel by Template
router.get('/excel/:templateId', (req, res) => {
    try {
        const { templateId } = req.params;

        // 1. Get Template & Fields
        const template = db.prepare('SELECT * FROM Plantilla WHERE id = ?').get(templateId);
        if (!template) return res.status(404).json({ error: 'Template not found' });

        const fields = db.prepare('SELECT * FROM CampoPlantilla WHERE plantilla_id = ? ORDER BY orden ASC').all(templateId);

        // 2. Get Instances & Values
        const instances = db.prepare(`
            SELECT ri.* 
            FROM ReunionInstancia ri 
            WHERE ri.plantilla_id = ? 
            ORDER BY ri.fecha_creacion DESC
        `).all(templateId);

        // 3. Transform Data
        const excelData = instances.map(inst => {
            const row = {
                'ID': inst.id,
                'Título': inst.titulo,
                'Subtítulo': inst.subtitulo,
                'Estado': inst.estado,
                'Fecha Creación': inst.fecha_creacion,
                'Última Actualización': inst.fecha_actualizacion
            };

            // Get values for this instance
            const values = db.prepare('SELECT * FROM ValorCampo WHERE instancia_id = ?').all(inst.id);
            const valuesMap = {};
            values.forEach(v => valuesMap[v.campo_id] = v);

            fields.forEach(field => {
                const val = valuesMap[field.id];
                let displayValue = '';

                if (val) {
                    if (val.valor_texto) displayValue = val.valor_texto.replace(/<[^>]*>/g, ''); // Strip HTML tag for Excel? or keep raw? Let's strip simple tags for readability.
                    else if (val.valor_numero !== null) displayValue = val.valor_numero;
                    else if (val.valor_booleano !== null) displayValue = val.valor_booleano ? 'Sí' : 'No';
                    else if (val.valor_fecha) displayValue = val.valor_fecha;
                }

                row[field.nombre] = displayValue;
            });

            return row;
        });

        // 4. Create Workbook
        const ws = xlsx.utils.json_to_sheet(excelData);
        const wb = xlsx.utils.book_new();
        xlsx.utils.book_append_sheet(wb, ws, "Meetings");

        // 5. Send Buffer
        const buf = xlsx.write(wb, { type: 'buffer', bookType: 'xlsx' });

        res.setHeader('Content-Disposition', `attachment; filename="${template.titulo.replace(/[^a-z0-9]/gi, '_')}_Update.xlsx"`);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.send(buf);

    } catch (error) {
        console.error('Export Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
