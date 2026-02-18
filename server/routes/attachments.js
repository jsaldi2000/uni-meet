const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Helper to sanitize folder names (Allowing Unicode/UTF-8 characters while removing Windows invalid chars)
const sanitizeName = (name) => {
    return name
        .trim()
        .replace(/[<>:"/\\|?*]/g, '_') // Prohibited chars in Windows
        .replace(/\s+/g, '_')          // Spaces to underscores
        .toLowerCase();
};

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { instancia_id } = req.body;
        if (!instancia_id) return cb(new Error('Instance ID is required'));

        try {
            // Get folder structure names from DB
            const instance = db.prepare(`
                SELECT ri.titulo as instance_title, p.titulo as template_title
                FROM ReunionInstancia ri
                JOIN Plantilla p ON ri.plantilla_id = p.id
                WHERE ri.id = ?
            `).get(instancia_id);

            if (!instance) return cb(new Error('Instance not found'));

            const folderPath = path.join(
                __dirname,
                '../../attachments',
                sanitizeName(instance.template_title),
                sanitizeName(instance.instance_title)
            );

            fs.mkdirSync(folderPath, { recursive: true });
            cb(null, folderPath);
        } catch (error) {
            cb(error);
        }
    },
    filename: (req, file, cb) => {
        // Keep original name but maybe prepend timestamp to avoid executing collisions? 
        // Requirement says "metadata de archivos (nombre...)", implies logic for display.
        // We'll keep original name for simplicity but adding timestamp to be safe.
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 20 * 1024 * 1024 } // 20MB limit
});

// POST upload attachment
router.post('/', upload.single('archivo'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

    const { instancia_id } = req.body;

    try {
        const result = db.prepare(`
            INSERT INTO Adjunto (instancia_id, nombre_archivo, ruta_archivo, tipo_mime, tamano_bytes)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            instancia_id,
            req.file.originalname,
            path.relative(path.join(__dirname, '../../attachments'), req.file.path).replace(/\\/g, '/'), // Relative to attachments folder
            req.file.mimetype,
            req.file.size
        );

        res.status(201).json({ id: result.lastInsertRowid, message: 'File uploaded', file: req.file });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE attachment
router.delete('/:id', (req, res) => {
    try {
        const attachment = db.prepare('SELECT * FROM Adjunto WHERE id = ?').get(req.params.id);
        if (!attachment) return res.status(404).json({ error: 'Attachment not found' });

        // Delete from FS
        const fullPath = path.join(__dirname, '../../attachments', attachment.ruta_archivo);
        if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
        }

        // Delete from DB
        db.prepare('DELETE FROM Adjunto WHERE id = ?').run(req.params.id);

        res.json({ message: 'File deleted' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
