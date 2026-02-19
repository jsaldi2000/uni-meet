import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import styles from './SeguimientoView.module.css';

const SeguimientoView = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [editMode, setEditMode] = useState(false);
    const [allCampos, setAllCampos] = useState([]);
    const [camposSeleccionados, setCamposSeleccionados] = useState([]);
    const [camposPrincipales, setCamposPrincipales] = useState([]);
    const [modos, setModos] = useState({}); // { [campoId]: 'contenido' | 'rellenado' }
    const [localModos, setLocalModos] = useState({}); // State for real-time toggling
    const [aliases, setAliases] = useState({}); // { [campoId]: 'nickname' }
    const [editingAlias, setEditingAlias] = useState(null); // { campoId, value }
    const [saving, setSaving] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setLocalModos(modos);
    }, [modos]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/seguimiento/${id}`);
            setData(res.data);
            const campos = res.data.campos || [];
            setCamposSeleccionados(campos.map(c => c.campo_id));
            setCamposPrincipales(campos.filter(c => c.es_principal).map(c => c.campo_id));
            const modesMap = {};
            const aliasMap = {};
            campos.forEach(c => {
                modesMap[c.campo_id] = c.modo_visualizacion || 'contenido';
                if (c.alias) aliasMap[c.campo_id] = c.alias;
            });
            setModos(modesMap);
            setAliases(aliasMap);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadAllCampos = async (plantillaId) => {
        const res = await api.get(`/templates/${plantillaId}`);
        const fields = res.data.fields || [];
        setAllCampos(fields.filter(c => c.tipo !== 'seccion' && c.tipo !== 'adjunto'));
    };

    useEffect(() => { fetchData(); }, [id]);
    useEffect(() => { if (data) loadAllCampos(data.plantilla_id); }, [data?.plantilla_id]);

    const toggleCampo = (campoId) => {
        setCamposSeleccionados(prev => {
            const isRemoving = prev.includes(campoId);
            if (isRemoving) {
                setCamposPrincipales(p => p.filter(x => x !== campoId));
                setModos(m => { const n = { ...m }; delete n[campoId]; return n; });
            } else {
                setModos(m => m[campoId] ? m : { ...m, [campoId]: 'contenido' });
            }
            return isRemoving ? prev.filter(x => x !== campoId) : [...prev, campoId];
        });
    };

    const togglePrincipal = (campoId) => {
        setCamposPrincipales(prev => {
            if (prev.includes(campoId)) return prev.filter(x => x !== campoId);
            if (prev.length >= 2) return prev;
            setCamposSeleccionados(s => {
                if (!s.includes(campoId)) {
                    setModos(m => ({ ...m, [campoId]: 'contenido' }));
                    return [...s, campoId];
                }
                return s;
            });
            return [...prev, campoId];
        });
    };

    const setModo = (campoId, modo) => setModos(m => ({ ...m, [campoId]: modo }));

    const handleAliasChange = (campoId, value) => {
        setEditingAlias({ campoId, value });
    };

    const handleAliasBlur = async (campoId) => {
        if (!editingAlias) return;
        const newAlias = editingAlias.value.trim();

        // Update local state
        setAliases(prev => {
            const next = { ...prev };
            if (newAlias) next[campoId] = newAlias;
            else delete next[campoId];
            return next;
        });
        setEditingAlias(null);

        // Auto-save if not in main edit mode
        if (!editMode) {
            try {
                const allIds = [...new Set([...camposSeleccionados, ...camposPrincipales])];
                // Prepare aliases for save
                const nextAliases = { ...aliases };
                if (newAlias) nextAliases[campoId] = newAlias;
                else delete nextAliases[campoId];

                await api.put(`/seguimiento/${id}`, {
                    nombre: data.nombre,
                    campo_ids: allIds,
                    campos_principales: camposPrincipales,
                    modos_visualizacion: modos,
                    aliases: nextAliases
                });
            } catch (err) {
                console.error("Failed to save alias", err);
            }
        }
    };

    const handleAliasKeyDown = (e, campoId) => {
        if (e.key === 'Enter') {
            e.target.blur();
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const allIds = [...new Set([...camposSeleccionados, ...camposPrincipales])];
            await api.put(`/seguimiento/${id}`, {
                nombre: data.nombre,
                campo_ids: allIds,
                campos_principales: camposPrincipales,
                modos_visualizacion: modos,
                aliases: aliases
            });
            setEditMode(false);
            fetchData();
        } finally {
            setSaving(false);
        }
    };

    // Render a cell based on the field's modo_visualizacion
    const getCellValue = (valores, campo, expanded = false) => {
        const val = valores[campo.campo_id];
        // Use localModos for display, fallback to campo.modo_visualizacion
        const modo = localModos[campo.campo_id] || campo.modo_visualizacion || 'contenido';

        const contentClass = expanded ? `${styles.cellContent} ${styles.cellContentExpanded}` : styles.cellContent;

        if (modo === 'rellenado') {
            const hasContent = val && (val.valor_texto || val.valor_booleano != null || val.valor_numero != null);
            return (
                <div className={styles.cellBoolean}>
                    {hasContent ? '✅' : <span style={{ color: '#d1d5db' }}>—</span>}
                </div>
            );
        }

        // modo === 'contenido'
        if (!val) return <div className={contentClass} style={{ color: '#d1d5db' }}>—</div>;

        if (campo.tipo === 'booleano') {
            return (
                <div className={styles.cellBoolean}>
                    {val.valor_booleano ? '✅' : '❌'}
                </div>
            );
        }

        const text = val.valor_texto || (val.valor_numero != null ? String(val.valor_numero) : null);
        if (!text) return <div className={contentClass} style={{ color: '#d1d5db' }}>—</div>;

        if (campo.tipo === 'tabla') {
            try {
                const rows = JSON.parse(text || '[]');
                if (rows.length === 0) return <div className={contentClass} style={{ color: '#d1d5db' }}>—</div>;

                const cols = typeof campo.opciones === 'string'
                    ? JSON.parse(campo.opciones || '[]')
                    : (campo.opciones || []);

                if (cols.length === 0) return <div className={contentClass}>{rows.length} filas</div>;

                return (
                    <div className={`${contentClass} ${styles.cellTable}`}>
                        <table>
                            <thead>
                                <tr>
                                    {cols.map((col, idx) => (
                                        <th key={idx}>{col.nombre}</th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {rows.map((row, rIdx) => (
                                    <tr key={rIdx}>
                                        {cols.map((col, cIdx) => (
                                            <td key={cIdx}>
                                                {row[col.nombre]}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            } catch { return <div className={styles.cellContent}>Error</div>; }
        }

        if (campo.tipo === 'texto_largo') {
            return <div className={contentClass} dangerouslySetInnerHTML={{ __html: text }} />;
        }

        return <div className={contentClass}>{text}</div>;
    };

    if (loading) return <div>Cargando...</div>;
    if (!data) return <div>Lista no encontrada.</div>;

    const principales = data.campos.filter(c => c.es_principal);
    const resto = data.campos.filter(c => !c.es_principal);

    const filteredRows = data.filas.filter(fila => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();

        // Check title
        if (fila.titulo && fila.titulo.toLowerCase().includes(term)) return true;

        // Check principal fields
        for (const campoId of camposPrincipales) {
            const val = fila.valores[campoId];
            if (val) {
                const textVal = val.valor_texto ? val.valor_texto.toLowerCase() : '';
                const numVal = val.valor_numero != null ? String(val.valor_numero) : '';

                if (textVal && textVal.includes(term)) return true;
                if (numVal && numVal.includes(term)) return true;
            }
        }
        return false;
    });

    const shouldExpand = searchTerm && filteredRows.length <= 3;

    return (
        <div>
            {/* Header */}
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <div>
                        <h1>{data.nombre}</h1>
                        <p className={styles.subtitle}>
                            {data.plantilla_nombre} · {data.filas.length} instancia{data.filas.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                </div>
                <div className={styles.headerRight}>
                    <input
                        type="text"
                        placeholder="Buscar por título o campos principales..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className={styles.searchInput}
                    />
                    <button className={styles.backBtn} onClick={() => navigate('/seguimiento')}>
                        ← Volver
                    </button>
                    <button
                        className={`btn ${editMode ? 'btn-secondary' : 'btn-primary'}`}
                        onClick={() => setEditMode(!editMode)}
                    >
                        {editMode ? 'Cancelar' : '⚙️ Configurar campos'}
                    </button>
                </div>
            </div>

            {/* Edit panel */}
            {editMode && (
                <div className={styles.editPanel}>
                    <p className={styles.editLabel}>
                        Campos a mostrar{' '}
                        <span className={styles.editHint}>
                            — ☑ incluir · ★ principal · modo de visualización
                        </span>
                    </p>
                    <div className={styles.camposList}>
                        {allCampos.map(c => {
                            const selected = camposSeleccionados.includes(c.id);
                            const isPrincipal = camposPrincipales.includes(c.id);
                            const canMark = camposPrincipales.length < 2 || isPrincipal;
                            const modo = modos[c.id] || 'contenido';
                            return (
                                <div key={c.id}
                                    className={`${styles.campoItem} ${isPrincipal ? styles.campoItemPrincipal : ''}`}
                                    onClick={() => toggleCampo(c.id)}
                                >
                                    <input type="checkbox" checked={selected} readOnly style={{ flexShrink: 0 }} />
                                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.nombre}>{c.nombre}</span>
                                    <span className={styles.tipo}>{c.tipo}</span>

                                    {/* Mode selector — only when selected */}
                                    {selected && (
                                        <select
                                            value={modo}
                                            onClick={e => e.stopPropagation()}
                                            onChange={e => setModo(c.id, e.target.value)}
                                            className={styles.editSelect}
                                            style={{ padding: '0.1rem 0.3rem', fontSize: '0.75rem', width: 'auto' }}
                                        >
                                            <option value="contenido">Contenido</option>
                                            <option value="rellenado">✓ Rellenado</option>
                                        </select>
                                    )}

                                    <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); togglePrincipal(c.id); }}
                                        disabled={!canMark}
                                        className={`${styles.starBtn} ${isPrincipal ? styles.starActive : ''}`}
                                        title={isPrincipal ? 'Quitar como principal' : 'Marcar como principal'}
                                    >★</button>
                                </div>
                            );
                        })}
                    </div>
                    <div className={styles.editFooter}>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? 'Guardando...' : 'Guardar configuración'}
                        </button>
                    </div>
                </div>
            )}

            {/* Table or empty state */}
            {data.campos.length === 0 && !editMode ? (
                <div className={styles.emptyState}>
                    <p>No hay campos seleccionados. Pulsa <strong>⚙️ Configurar campos</strong> para elegir qué mostrar.</p>
                </div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.tituloTh}>Título reunión</th>
                                {principales.map(c => (
                                    <th key={c.campo_id} className={styles.principalTh}>
                                        <div className={styles.thContent}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                {c.modo_visualizacion === 'contenido' && (
                                                    <button
                                                        className={styles.toggleModeBtn}
                                                        onClick={() => setLocalModos(prev => ({
                                                            ...prev,
                                                            [c.campo_id]: prev[c.campo_id] === 'rellenado' ? 'contenido' : 'rellenado'
                                                        }))}
                                                        title={localModos[c.campo_id] === 'rellenado' ? "Cambiar a vista contenido" : "Cambiar a vista check"}
                                                    >
                                                        {localModos[c.campo_id] === 'rellenado' ? (
                                                            /* Eye Off / Check mode */
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                                                <line x1="1" y1="1" x2="23" y2="23"></line>
                                                            </svg>
                                                        ) : (
                                                            /* Eye Open / Content mode */
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                                <circle cx="12" cy="12" r="3"></circle>
                                                            </svg>
                                                        )}
                                                    </button>
                                                )}
                                                <span style={{ marginLeft: c.modo_visualizacion === 'contenido' ? '0.25rem' : '0' }}>
                                                    ⭐
                                                    {editingAlias && editingAlias.campoId === c.campo_id ? (
                                                        <input
                                                            autoFocus
                                                            type="text"
                                                            value={editingAlias.value}
                                                            onChange={e => handleAliasChange(c.campo_id, e.target.value)}
                                                            onBlur={() => handleAliasBlur(c.campo_id)}
                                                            onKeyDown={e => handleAliasKeyDown(e, c.campo_id)}
                                                            style={{
                                                                marginLeft: '0.25rem',
                                                                padding: '0 0.2rem',
                                                                border: '1px solid var(--primary-color)',
                                                                borderRadius: '2px',
                                                                fontSize: 'inherit',
                                                                fontFamily: 'inherit',
                                                                width: '100px'
                                                            }}
                                                            onClick={e => e.stopPropagation()}
                                                        />
                                                    ) : (
                                                        <span
                                                            onDoubleClick={() => setEditingAlias({ campoId: c.campo_id, value: aliases[c.campo_id] || c.nombre })}
                                                            title="Doble clic para renombrar"
                                                            style={{ cursor: 'text', marginLeft: '0.25rem' }}
                                                        >
                                                            {aliases[c.campo_id] || c.nombre}
                                                        </span>
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </th>
                                ))}
                                {resto.map(c => (
                                    <th key={c.campo_id}>
                                        <div className={styles.thContent}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                {c.modo_visualizacion === 'contenido' && (
                                                    <button
                                                        className={styles.toggleModeBtn}
                                                        onClick={() => setLocalModos(prev => ({
                                                            ...prev,
                                                            [c.campo_id]: prev[c.campo_id] === 'rellenado' ? 'contenido' : 'rellenado'
                                                        }))}
                                                        title={localModos[c.campo_id] === 'rellenado' ? "Cambiar a vista contenido" : "Cambiar a vista check"}
                                                    >
                                                        {localModos[c.campo_id] === 'rellenado' ? (
                                                            /* Eye Off / Check mode */
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                                                <line x1="1" y1="1" x2="23" y2="23"></line>
                                                            </svg>
                                                        ) : (
                                                            /* Eye Open / Content mode */
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                                                <circle cx="12" cy="12" r="3"></circle>
                                                            </svg>
                                                        )}
                                                    </button>
                                                )}
                                                {editingAlias && editingAlias.campoId === c.campo_id ? (
                                                    <input
                                                        autoFocus
                                                        type="text"
                                                        value={editingAlias.value}
                                                        onChange={e => handleAliasChange(c.campo_id, e.target.value)}
                                                        onBlur={() => handleAliasBlur(c.campo_id)}
                                                        onKeyDown={e => handleAliasKeyDown(e, c.campo_id)}
                                                        style={{
                                                            marginLeft: c.modo_visualizacion === 'contenido' ? '0.2rem' : '0',
                                                            padding: '0 0.2rem',
                                                            border: '1px solid var(--border-color)',
                                                            borderRadius: '2px',
                                                            fontSize: 'inherit',
                                                            fontFamily: 'inherit',
                                                            width: '100px'
                                                        }}
                                                        onClick={e => e.stopPropagation()}
                                                    />
                                                ) : (
                                                    <span
                                                        onDoubleClick={() => setEditingAlias({ campoId: c.campo_id, value: aliases[c.campo_id] || c.nombre })}
                                                        title="Doble clic para renombrar"
                                                        style={{ cursor: 'text', marginLeft: c.modo_visualizacion === 'contenido' ? '0.2rem' : '0' }}
                                                    >
                                                        {aliases[c.campo_id] || c.nombre}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </th>
                                ))}
                                <th className={styles.actionTh}>Ver</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.map((fila, i) => (
                                <tr key={fila.id}>
                                    <td className={styles.tituloTd}>
                                        <div className={styles.cellContent} title={fila.titulo}>{fila.titulo || '—'}</div>
                                    </td>
                                    {principales.map(c => (
                                        <td key={c.campo_id} className={styles.principalTd}>
                                            {getCellValue(fila.valores, c, shouldExpand)}
                                        </td>
                                    ))}
                                    {resto.map(c => (
                                        <td key={c.campo_id}>
                                            {getCellValue(fila.valores, c, shouldExpand)}
                                        </td>
                                    ))}
                                    <td className={styles.actionTh}>
                                        <button
                                            className="btn btn-secondary"
                                            style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }}
                                            onClick={() => navigate(`/meetings/${fila.id}`)}
                                        >
                                            Ver
                                        </button>
                                    </td>
                                </tr>
                            ))}
                            {data.filas.length === 0 && (
                                <tr>
                                    <td colSpan={99} className={styles.emptyRow}>
                                        No hay instancias de reunión para esta plantilla.
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default SeguimientoView;
