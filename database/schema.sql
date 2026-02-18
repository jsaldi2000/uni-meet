-- Database Schema for Meeting Management System
-- Enforce foreign keys
PRAGMA foreign_keys = ON;

-- 1. Plantilla: Stores meeting templates
CREATE TABLE IF NOT EXISTS Plantilla (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    activo BOOLEAN DEFAULT 1,
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- 2. CampoPlantilla: Defines dynamic fields for a template
CREATE TABLE IF NOT EXISTS CampoPlantilla (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plantilla_id INTEGER NOT NULL,
    nombre TEXT NOT NULL,
    -- Tipo: texto_corto, texto_largo, booleano, fecha, fecha_hora, numero, seccion, tabla
    tipo TEXT NOT NULL CHECK(tipo IN ('texto_corto', 'texto_largo', 'booleano', 'fecha', 'fecha_hora', 'numero', 'seccion', 'tabla', 'adjunto')),
    orden INTEGER NOT NULL,
    requerido BOOLEAN DEFAULT 0,
    opciones TEXT, -- JSON array for select options (future proofing) or null
    FOREIGN KEY (plantilla_id) REFERENCES Plantilla(id) ON DELETE CASCADE
);

-- 3. ReunionInstancia: An instance of a meeting based on a template
CREATE TABLE IF NOT EXISTS ReunionInstancia (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    plantilla_id INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    subtitulo TEXT,
    estado TEXT DEFAULT 'borrador' CHECK(estado IN ('borrador', 'finalizada')),
    fecha_reunion DATETIME DEFAULT CURRENT_TIMESTAMP, -- Official meeting date/time
    fecha_creacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (plantilla_id) REFERENCES Plantilla(id) ON DELETE CASCADE
);

-- 4. ValorCampo: Stores values for fields in a meeting instance
-- Using EAV-like structure but with typed columns for better SQLite affinity
CREATE TABLE IF NOT EXISTS ValorCampo (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instancia_id INTEGER NOT NULL,
    campo_id INTEGER NOT NULL,
    valor_texto TEXT, -- Used for texto_corto and texto_largo (HTML)
    valor_numero REAL, -- Used for numero
    valor_booleano BOOLEAN, -- Used for booleano
    valor_fecha DATETIME, -- Used for fecha and fecha_hora
    FOREIGN KEY (instancia_id) REFERENCES ReunionInstancia(id) ON DELETE CASCADE,
    FOREIGN KEY (campo_id) REFERENCES CampoPlantilla(id) ON DELETE CASCADE,
    UNIQUE(instancia_id, campo_id) -- Ensure only one value per field per instance
);

-- 5. Adjunto: Metadata for file attachments
CREATE TABLE IF NOT EXISTS Adjunto (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    instancia_id INTEGER NOT NULL,
    nombre_archivo TEXT NOT NULL, -- Original filename
    ruta_archivo TEXT NOT NULL, -- Relative path: /attachments/[TemplateTitle]/[InstanceTitle]/...
    tipo_mime TEXT,
    tamano_bytes INTEGER,
    fecha_subida DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (instancia_id) REFERENCES ReunionInstancia(id) ON DELETE CASCADE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_campoplantilla_plantilla ON CampoPlantilla(plantilla_id);
CREATE INDEX IF NOT EXISTS idx_reunioninstancia_plantilla ON ReunionInstancia(plantilla_id);
CREATE INDEX IF NOT EXISTS idx_valorcampo_instancia ON ValorCampo(instancia_id);
CREATE INDEX IF NOT EXISTS idx_adjunto_instancia ON Adjunto(instancia_id);
