
const db = require('./database');

try {
    console.log('Adding "orden" column to SeguimientoEntrada...');
    db.exec(`ALTER TABLE SeguimientoEntrada ADD COLUMN orden INTEGER DEFAULT 0;`);
    console.log('Column "orden" added successfully.');

    // Initialize orden with current IDs to maintain some stable initial order
    db.exec(`UPDATE SeguimientoEntrada SET orden = id;`);
    console.log('Initialized "orden" values.');

} catch (err) {
    if (err.message.includes('duplicate column name')) {
        console.log('Column "orden" already exists.');
    } else {
        console.error('Error adding "orden" column:', err);
    }
}
