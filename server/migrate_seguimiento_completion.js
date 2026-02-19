
const db = require('./database');

try {
    console.log('Adding completion columns to SeguimientoEntrada...');

    // SQLite doesn't support adding multiple columns in one ALTER TABLE, 
    // and ADD COLUMN with DEFAULT/NOT NULL on existing tables can be tricky.
    // But for these, we can just add them.

    try {
        db.exec(`ALTER TABLE SeguimientoEntrada ADD COLUMN realizado INTEGER DEFAULT 0;`);
        console.log('Added column: realizado');
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('Column realizado already exists.');
        } else {
            throw e;
        }
    }

    try {
        db.exec(`ALTER TABLE SeguimientoEntrada ADD COLUMN fecha_realizado DATETIME;`);
        console.log('Added column: fecha_realizado');
    } catch (e) {
        if (e.message.includes('duplicate column name')) {
            console.log('Column fecha_realizado already exists.');
        } else {
            throw e;
        }
    }

    console.log('Migration completed successfully.');

} catch (err) {
    console.error('Error during migration:', err);
}
