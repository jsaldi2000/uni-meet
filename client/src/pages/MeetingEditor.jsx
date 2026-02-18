import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';
import api from '../api';
import styles from './MeetingEditor.module.css';
import TableField from '../components/TableField';

const MeetingEditor = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [meeting, setMeeting] = useState(null);
    const [template, setTemplate] = useState(null);
    const [values, setValues] = useState({});
    const [saving, setSaving] = useState(false);
    const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
    const autoSaveTimerRef = useRef(null);

    // New state for meeting date
    const [meetingDate, setMeetingDate] = useState('');
    const [showPreviews, setShowPreviews] = useState({});
    const [zoomedImages, setZoomedImages] = useState({});

    useEffect(() => {
        fetchMeetingData();
    }, [id]);

    useEffect(() => {
        if (autoSaveEnabled && Object.keys(values).length > 0) {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
            autoSaveTimerRef.current = setTimeout(saveMeeting, 60000); // 60s auto-save
        }
        return () => clearTimeout(autoSaveTimerRef.current);
    }, [values, meetingDate, autoSaveEnabled]);

    const fetchMeetingData = async () => {
        try {
            const meetingRes = await api.get(`/meetings/${id}`);
            setMeeting(meetingRes.data);
            setMeetingDate(meetingRes.data.fecha_reunion ? meetingRes.data.fecha_reunion.split(/[ T]/)[0] : '');

            const valuesObj = {};
            meetingRes.data.values.forEach(v => {
                valuesObj[v.campo_id] = v;
            });
            setValues(valuesObj);

            const templateRes = await api.get(`/templates/${meetingRes.data.plantilla_id}`);
            setTemplate(templateRes.data);
        } catch (error) {
            console.error('Error fetching meeting data:', error);
        }
    };

    const handleValueChange = (fieldId, value, type) => {
        setValues(prev => ({
            ...prev,
            [fieldId]: {
                ...prev[fieldId],
                campo_id: fieldId,
                instancia_id: parseInt(id),
                [`valor_${type}`]: value
            }
        }));
    };

    const saveMeeting = async () => {
        setSaving(true);
        try {
            const valuesArray = Object.values(values).map(v => ({
                campo_id: v.campo_id,
                valor_texto: v.valor_texto,
                valor_numero: v.valor_numero,
                valor_booleano: v.valor_booleano,
                valor_fecha: v.valor_fecha
            }));

            await api.put(`/meetings/${id}`, {
                titulo: meeting.titulo,
                subtitulo: meeting.subtitulo,
                estado: meeting.estado,
                fecha_reunion: meetingDate, // New field
                valores: valuesArray
            });
            console.log('Autoguardado completado');
        } catch (error) {
            console.error('Error saving meeting:', error);
        } finally {
            setSaving(false);
        }
    };

    const handleFinishAndExport = async () => {
        await saveMeeting();
        window.print();
        // Optional: Redirect after print? 
        // navigate('/meetings');
    };


    const handleFileUpload = async (files, fieldId) => {
        if (!files || files.length === 0) return;
        if (!id) {
            alert('Error: No se encuentra el ID de la reunión. Intenta guardar primero.');
            return;
        }

        const newAttachments = [];
        const fieldVal = values[fieldId] || { valor_texto: '[]' };
        let currentArray = [];
        try {
            currentArray = JSON.parse(fieldVal.valor_texto || '[]');
            if (!Array.isArray(currentArray)) currentArray = [];
        } catch (e) {
            currentArray = [];
        }

        for (const file of files) {
            const formData = new FormData();
            formData.append('instancia_id', id);
            formData.append('archivo', file);

            try {
                const res = await api.post('/attachments', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });

                newAttachments.push({
                    path: res.data.file.path.replace(/^.*attachments[\\/]/, '').replace(/\\/g, '/'),
                    name: res.data.file.originalname,
                    id: res.data.id,
                    originalName: res.data.file.originalname
                });
            } catch (error) {
                console.error('Error uploading:', error);
                alert(`Error al subir ${file.name}`);
            }
        }

        if (newAttachments.length > 0) {
            const updatedArray = [...currentArray, ...newAttachments];
            handleValueChange(fieldId, JSON.stringify(updatedArray), 'texto');
        }
    };

    const togglePreview = (fieldId) => {
        setShowPreviews(prev => ({
            ...prev,
            [fieldId]: !prev[fieldId]
        }));
    };

    const toggleZoom = (fieldId) => {
        setZoomedImages(prev => ({
            ...prev,
            [fieldId]: !prev[fieldId]
        }));
    };

    if (!meeting || !template) return <div>Cargando...</div>;

    return (
        <div className={styles.editor}>
            {/* Institutional Logo Placeholder - Visible in Print */}
            <div className={styles.printHeader}>
                <img src="https://via.placeholder.com/150x50?text=UNIVERSITY+LOGO" alt="Logo Universidad" className={styles.logo} />
                <div className={styles.universityInfo}>
                    <h2>Universidad Autónoma</h2>
                    <p>Departamento de Coordinación de Titulaciones</p>
                </div>
            </div>

            <header className={styles.header}>
                <div style={{ flex: 1 }}>
                    <input
                        type="text"
                        className={styles.titleInput}
                        value={meeting.titulo}
                        onChange={(e) => setMeeting({ ...meeting, titulo: e.target.value })}
                    />
                    <p className={styles.subtitle}>{template.titulo}</p>
                </div>

                <div className={styles.headerActions}>
                    <input
                        type="date"
                        value={meetingDate}
                        onChange={(e) => setMeetingDate(e.target.value)}
                        className={styles.dateInputHeader}
                        title="Fecha de la reunión"
                    />

                    <div className={styles.toggleWrapper}>
                        <span className={styles.toggleLabel}>Autoguardado</span>
                        <label className={styles.switch}>
                            <input
                                type="checkbox"
                                checked={autoSaveEnabled}
                                onChange={(e) => setAutoSaveEnabled(e.target.checked)}
                            />
                            <span className={`${styles.slider} ${styles.round}`}></span>
                        </label>
                    </div>

                    <div className={styles.mainActions}>
                        <button className="btn btn-secondary" onClick={saveMeeting}>
                            {saving ? 'Guardando...' : 'Guardar'}
                        </button>
                        <button className="btn btn-primary" onClick={handleFinishAndExport}>
                            Finalizar y Exportar PDF
                        </button>
                    </div>
                </div>
            </header>

            <div className={styles.formContainer}>
                {template.fields.map(field => {
                    const val = values[field.id] || {};

                    if (field.tipo === 'seccion') {
                        return (
                            <div key={field.id} className={styles.sectionHeader}>
                                <h3>{field.nombre}</h3>
                            </div>
                        );
                    }

                    return (
                        <div key={field.id} className={styles.fieldGroup}>
                            <label className={styles.label}>{field.nombre} {!!field.requerido && '*'}</label>

                            {field.tipo === 'texto_corto' && (
                                <input
                                    type="text"
                                    className={styles.input}
                                    value={val.valor_texto || ''}
                                    onChange={(e) => handleValueChange(field.id, e.target.value, 'texto')}
                                />
                            )}

                            {field.tipo === 'tabla' && (
                                <TableField
                                    field={field}
                                    value={val.valor_texto || '[]'}
                                    onChange={(newValue) => handleValueChange(field.id, newValue, 'texto')}
                                />
                            )}

                            {field.tipo === 'texto_largo' && (
                                <div className={styles.quillWrapper}>
                                    <ReactQuill
                                        theme="snow"
                                        value={val.valor_texto || ''}
                                        onChange={(content) => handleValueChange(field.id, content, 'texto')}
                                        className={styles.quill}
                                    />
                                </div>
                            )}

                            {field.tipo === 'numero' && (
                                <input
                                    type="number"
                                    className={styles.input}
                                    value={val.valor_numero || ''}
                                    onChange={(e) => handleValueChange(field.id, parseFloat(e.target.value), 'numero')}
                                />
                            )}

                            {field.tipo === 'fecha' && (
                                <input
                                    type="date"
                                    className={styles.input}
                                    value={val.valor_fecha ? val.valor_fecha.split(' ')[0].split('T')[0] : ''}
                                    onChange={(e) => handleValueChange(field.id, e.target.value, 'fecha')}
                                />
                            )}

                            {field.tipo === 'booleano' && (
                                <div className={styles.booleanFieldWrapper}>
                                    <div className={styles.checkboxWrapper}>
                                        <input
                                            type="checkbox"
                                            checked={!!val.valor_booleano}
                                            onChange={(e) => handleValueChange(field.id, e.target.checked, 'booleano')}
                                        />
                                        <span>Sí</span>
                                    </div>
                                    <input
                                        type="text"
                                        className={styles.booleanComment}
                                        placeholder="Comentarios adicionales"
                                        value={val.valor_texto || ''}
                                        onChange={(e) => handleValueChange(field.id, e.target.value, 'texto')}
                                    />
                                </div>
                            )}

                            {field.tipo === 'adjunto' && (
                                <div
                                    className={`${styles.attachmentField} ${styles.dropZone}`}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.classList.add(styles.dropZoneActive);
                                    }}
                                    onDragLeave={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.classList.remove(styles.dropZoneActive);
                                    }}
                                    onDrop={(e) => {
                                        e.preventDefault();
                                        e.currentTarget.classList.remove(styles.dropZoneActive);
                                        handleFileUpload(e.dataTransfer.files, field.id);
                                    }}
                                    onPaste={(e) => {
                                        const items = e.clipboardData.items;
                                        const files = [];
                                        for (let i = 0; i < items.length; i++) {
                                            if (items[i].kind === 'file') {
                                                files.push(items[i].getAsFile());
                                            }
                                        }
                                        if (files.length > 0) {
                                            handleFileUpload(files, field.id);
                                        }
                                    }}
                                >
                                    {(() => {
                                        let fileList = [];
                                        try {
                                            const rawVal = val.valor_texto || '[]';
                                            const parsed = JSON.parse(rawVal);
                                            if (Array.isArray(parsed)) {
                                                fileList = parsed;
                                            } else if (parsed && typeof parsed === 'object') {
                                                // Legacy support: single object
                                                fileList = [parsed];
                                            }
                                        } catch (e) {
                                            // Handle cases that aren't JSON
                                            if (val.valor_texto) fileList = [{ path: val.valor_texto, name: 'Adjunto' }];
                                        }

                                        if (fileList.length === 0) return null;

                                        return (
                                            <div className={styles.previewContainer} style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1rem', marginBottom: '1rem' }}>
                                                {fileList.map((fileData, index) => {
                                                    const fullPath = `http://localhost:3000/attachments/${fileData.path.split('/').map(encodeURIComponent).join('/')}`;
                                                    const extension = (fileData.originalName || fileData.path || '').split('.').pop().toLowerCase();
                                                    const isImage = ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension);
                                                    const isPdf = extension === 'pdf';
                                                    const uniqueKey = `${field.id}-${index}`;
                                                    const isShowing = showPreviews[uniqueKey];
                                                    const isZoomed = zoomedImages[uniqueKey];

                                                    return (
                                                        <div key={fileData.id || index} style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', background: '#f8f9fa' }}>
                                                            <div style={{ marginBottom: '0.5rem', fontWeight: 'bold' }}>
                                                                {fileData.originalName || fileData.name || 'Archivo Adjunto'}
                                                            </div>

                                                            {isShowing && (
                                                                <div className={styles.previewWrapper}>
                                                                    {isImage && (
                                                                        <div style={{
                                                                            maxHeight: isZoomed ? 'none' : '400px',
                                                                            overflow: isZoomed ? 'auto' : 'hidden',
                                                                            border: '1px solid #ddd',
                                                                            marginBottom: '1rem',
                                                                            background: '#fff'
                                                                        }}>
                                                                            <img
                                                                                src={fullPath}
                                                                                alt="Vista Previa"
                                                                                style={{
                                                                                    maxWidth: isZoomed ? 'none' : '100%',
                                                                                    maxHeight: isZoomed ? 'none' : '400px',
                                                                                    display: 'block',
                                                                                    cursor: isZoomed ? 'zoom-out' : 'zoom-in'
                                                                                }}
                                                                                onClick={() => toggleZoom(uniqueKey)}
                                                                                onError={(e) => { e.target.style.display = 'none'; }}
                                                                            />
                                                                        </div>
                                                                    )}
                                                                    {isPdf && (
                                                                        <iframe
                                                                            src={fullPath}
                                                                            style={{ width: '100%', height: '600px', marginBottom: '1rem', border: '1px solid #ddd', background: 'white' }}
                                                                            title="Vista Previa PDF"
                                                                        />
                                                                    )}
                                                                </div>
                                                            )}

                                                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                                <button
                                                                    type="button"
                                                                    className="btn btn-sm btn-secondary"
                                                                    onClick={() => togglePreview(uniqueKey)}
                                                                >
                                                                    {isShowing ? 'Ocultar Previsualización' : 'Ver Previsualización'}
                                                                </button>
                                                                {isShowing && isImage && (
                                                                    <button
                                                                        type="button"
                                                                        className="btn btn-sm btn-outline-secondary"
                                                                        onClick={() => toggleZoom(uniqueKey)}
                                                                    >
                                                                        {isZoomed ? 'Reducir' : 'Ampliar (Zoom)'}
                                                                    </button>
                                                                )}
                                                                <a href={fullPath} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-secondary">
                                                                    Abrir / Descargar
                                                                </a>
                                                                <button
                                                                    className="btn btn-sm btn-danger"
                                                                    onClick={async () => {
                                                                        if (window.confirm('¿Seguro que quieres eliminar este archivo permanentemente?')) {
                                                                            try {
                                                                                if (fileData.id) {
                                                                                    await api.delete(`/attachments/${fileData.id}`);
                                                                                }
                                                                                const newArray = fileList.filter((_, i) => i !== index);
                                                                                handleValueChange(field.id, newArray.length > 0 ? JSON.stringify(newArray) : null, 'texto');
                                                                            } catch (error) {
                                                                                console.error('Error deleting attachment:', error);
                                                                                alert('Error al eliminar archivo físico, se quitará el enlace.');
                                                                                const newArray = fileList.filter((_, i) => i !== index);
                                                                                handleValueChange(field.id, newArray.length > 0 ? JSON.stringify(newArray) : null, 'texto');
                                                                            }
                                                                        }
                                                                    }}
                                                                >
                                                                    Eliminar
                                                                </button>
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        );
                                    })()}

                                    <div className={styles.uploadActions}>
                                        <input
                                            type="file"
                                            id={`file-${field.id}`}
                                            multiple
                                            style={{ display: 'none' }}
                                            onChange={(e) => handleFileUpload(e.target.files, field.id)}
                                        />
                                        <label
                                            htmlFor={`file-${field.id}`}
                                            className="btn btn-secondary btn-sm"
                                            style={{ cursor: 'pointer', display: 'inline-block' }}
                                        >
                                            Seleccionar archivo(s)
                                        </label>
                                        <span className={styles.uploadHint}>
                                            O arrastra archivos / pega con Ctrl+V
                                        </span>
                                    </div>
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

        </div>
    );
};

export default MeetingEditor;
