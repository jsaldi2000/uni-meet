const db = require('./database');
const fs = require('fs');
const rows = db.prepare('SELECT * FROM Adjunto ORDER BY id DESC LIMIT 10').all();
fs.writeFileSync('check_adjuntos.json', JSON.stringify(rows, null, 2));
process.exit(0);
