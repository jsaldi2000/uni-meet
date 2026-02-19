const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../database/meetings_v2.db');
const db = new Database(dbPath);
const attachmentsDir = path.join(__dirname, '../attachments');

// Helper to check if a string looks like double-encoded UTF-8 (interpreted as Latin1)
function needsFix(str) {
    if (!str) return false;
    // Check for common characters distorted by Latin1 interpretation of UTF-8
    // e.g. 'ó' (C3 B3) -> 'Ã³', 'á' -> 'Ã¡', etc.
    // In the user's case 'investigación' -> 'investigacioÌn' 
    // actually 'ó' is C3B3. In Latin1 C3 is 'Ã' and B3 is '³'. 
    // The user's 'Ì' might be another distorted sequence.
    // Needs fix if distorted OR if not normalized to NFC
    return /[\u0080-\u00FF]/.test(str) || str !== str.normalize('NFC');
}

function fixEncoding(str) {
    if (!str) return str;
    try {
        // Round trip: convert back to buffer using latin1, then read as utf8
        // AND normalize to NFC (Windows standard)
        return Buffer.from(str, 'latin1').toString('utf8').normalize('NFC');
    } catch (e) {
        return str;
    }
}

try {
    const adjuntos = db.prepare('SELECT * FROM Adjunto').all();
    console.log(`Found ${adjuntos.length} attachments to check.`);

    let fixedCount = 0;

    for (const adjunto of adjuntos) {
        if (needsFix(adjunto.nombre_archivo) || needsFix(adjunto.ruta_archivo)) {
            const oldName = adjunto.nombre_archivo;
            const newName = fixEncoding(oldName);
            const oldPathRel = adjunto.ruta_archivo;
            const newPathRel = fixEncoding(oldPathRel);

            if (oldName === newName && oldPathRel === newPathRel) continue;

            console.log(`Fixing: "${oldName}" -> "${newName}"`);

            const oldFullPath = path.join(attachmentsDir, oldPathRel);
            const newFullPath = path.join(attachmentsDir, newPathRel);

            // Ensure directory exists for new path
            fs.mkdirSync(path.dirname(newFullPath), { recursive: true });

            // 1. Rename on disk if it exists
            if (fs.existsSync(oldFullPath)) {
                try {
                    fs.renameSync(oldFullPath, newFullPath);
                    console.log(`  [Disk] Renamed successfully.`);
                } catch (e) {
                    console.error(`  [Disk] Error renaming: ${e.message}`);
                    continue; // Skip DB update if disk rename failed
                }
            } else {
                console.warn(`  [Disk] Original file not found at ${oldFullPath}. Checking if already fixed...`);
                if (!fs.existsSync(newFullPath)) {
                    console.error(`  [Disk] Could not find file at either old or new path. Skipping.`);
                    continue;
                }
            }

            // 2. Update DB
            try {
                db.prepare('UPDATE Adjunto SET nombre_archivo = ?, ruta_archivo = ? WHERE id = ?')
                    .run(newName, newPathRel, adjunto.id);
                console.log(`  [DB] Updated record ${adjunto.id}.`);
                fixedCount++;
            } catch (e) {
                console.error(`  [DB] Error updating record ${adjunto.id}: ${e.message}`);
            }
        }
    }

    console.log(`\nMigration complete. Fixed ${fixedCount} records.`);

} catch (error) {
    console.error('Migration failed:', error);
} finally {
    db.close();
}
