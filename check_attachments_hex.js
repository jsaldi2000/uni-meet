const fs = require('fs');
const path = require('path');

function walk(dir) {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach(file => {
        const fullPath = path.join(dir, file);
        const stat = fs.statSync(fullPath);
        if (stat && stat.isDirectory()) {
            results = results.concat(walk(fullPath));
        } else {
            results.push(fullPath);
        }
    });
    return results;
}

const base = path.join(__dirname, 'attachments');
const files = walk(base);

console.log('--- ARCHIVOS EN DISCO (CON HEX SI ES NECESARIO) ---');
files.forEach(f => {
    const rel = path.relative(base, f);
    const hasNonAscii = /[^\x00-\x7F]/.test(rel);
    if (hasNonAscii) {
        const hex = Buffer.from(rel).toString('hex');
        console.log(`PATH: ${rel}`);
        console.log(` HEX: ${hex}`);
    } else {
        console.log(`PATH: ${rel}`);
    }
});
