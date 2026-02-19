const db = require('./server/database');
const fs = require('fs');
const path = require('path');

const reuniones = db.prepare('SELECT id, titulo, valores FROM reuniones').all();
const attachmentsBase = path.join(__dirname, 'attachments');

console.log('--- REVISIÓN DE ADJUNTOS ---');
reuniones.forEach(r => {
    let valores;
    try {
        valores = JSON.parse(r.valores);
    } catch (e) { return; }

    Object.keys(valores).forEach(k => {
        const field = valores[k];
        if (field && field.valor_texto && field.valor_texto.includes('attachments/')) {
            const relPath = field.valor_texto;
            const fullPath = path.join(__dirname, relPath);
            const exists = fs.existsSync(fullPath);

            console.log(`Reunión: ${r.titulo}`);
            console.log(`URL en DB: ${relPath}`);
            console.log(`¿Existe en disco? ${exists ? 'SÍ' : 'NO'}`);
            if (!exists) {
                // Try to see if it exists with different normalization
                const nfc = relPath.normalize('NFC');
                const nfd = relPath.normalize('NFD');
                if (fs.existsSync(path.join(__dirname, nfc))) console.log(`  -> Existe como NFC`);
                if (fs.existsSync(path.join(__dirname, nfd))) console.log(`  -> Existe como NFD`);
            }
            console.log('---');
        }
    });
});
