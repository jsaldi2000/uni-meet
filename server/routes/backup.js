const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');

const DB_PATH = path.join(__dirname, '../../database/meetings_v2.db');
const BACKUPS_DIR = path.join(__dirname, '../../backups');

// Ensure backups directory exists
if (!fs.existsSync(BACKUPS_DIR)) {
    fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

// GET /api/backup/list - List existing backups
router.get('/list', (req, res) => {
    try {
        const files = fs.readdirSync(BACKUPS_DIR)
            .filter(f => f.endsWith('.back'))
            .map(f => {
                const stat = fs.statSync(path.join(BACKUPS_DIR, f));
                return {
                    name: f,
                    size: stat.size,
                    createdAt: stat.birthtime
                };
            })
            .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        res.json(files);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// POST /api/backup/create - Create a new backup
router.post('/create', (req, res) => {
    try {
        const now = new Date();
        const dd = String(now.getDate()).padStart(2, '0');
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const yy = String(now.getFullYear()).slice(2);
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');

        const dbName = path.basename(DB_PATH, '.db');
        const backupName = `${dbName}_backup${dd}${mm}${yy}_${hh}${min}.back`;
        const backupPath = path.join(BACKUPS_DIR, backupName);

        fs.copyFileSync(DB_PATH, backupPath);

        const stat = fs.statSync(backupPath);
        res.json({
            success: true,
            name: backupName,
            size: stat.size,
            createdAt: stat.birthtime
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// DELETE /api/backup/:name - Delete a backup
router.delete('/:name', (req, res) => {
    try {
        const { name } = req.params;
        // Safety: only allow .back files and no path traversal
        if (!name.endsWith('.back') || name.includes('/') || name.includes('\\')) {
            return res.status(400).json({ error: 'Nombre de archivo no válido' });
        }
        const filePath = path.join(BACKUPS_DIR, name);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'Archivo no encontrado' });
        }
        fs.unlinkSync(filePath);
        res.json({ success: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;
