const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

const dbPath = path.join(__dirname, '../database/meetings_v2.db');
const db = new Database(dbPath);
const attachmentsDir = path.join(__dirname, '../attachments');

function fixEncoding(str) {
    if (!str) return str;
    // If it looks like double-encoded UTF-8 (interpreted as Latin1)
    // Common pattern: Ã followed by another char in 80-BF range
    if (/Ã[\u0080-\u00BF]/.test(str)) {
        try {
            return Buffer.from(str, 'latin1').toString('utf8').normalize('NFC');
        } catch (e) {
            return str.normalize('NFC');
        }
    }
    return str.normalize('NFC');
}

function sanitizeForPath(name) {
    return name
        .trim()
        .replace(/[<>:"/\\|?*]/g, '_')
        .replace(/\s+/g, '_')
        .toLowerCase()
        .normalize('NFC');
}

// Map of mangled fragments to correct ones (Heuristic)
const fixMap = {
    'telecomunicacin': 'telecomunicación',
    'telecomunicacin': 'telecomunicación',
    'lgebra': 'álgebra',
    'lgebra': 'álgebra',
    'clculo': 'cálculo',
    'clculo': 'cálculo',
    'programacin': 'programación',
    'programacin': 'programación',
    'tica': 'ética',
    'tica': 'ética',
    'informtica': 'informática',
    'informacin': 'información',
    'optimizacin': 'optimización',
    'optimizacin': 'optimización',
    'teora': 'teoría',
    'teora': 'teoría',
    'sesin': 'sesión',
    'sesin': 'sesión',
    'investigacin': 'investigación',
    'investigacin': 'investigación',
    'formacin': 'formación',
    'formacin': 'formación',
    'legislacin': 'legislación',
    'legislacin': 'legislación',
    'pticas': 'ópticas',
    'pticas': 'ópticas'
};

function heuristicFix(str) {
    let fixed = str;
    Object.keys(fixMap).forEach(mangled => {
        // Safe regex escape
        const escaped = mangled.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(escaped, 'gi');
        fixed = fixed.replace(regex, fixMap[mangled]);
    });
    return fixed.normalize('NFC');
}

try {
    const adjuntos = db.prepare('SELECT a.*, ri.titulo as instance_title, p.titulo as template_title FROM Adjunto a JOIN ReunionInstancia ri ON a.instancia_id = ri.id JOIN Plantilla p ON ri.plantilla_id = p.id').all();

    console.log(`Checking ${adjuntos.length} attachments...`);

    for (const a of adjuntos) {
        console.log(`ID ${a.id}: ${a.ruta_archivo}`);

        // 1. Reconstruct what the path SHOULD be
        const cleanTemplate = sanitizeForPath(a.template_title);
        const cleanInstance = sanitizeForPath(a.instance_title);

        // The file name itself usually starts with a timestamp: 177...-filename.ext
        const fileNamePart = path.basename(a.ruta_archivo);
        const cleanFileName = heuristicFix(fixEncoding(fileNamePart));

        const idealPathRel = path.join(cleanTemplate, cleanInstance, cleanFileName).replace(/\\/g, '/');
        const idealFullPath = path.join(attachmentsDir, idealPathRel);

        // 2. Check if it already exists at the ideal path
        if (fs.existsSync(idealFullPath)) {
            console.log(`  [OK] Already correct at ${idealPathRel}`);
            if (a.ruta_archivo !== idealPathRel || a.nombre_archivo !== cleanFileName) {
                db.prepare('UPDATE Adjunto SET ruta_archivo = ?, nombre_archivo = ? WHERE id = ?').run(idealPathRel, cleanFileName, a.id);
                console.log(`  [DB] Updated path to match existing file.`);
            }
            continue;
        }

        // 3. Try to find the file even if folders are mangled
        // Search by timestamp prefix
        const timestampMatch = fileNamePart.match(/^(\d+)-/);
        if (timestampMatch) {
            const timestamp = timestampMatch[1];
            // Find any file in attachments that starts with this timestamp
            const findCmd = `node -e "const fs = require('fs'); const path = require('path'); function walk(d) { let r = []; fs.readdirSync(d).forEach(f => { const p = path.join(d, f); if (fs.statSync(p).isDirectory()) r = r.concat(walk(p)); else if (f.startsWith('${timestamp}')) r.push(p); }); return r; }; console.log(walk('${attachmentsDir.replace(/\\/g, '\\\\')}').join('|'))"`;
            const foundPaths = require('child_process').execSync(findCmd).toString().trim().split('|').filter(Boolean);

            if (foundPaths.length > 0) {
                const actualOldPath = foundPaths[0];
                console.log(`  [FOUND] Found file at ${actualOldPath}`);

                // Rename Folders & File to Ideal
                fs.mkdirSync(path.dirname(idealFullPath), { recursive: true });
                fs.renameSync(actualOldPath, idealFullPath);
                console.log(`  [DISK] Renamed to ${idealFullPath}`);

                // Update DB
                db.prepare('UPDATE Adjunto SET ruta_archivo = ?, nombre_archivo = ? WHERE id = ?').run(idealPathRel, cleanFileName, a.id);
                console.log(`  [DB] Updated record.`);
                continue;
            }
        }

        console.log(`  [NOT FOUND] Could not find file for ID ${a.id}`);
    }

    // Cleanup empty mangled directories (optional)
    console.log('\nCleaning up metadata in valor_texto...');
    const reuniones = db.prepare('SELECT id, valores FROM reuniones').all();
    reuniones.forEach(r => {
        let valores;
        try { valores = JSON.parse(r.valores); } catch (e) { return; }
        let changed = false;
        Object.keys(valores).forEach(k => {
            if (valores[k] && valores[k].valor_texto && valores[k].valor_texto.includes('attachments/')) {
                // Here we would need to manually fix the JSON string to match the new Adjunto paths
                // But the app might generate the paths dynamically from Adjunto?
                // Let's check MeetingEditor.jsx again.
            }
        });
    });

} catch (e) {
    console.error('Error:', e);
} finally {
    db.close();
}
