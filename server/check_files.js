const db = require('./database');
const rows = db.prepare("SELECT * FROM ValorCampo WHERE valor_texto LIKE '%path%' ORDER BY id DESC LIMIT 5").all();
console.log(JSON.stringify(rows, null, 2));
process.exit(0);
