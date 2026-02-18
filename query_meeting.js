const Database = require('better-sqlite3');
const path = require('path');
const dbPath = path.join(__dirname, 'database/meetings_v2.db');
const db = new Database(dbPath);

const meeting = db.prepare("SELECT id, titulo, plantilla_id FROM ReunionInstancia WHERE titulo LIKE '%Cálculo I%';").get();
console.log('Meeting:', meeting);

if (meeting) {
    const fields = db.prepare("SELECT id, nombre, tipo FROM CampoPlantilla WHERE plantilla_id = ?").all(meeting.plantilla_id);
    console.log('Fields:', fields);
}
db.close();
