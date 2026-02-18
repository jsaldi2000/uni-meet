const pdfParse = require('pdf-parse').default || require('pdf-parse');
const fs = require('fs');

const filePath = 'C:/proyectos/templates-ting/attachments/imports/9971003106 - Fundamentos de programaci\u00f3n.pdf';

async function main() {
    try {
        const buf = fs.readFileSync(filePath);
        const data = await pdfParse(buf);
        console.log(data.text);
    } catch (e) {
        console.error('ERROR:', e.message);
    }
}

main();
