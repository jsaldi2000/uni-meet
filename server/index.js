const express = require('express');
const fs = require('fs');
const path = require('path');

// Redirect console to file
const logFile = path.join(__dirname, 'server.log');
const logStream = fs.createWriteStream(logFile, { flags: 'a' });
console.log = (...args) => logStream.write(`${new Date().toISOString()} [LOG] ${args.join(' ')}\n`);
console.error = (...args) => logStream.write(`${new Date().toISOString()} [ERR] ${args.join(' ')}\n`);

const cors = require('cors');
const helmet = require('helmet');
const db = require('./database');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            "frame-ancestors": ["'self'", "http://localhost:5173", "http://127.0.0.1:5173"],
            "frame-src": ["'self'", "blob:", "data:", "http://localhost:3000", "http://127.0.0.1:3000"],
            "img-src": ["'self'", "data:", "https:", "http:", "http://localhost:3000", "http://127.0.0.1:3000"],
            "script-src": ["'self'", "'unsafe-inline'"],
            "style-src": ["'self'", "'unsafe-inline'", "https:"],
            "font-src": ["'self'", "https:", "data:"]
        }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
    frameguard: false
}));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Global request logger with status
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const logMsg = `${new Date().toISOString()} - ${req.method} ${req.url} - ${res.statusCode} (${duration}ms)\n`;
        fs.appendFileSync(logFile, logMsg);
    });
    next();
});

// Serve static files (attachments) with safe headers
const staticOptions = {
    setHeaders: (res, path) => {
        if (path.endsWith('.pdf')) {
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', 'inline');
        }
    }
};
app.use('/attachments', express.static(path.join(__dirname, '../attachments'), staticOptions));

const templatesRouter = require('./routes/templates');
const meetingsRouter = require('./routes/meetings');
const attachmentsRouter = require('./routes/attachments');
const exportRouter = require('./routes/export');
const backupRouter = require('./routes/backup');
const seguimientoRouter = require('./routes/seguimiento');

app.use('/api/templates', templatesRouter);
app.use('/api/meetings', meetingsRouter);
app.use('/api/attachments', attachmentsRouter);
app.use('/api/export', exportRouter);
app.use('/api/backup', backupRouter);
app.use('/api/seguimiento', seguimientoRouter);

// Health Check
app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date() });
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    const errorMsg = `${new Date().toISOString()} - ERROR: ${err.message}\n${err.stack}\n`;
    require('fs').appendFileSync('server.log', errorMsg);
    res.status(500).json({ error: 'Something went wrong!', message: err.message });
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
