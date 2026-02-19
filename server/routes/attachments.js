const express = require('express');
const router = express.Router();
const db = require('../database');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Helper to strip accents and non-ASCII for safe filesystem paths
const toPlainName = (str) => {
    if (!str) return 'adjunto';
    return str
        .trim()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^\x00-\x7F]/g, '')    // Remove non-ASCII
        .replace(/[<>:"/\\|?*]/g, '_')   // Prohibited Windows chars
        .replace(/\s+/g, '_')            // Spaces to underscores
        .toLowerCase()
        .normalize('NFC');
};

const sanitizeName = toPlainName;

// Storage configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const { instancia_id } = req.body;
        if (!instancia_id) return cb(new Error('Instance ID is required'));

        try {
            const instance = db.prepare(`
                SELECT ri.titulo as instance_title, p.titulo as template_title
                FROM ReunionInstancia ri
                JOIN Plantilla p ON ri.plantilla_id = p.id
                WHERE ri.id = ?
            `).get(instancia_id);

            if (!instance) return cb(new Error('Instance not found'));

            // Standardize folder names: lowercase and NFC (Windows/Web safest)
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
        let originalName = file.originalname;
        try {
            // FIX for Multer/Busboy encoding issues on Windows
            if (/[Ã¡Ã©Ã­Ã³ÃºÃ±]/.test(originalName)) {
                originalName = Buffer.from(originalName, 'latin1').toString('utf8');
            }
        } catch (e) { }

        // Use completely plain name for disk storage
        const plain = toPlainName(originalName);
        cb(null, `${Date.now()}-${plain}`);
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
        let originalName = req.file.originalname;
        try {
            // FIX for Multer/Busboy encoding issues on Windows
            if (/[Ã¡Ã©Ã­Ã³ÃºÃ±]/.test(originalName)) {
                originalName = Buffer.from(originalName, 'latin1').toString('utf8');
            }
        } catch (e) { }

        const relativePath = path.relative(path.join(__dirname, '../../attachments'), req.file.path).replace(/\\/g, '/');

        const result = db.prepare(`
            INSERT INTO Adjunto (instancia_id, nombre_archivo, ruta_archivo, tipo_mime, tamano_bytes)
            VALUES (?, ?, ?, ?, ?)
        `).run(
            instancia_id,
            toPlainName(originalName), // Record uses plain name for 100% safety
            relativePath,             // Path is also plain ASCII
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
