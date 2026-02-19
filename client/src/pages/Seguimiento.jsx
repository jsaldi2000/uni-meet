import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';

const Seguimiento = () => {
    const navigate = useNavigate();
    const [listas, setListas] = useState([]);
    const [plantillas, setPlantillas] = useState([]);
    const [showModal, setShowModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState(localStorage.getItem('seguimiento_view_mode') || 'grid');
    const [searchTerm, setSearchTerm] = useState(localStorage.getItem('seguimiento_search_term') || '');

    const fetchData = async () => {
        setLoading(true);
        try {
            const [listasRes, plantillasRes] = await Promise.all([
                api.get('/seguimiento'),
                api.get('/templates')
            ]);
            setListas(listasRes.data);
            setPlantillas(plantillasRes.data);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { fetchData(); }, []);

    useEffect(() => {
        localStorage.setItem('seguimiento_view_mode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        localStorage.setItem('seguimiento_search_term', searchTerm);
    }, [searchTerm]);

    const [hiddenColumns, setHiddenColumns] = useState(() => {
        const saved = localStorage.getItem('seguimiento_hidden_columns');
        return saved ? JSON.parse(saved) : [];
    });
    const [showColumnToggle, setShowColumnToggle] = useState(false);

    useEffect(() => {
        localStorage.setItem('seguimiento_hidden_columns', JSON.stringify(hiddenColumns));
    }, [hiddenColumns]);

    const isVisible = (id) => !hiddenColumns.includes(id);
    const toggleColumn = (id) => {
        setHiddenColumns(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
    };

    const handleDelete = async (id, e) => {
        e.stopPropagation();
        if (!window.confirm('¿Estás seguro de que deseas eliminar esta lista de seguimiento?')) return;
        try {
            await api.delete(`/seguimiento/${id}`);
            setListas(listas.filter(l => l.id !== id));
        } catch (err) {
            console.error(err);
        }
    };

    const filteredListas = listas.filter(l =>
        l.nombre.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="page-header">
                <div className="header-title">
                    <h1>Seguimiento</h1>
                    <p>Vistas cruzadas de datos de reuniones por plantilla.</p>
                </div>

                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Buscar lista de seguimiento..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="search-clear-btn"
                        >✕</button>
                    )}
                </div>

                <div className="header-actions">
                    <div style={{ position: 'relative' }}>
                        <button
                            className="btn btn-secondary"
                            onClick={() => setShowColumnToggle(!showColumnToggle)}
                            style={{ padding: '0.45rem 0.75rem', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                        >
                            ⚙️ Columnas
                        </button>
                        {showColumnToggle && (
                            <div style={{
                                position: 'absolute', top: '100%', right: 0, marginTop: '0.5rem',
                                background: '#fff', border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)',
                                boxShadow: '0 4px 12px rgba(0,0,0,0.1)', padding: '0.75rem', zIndex: 10,
                                minWidth: '150px'
                            }}>
                                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', cursor: 'pointer', fontSize: '0.9rem' }}>
                                    <input
                                        type="checkbox"
                                        checked={isVisible('plantilla')}
                                        onChange={() => toggleColumn('plantilla')}
                                    />
                                    Plantilla
                                </label>
                            </div>
                        )}
                    </div>

                    <div className="segmented-control">
                        <button
                            onClick={() => setViewMode('grid')}
                            className={viewMode === 'grid' ? 'active' : ''}
                            title="Vista Mosaico (Cuadrícula)"
                        >
                            🔲
                        </button>
                        <button
                            onClick={() => setViewMode('list')}
                            className={viewMode === 'list' ? 'active' : ''}
                            title="Vista Listado"
                        >
                            ≡
                        </button>
                    </div>

                    <button className="btn btn-primary" onClick={() => setShowModal(true)} style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>
                        + Nueva Lista
                    </button>
                </div>
            </div>

            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>Cargando...</div>
            ) : filteredListas.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <p>{searchTerm ? 'No se encontraron listas que coincidan con la búsqueda.' : 'No hay listas de seguimiento. ¡Crea la primera!'}</p>
                    {searchTerm && <button className="btn btn-secondary" onClick={() => setSearchTerm('')}>Limpiar búsqueda</button>}
                </div>
            ) : viewMode === 'list' ? (
                <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f1f3f5', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '1rem' }}>Nombre de la Lista</th>
                                {isVisible('plantilla') && <th style={{ padding: '1rem' }}>Plantilla</th>}
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredListas.map(lista => (
                                <tr
                                    key={lista.id}
                                    style={{ borderBottom: '1px solid #f1f3f5', cursor: 'pointer' }}
                                    onClick={() => navigate(`/seguimiento/${lista.id}`)}
                                    className="list-row-hover"
                                >
                                    <td style={{ padding: '1rem', fontWeight: 500, color: 'var(--primary-color)' }}>
                                        {lista.nombre}
                                    </td>
                                    {isVisible('plantilla') && (
                                        <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                            {lista.plantilla_nombre}
                                        </td>
                                    )}
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: '0.25rem 0.5rem', borderColor: 'var(--danger-color)', color: 'var(--danger-color)', fontSize: '0.8rem' }}
                                            onClick={(e) => handleDelete(lista.id, e)}
                                        >Eliminar</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {filteredListas.map(lista => (
                        <div
                            key={lista.id}
                            className="card"
                            style={{ cursor: 'pointer' }}
                            onClick={() => navigate(`/seguimiento/${lista.id}`)}
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                                <h3 style={{ margin: 0 }}>{lista.nombre}</h3>
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: '0.15rem 0.5rem', borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }}
                                    onClick={(e) => handleDelete(lista.id, e)}
                                    title="Eliminar"
                                >×</button>
                            </div>
                            {isVisible('plantilla') && (
                                <p style={{ color: 'var(--text-muted)', margin: '0.25rem 0 0', fontSize: '0.9rem' }}>
                                    📋 {lista.plantilla_nombre}
                                </p>
                            )}
                        </div>
                    ))}
                </div>
            )}

            {showModal && (
                <NuevaListaModal
                    plantillas={plantillas}
                    onClose={() => setShowModal(false)}
                    onSaved={() => setShowModal(false)}
                />
            )}
        </div>
    );
};

/* ── Modal ───────────────────────────────────────────────── */
const overlayStyle = {
    position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '1rem'
};
const modalStyle = {
    background: '#fff', borderRadius: '8px', width: '100%', maxWidth: '560px',
    maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.25)',
    display: 'flex', flexDirection: 'column'
};

const NuevaListaModal = ({ plantillas, onClose, onSaved }) => {
    const navigate = useNavigate();
    const [nombre, setNombre] = useState('');
    const [plantillaId, setPlantillaId] = useState('');
    const [campos, setCampos] = useState([]);
    const [camposSeleccionados, setCamposSeleccionados] = useState([]);
    const [camposPrincipales, setCamposPrincipales] = useState([]);
    // { [campoId]: 'contenido' | 'rellenado' }
    const [modos, setModos] = useState({});
    const [saving, setSaving] = useState(false);

    const loadCampos = async (pid) => {
        if (!pid) { setCampos([]); return; }
        const res = await api.get(`/templates/${pid}`);
        const allCampos = res.data.fields || [];
        setCampos(allCampos.filter(c => c.tipo !== 'seccion' && c.tipo !== 'adjunto'));
    };

    useEffect(() => { loadCampos(plantillaId); }, [plantillaId]);

    const toggleCampo = (id) => {
        setCamposSeleccionados(prev => {
            const isRemoving = prev.includes(id);
            if (isRemoving) {
                setCamposPrincipales(p => p.filter(x => x !== id));
                setModos(m => { const n = { ...m }; delete n[id]; return n; });
            } else {
                setModos(m => ({ ...m, [id]: 'contenido' }));
            }
            return isRemoving ? prev.filter(x => x !== id) : [...prev, id];
        });
    };

    const togglePrincipal = (id) => {
        setCamposPrincipales(prev => {
            if (prev.includes(id)) return prev.filter(x => x !== id);
            if (prev.length >= 2) return prev;
            setCamposSeleccionados(s => {
                if (!s.includes(id)) {
                    setModos(m => ({ ...m, [id]: 'contenido' }));
                    return [...s, id];
                }
                return s;
            });
            return [...prev, id];
        });
    };

    const setModo = (id, modo) => setModos(m => ({ ...m, [id]: modo }));

    const handleSave = async () => {
        if (!nombre.trim() || !plantillaId) return;
        setSaving(true);
        try {
            const allIds = [...new Set([...camposSeleccionados, ...camposPrincipales])];
            const res = await api.post('/seguimiento', {
                nombre: nombre.trim(),
                plantilla_id: parseInt(plantillaId),
                campo_ids: allIds,
                campos_principales: camposPrincipales,
                modos_visualizacion: modos
            });
            onSaved();
            navigate(`/seguimiento/${res.data.id}`);
        } catch (err) {
            console.error(err);
        } finally {
            setSaving(false);
        }
    };

    const inputStyle = {
        width: '100%', padding: '0.5rem 0.75rem', border: '1px solid var(--border-color)',
        borderRadius: 'var(--radius-md)', fontFamily: 'inherit', fontSize: '0.9rem',
        boxSizing: 'border-box'
    };

    return (
        <div style={overlayStyle} onClick={onClose}>
            <div style={modalStyle} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border-color)' }}>
                    <h2 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--primary-color)' }}>Nueva Lista de Seguimiento</h2>
                    <button className="btn btn-secondary" style={{ padding: '0.15rem 0.5rem' }} onClick={onClose}>×</button>
                </div>

                {/* Body */}
                <div style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.25rem', flex: 1 }}>
                    <div>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>Nombre de la lista</label>
                        <input
                            type="text"
                            value={nombre}
                            onChange={e => setNombre(e.target.value)}
                            placeholder="Ej: Seguimiento Grado Telecomunicación 2025"
                            style={inputStyle}
                        />
                    </div>

                    <div>
                        <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>Plantilla vinculada</label>
                        <select
                            value={plantillaId}
                            onChange={e => { setPlantillaId(e.target.value); setCamposSeleccionados([]); setCamposPrincipales([]); setModos({}); }}
                            style={inputStyle}
                        >
                            <option value="">— Selecciona una plantilla —</option>
                            {plantillas.map(p => (
                                <option key={p.id} value={p.id}>{p.titulo}</option>
                            ))}
                        </select>
                    </div>

                    {campos.length > 0 && (
                        <div>
                            <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                                Campos a mostrar{' '}
                                <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.82rem' }}>
                                    — ☑ incluir · ★ principal · 👁 modo
                                </span>
                            </label>
                            <div style={{ border: '1px solid var(--border-color)', borderRadius: 'var(--radius-md)', maxHeight: '280px', overflowY: 'auto' }}>
                                {campos.map(c => {
                                    const selected = camposSeleccionados.includes(c.id);
                                    const isPrincipal = camposPrincipales.includes(c.id);
                                    const canMark = camposPrincipales.length < 2 || isPrincipal;
                                    const modo = modos[c.id] || 'contenido';
                                    return (
                                        <div key={c.id} style={{
                                            display: 'flex', alignItems: 'center', gap: '0.5rem',
                                            padding: '0.45rem 0.75rem',
                                            background: isPrincipal ? '#fef9c3' : 'transparent',
                                            borderBottom: '1px solid var(--border-color)'
                                        }}>
                                            <input type="checkbox" checked={selected} onChange={() => toggleCampo(c.id)} style={{ flexShrink: 0 }} />
                                            <span style={{ flex: 1, fontSize: '0.875rem', minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={c.nombre}>{c.nombre}</span>
                                            <em style={{ fontSize: '0.72rem', color: 'var(--text-muted)', background: 'var(--background-color)', padding: '0.1rem 0.35rem', borderRadius: '3px', fontStyle: 'normal', flexShrink: 0 }}>{c.tipo}</em>

                                            {/* Mode toggle — only when selected */}
                                            {selected && (
                                                <select
                                                    value={modo}
                                                    onChange={e => setModo(c.id, e.target.value)}
                                                    style={{ fontSize: '0.75rem', padding: '0.1rem 0.3rem', border: '1px solid var(--border-color)', borderRadius: '4px', background: '#fff', flexShrink: 0 }}
                                                    title="Modo de visualización"
                                                >
                                                    <option value="contenido">Contenido</option>
                                                    <option value="rellenado">✓ Rellenado</option>
                                                </select>
                                            )}

                                            <button
                                                type="button"
                                                onClick={() => togglePrincipal(c.id)}
                                                disabled={!canMark}
                                                title={isPrincipal ? 'Quitar como principal' : 'Marcar como principal'}
                                                style={{
                                                    background: 'none', border: 'none', cursor: canMark ? 'pointer' : 'not-allowed',
                                                    color: isPrincipal ? '#f59e0b' : '#d1d5db', fontSize: '1rem',
                                                    padding: '0 0.1rem', lineHeight: 1, opacity: canMark ? 1 : 0.4, flexShrink: 0
                                                }}
                                            >★</button>
                                        </div>
                                    );
                                })}
                            </div>
                            {camposPrincipales.length > 0 && (
                                <p style={{ margin: '0.4rem 0 0', fontSize: '0.82rem', color: '#92400e', background: '#fef3c7', border: '1px solid #fde68a', borderRadius: '4px', padding: '0.25rem 0.6rem' }}>
                                    ⭐ {camposPrincipales.length}/2 campos marcados como principales
                                </p>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', padding: '1rem 1.5rem', borderTop: '1px solid var(--border-color)', background: 'var(--background-color)', borderRadius: '0 0 8px 8px' }}>
                    <button className="btn btn-secondary" onClick={onClose}>Cancelar</button>
                    <button
                        className="btn btn-primary"
                        onClick={handleSave}
                        disabled={!nombre.trim() || !plantillaId || saving}
                    >
                        {saving ? 'Guardando...' : 'Crear Lista'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default Seguimiento;
