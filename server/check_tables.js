const db = require('./database');
const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
console.log(JSON.stringify(tables));
// Check SeguimientoLista
try {
    const lista = db.prepare('SELECT * FROM SeguimientoLista LIMIT 3').all();
    console.log('SeguimientoLista:', JSON.stringify(lista));
} catch (e) { console.log('SeguimientoLista error:', e.message); }
// Check plantilla table name
try {
    const p = db.prepare('SELECT * FROM Plantilla LIMIT 1').all();
    console.log('Plantilla ok:', JSON.stringify(p));
} catch (e) {
    console.log('Plantilla error:', e.message);
    // Try alternate names
    try { console.log('plantilla:', JSON.stringify(db.prepare('SELECT * FROM plantilla LIMIT 1').all())); } catch (e2) { }
    try { console.log('template:', JSON.stringify(db.prepare('SELECT * FROM Template LIMIT 1').all())); } catch (e2) { }
}
