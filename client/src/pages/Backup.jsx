import React, { useState, useEffect } from 'react';
import api from '../api';
import styles from './Backup.module.css';

const Backup = () => {
    const [backups, setBackups] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [message, setMessage] = useState(null);

    const fetchBackups = async () => {
        setLoading(true);
        try {
            const res = await api.get('/backup/list');
            setBackups(res.data);
        } catch (err) {
            setMessage({ type: 'error', text: 'Error al cargar los backups.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBackups();
    }, []);

    const handleCreate = async () => {
        setCreating(true);
        setMessage(null);
        try {
            const res = await api.post('/backup/create');
            setMessage({ type: 'success', text: `✅ Backup creado: ${res.data.name}` });
            fetchBackups();
        } catch (err) {
            setMessage({ type: 'error', text: 'Error al crear el backup.' });
        } finally {
            setCreating(false);
        }
    };

    const handleDelete = async (name) => {
        if (!confirm(`¿Eliminar el backup "${name}"?`)) return;
        try {
            await api.delete(`/backup/${encodeURIComponent(name)}`);
            setMessage({ type: 'success', text: `Backup "${name}" eliminado.` });
            fetchBackups();
        } catch (err) {
            setMessage({ type: 'error', text: 'Error al eliminar el backup.' });
        }
    };

    const formatSize = (bytes) => {
        if (bytes < 1024) return `${bytes} B`;
        if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
        return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
    };

    const formatDate = (dateStr) => {
        const d = new Date(dateStr);
        return d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className={styles.page}>
            <div className={styles.header}>
                <div>
                    <h1>Copias de Seguridad</h1>
                    <p className={styles.subtitle}>Gestiona los backups manuales de la base de datos.</p>
                </div>
                <button className="btn btn-primary" onClick={handleCreate} disabled={creating}>
                    {creating ? 'Creando...' : '💾 Crear Backup Ahora'}
                </button>
            </div>

            {message && (
                <div className={`${styles.alert} ${styles[message.type]}`}>
                    {message.text}
                </div>
            )}

            <div className={styles.infoBox}>
                <strong>📁 Ubicación:</strong> Los backups se guardan en la carpeta <code>backups/</code> en la raíz del proyecto con el nombre <code>meetings_v2_backupDDMMYY_HHMM.back</code>
            </div>

            <div className={styles.tableWrapper}>
                {loading ? (
                    <p className={styles.empty}>Cargando backups...</p>
                ) : backups.length === 0 ? (
                    <p className={styles.empty}>No hay backups disponibles. Crea el primero pulsando el botón.</p>
                ) : (
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th>Archivo</th>
                                <th>Tamaño</th>
                                <th>Fecha de creación</th>
                                <th style={{ width: '80px' }}></th>
                            </tr>
                        </thead>
                        <tbody>
                            {backups.map(b => (
                                <tr key={b.name}>
                                    <td className={styles.filename}>📄 {b.name}</td>
                                    <td>{formatSize(b.size)}</td>
                                    <td>{formatDate(b.createdAt)}</td>
                                    <td>
                                        <button
                                            className={styles.deleteBtn}
                                            onClick={() => handleDelete(b.name)}
                                            title="Eliminar backup"
                                        >
                                            ×
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                )}
            </div>
        </div>
    );
};

export default Backup;
