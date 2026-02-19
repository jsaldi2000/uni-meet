const db = require('./database');
const fs = require('fs');
const path = require('path');

try {
    const adjuntos = db.prepare('SELECT * FROM Adjunto').all();
    console.log('--- TABLA ADJUNTO ---');
    adjuntos.forEach(a => {
        const fullPath = path.join(__dirname, '../attachments', a.ruta_archivo);
        const exists = fs.existsSync(fullPath);
        console.log(`ID: ${a.id}`);
        console.log(`Nombre DB: ${a.nombre_archivo}`);
        console.log(`Ruta DB: ${a.ruta_archivo}`);
        console.log(`¿Existe? ${exists ? 'SÍ' : 'NO'}`);
        if (!exists) {
            // Check for common encoding issues
            const parts = a.ruta_archivo.split('/');
            const lastPart = parts[parts.length - 1];
            const doubleEncoded = Buffer.from(lastPart, 'utf8').toString('binary');
            console.log(`  - Posible double-encoded: ${doubleEncoded}`);
        }
        console.log('---');
    });
} catch (e) {
    console.error('Error:', e.message);
}
