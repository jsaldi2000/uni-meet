import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../api';
import styles from './SeguimientoView.module.css';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import ReactQuill from 'react-quill';
import 'react-quill/dist/quill.snow.css';

const SortableItem = ({ id, children, className, onClick }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
    };

    return (
        <div ref={setNodeRef} style={style} className={className} onClick={onClick}>
            <div
                {...attributes}
                {...listeners}
                style={{ cursor: 'grab', marginRight: '0.5rem', display: 'flex', alignItems: 'center' }}
                onClick={(e) => e.stopPropagation()}
            >
                ⋮⋮
            </div>
            {children}
        </div>
    );
};

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
    const [orderedFields, setOrderedFields] = useState([]); // List of full field objects in order
    const [searchTerm, setSearchTerm] = useState('');
    const [seguimientoEntradas, setSeguimientoEntradas] = useState({}); // { [instanciaId]: [entries] }
    const [globalEntradas, setGlobalEntradas] = useState([]);
    const [showGlobalNotes, setShowGlobalNotes] = useState(true);
    const [showSeguimiento, setShowSeguimiento] = useState(() => {
        const saved = localStorage.getItem(`seguimiento_show_col_${id}`);
        return saved !== null ? JSON.parse(saved) : true;
    });
    const [exporting, setExporting] = useState(false);
    const [showExportSuccess, setShowExportSuccess] = useState(false);

    useEffect(() => {
        localStorage.setItem(`seguimiento_show_col_${id}`, JSON.stringify(showSeguimiento));
    }, [showSeguimiento, id]);



    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    useEffect(() => {
        const savedSearch = localStorage.getItem(`seguimiento_search_${id}`);
        if (savedSearch) setSearchTerm(savedSearch);
    }, [id]);

    useEffect(() => {
        // Load from localStorage if available, merge with default modes
        const savedModes = JSON.parse(localStorage.getItem(`seguimiento_modes_${id}`) || '{}');
        setLocalModos({ ...modos, ...savedModes });
    }, [modos, id]);

    const updateLocalMode = (campoId, newMode) => {
        setLocalModos(prev => {
            const next = { ...prev, [campoId]: newMode };
            localStorage.setItem(`seguimiento_modes_${id}`, JSON.stringify(next));
            return next;
        });
    };

    const fetchData = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/seguimiento/${id}`);
            setData(res.data);
            const campos = res.data.campos || [];

            // Set fields selected/visible based on "visible" flag (fallback to existence if missing)
            // But now we have "visible" column. If API returns it:
            const selectedIds = campos.filter(c => c.visible !== 0).map(c => c.campo_id);
            setCamposSeleccionados(selectedIds);

            setCamposPrincipales(campos.filter(c => c.es_principal).map(c => c.campo_id));

            // Extract sorting
            // The API returns them ordered by "orden". We can trust this order.
            // But we also need to merge with template fields that might not be in DB yet.
            // We'll handle that in loadAllCampos integration or just set orderedFields here first?
            // "campos" here are ONLY those in SeguimientoCampo. 
            // We need full list for configuration.

            // Temporary storage, will merge in loadAllCampos

            const modesMap = {};
            const aliasMap = {};
            campos.forEach(c => {
                modesMap[c.campo_id] = c.modo_visualizacion || 'contenido';
                if (c.alias) aliasMap[c.campo_id] = c.alias;
            });
            setModos(modesMap);
            setAliases(aliasMap);
            setSeguimientoEntradas(res.data.seguimiento_entradas || {});
            setGlobalEntradas(res.data.global_entradas || []);
        } catch (err) {
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    const loadAllCampos = async (plantillaId) => {
        const res = await api.get(`/templates/${plantillaId}`);
        const templateFields = (res.data.fields || []).filter(c => c.tipo !== 'seccion' && c.tipo !== 'adjunto');
        setAllCampos(templateFields);

        // Merge Logic:
        // 1. Existing saved fields (data.campos) have priority order.
        // 2. New template fields not in DB get appended at the end.

        if (data && data.campos) {
            const savedOrderIds = data.campos.map(c => c.campo_id);

            // Create a map for quick access to template field details
            const templateMap = new Map(templateFields.map(f => [f.id, f]));

            const ordered = [];
            // Add saved fields
            savedOrderIds.forEach(id => {
                const f = templateMap.get(id);
                if (f) ordered.push(f);
            });

            // Add remaining new fields
            templateFields.forEach(f => {
                if (!savedOrderIds.includes(f.id)) {
                    ordered.push(f);
                }
            });

            // Check if special field is missing
            if (!savedOrderIds.includes('special_seguimiento')) {
                ordered.push({ id: 'special_seguimiento', nombre: 'Seguimiento', tipo: 'special_seguimiento' });
            }

            setOrderedFields(ordered);
        } else {
            // Default: add special field at the end
            setOrderedFields([...templateFields, { id: 'special_seguimiento', nombre: 'Seguimiento', tipo: 'special_seguimiento' }]);
        }
    };

    useEffect(() => { fetchData(); }, [id]);
    useEffect(() => { if (data) loadAllCampos(data.plantilla_id); }, [data]); // Depend on data, specifically when data.campos changes? 
    // Careful with infinite loops if loadAllCampos triggers data update. It doesn't.

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
                // Filter out special field ID which is a string and non-persistent
                const allIds = [...new Set([...camposSeleccionados, ...camposPrincipales])]
                    .filter(id => id !== 'special_seguimiento');

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

    const handleDragEnd = (event) => {
        const { active, over } = event;
        if (active.id !== over.id) {
            setOrderedFields((items) => {
                const oldIndex = items.findIndex(i => i.id === active.id);
                const newIndex = items.findIndex(i => i.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleExportToEmail = async () => {
        setExporting(true);
        try {
            const visibleFields = orderedFields.filter(f => camposSeleccionados.includes(f.id) && f.id !== 'special_seguimiento');
            const booleanFields = visibleFields.filter(f => f.tipo === 'booleano');

            // Helper to render value (handling tables and empty states)
            const renderCellContent = (val, field) => {
                if (field.tipo === 'booleano') {
                    return val?.valor_booleano ? '✅ Sí' : '❌ No';
                }

                const rawVal = val?.valor_texto || (val?.valor_numero != null ? String(val.valor_numero) : null);

                if (!rawVal || rawVal.trim() === '' || rawVal === '—') {
                    return '<span style="color: #94a3b8; font-style: italic;">Sin contenido</span>';
                }

                // Check if it's a JSON table (Plan de Mejora)
                if (rawVal.startsWith('[') && rawVal.endsWith(']')) {
                    try {
                        const parsed = JSON.parse(rawVal);
                        if (Array.isArray(parsed) && parsed.length > 0 && typeof parsed[0] === 'object') {
                            const keys = Object.keys(parsed[0]);
                            let tableHtml = `<table cellspacing="0" cellpadding="6" border="1" style="width: 100%; border-collapse: collapse; border: 1px solid #e2e8f0; font-size: 12px; margin-top: 10px; background: #ffffff;">`;
                            tableHtml += `<thead style="background: #f8fafc;"><tr>`;
                            keys.forEach(k => tableHtml += `<th style="text-align: left; border: 1px solid #e2e8f0; padding: 8px;">${k}</th>`);
                            tableHtml += `</tr></thead><tbody>`;
                            parsed.forEach(row => {
                                tableHtml += `<tr>`;
                                keys.forEach(k => tableHtml += `<td style="border: 1px solid #e2e8f0; padding: 8px; vertical-align: top;">${row[k] || ''}</td>`);
                                tableHtml += `</tr>`;
                            });
                            tableHtml += `</tbody></table>`;
                            return tableHtml;
                        }
                    } catch (e) { /* Not a valid JSON or not a table, fall back to text */ }
                }

                return rawVal;
            };

            // 1. Build HTML string for EMAIL (Wide layout)
            let html = `
                <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; color: #1e293b; max-width: 1100px; margin: 0 auto; line-height: 1.5; background-color: #f1f5f9; padding: 25px; border-radius: 12px;">
                    <div style="background-color: #ffffff; padding: 20px; border-radius: 8px; margin-bottom: 25px; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1);">
                        <h1 style="color: #2563eb; margin: 0 0 10px 0; font-size: 24px;">Seguimiento: ${data.nombre}</h1>
                        <p style="color: #64748b; font-size: 14px; margin: 0;">Plantilla: ${data.plantilla_nombre} · Reporte interactivo generado el ${new Date().toLocaleString()}</p>
                    </div>
            `;

            // 2. Global Notes (Always Visible)
            if (globalEntradas && globalEntradas.length > 0) {
                html += `
                    <div style="background-color: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 20px; margin-bottom: 25px;">
                        <h2 style="margin-top: 0; color: #1e40af; font-size: 18px; display: flex; align-items: center; gap: 10px;">
                            📋 Notas Globales de la Lista
                        </h2>
                        <ul style="padding-left: 25px; margin: 10px 0 0 0; color: #1e3a8a;">
                `;
                globalEntradas.forEach(e => {
                    const style = e.realizado ? 'text-decoration: line-through; color: #64748b; font-style: italic;' : '';
                    html += `<li style="margin-bottom: 10px; ${style}">${e.contenido}</li>`;
                });
                html += `</ul></div>`;
            }

            // 3. Meeting Cards (Interactive)
            html += `<h2 style="color: #334155; font-size: 18px; margin-bottom: 15px; padding-left: 5px;">Reuniones e Instancias</h2>`;

            filteredRows.forEach(fila => {
                // Determine icons for the summary bar
                const booleanIconsHtml = booleanFields.map(f => {
                    const val = fila.valores[f.id];
                    const label = aliases[f.id] || f.nombre;
                    return `<span style="padding: 2px 6px; background: #f1f5f9; border-radius: 4px; font-size: 11px; color: #475569; border: 1px solid #e2e8f0; display: inline-flex; align-items: center; gap: 4px;" title="${label}">
                        ${val?.valor_booleano ? '✅' : '❌'} ${label}
                    </span>`;
                }).join(' ');

                // Identify if there's a "Profesor" field to show in the summary
                const profField = visibleFields.find(f => (aliases[f.id] || f.nombre).toLowerCase().includes('profesor'));
                const profVal = profField ? (fila.valores[profField.id]?.valor_texto || '—') : null;

                html += `
                    <details style="margin-bottom: 15px; border-radius: 10px; background: #ffffff; border: 1px solid #e2e8f0; box-shadow: 0 1px 3px rgba(0,0,0,0.05); overflow: hidden;">
                        <summary style="padding: 15px 20px; cursor: pointer; display: flex; align-items: center; list-style: none; outline: none; transition: background 0.2s;">
                            <div style="display: flex; align-items: center; width: 100%; justify-content: space-between; gap: 20px;">
                                <div style="display: flex; align-items: center; gap: 15px;">
                                    <span style="font-weight: 700; color: #0f172a; font-size: 16px;">${fila.titulo || 'Instancia'}</span>
                                    ${profVal ? `<span style="color: #64748b; font-size: 13px; background: #f8fafc; padding: 2px 8px; border-radius: 12px; border: 1px solid #f1f5f9;">👤 ${profVal}</span>` : ''}
                                </div>
                                <div style="display: flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end;">
                                    ${booleanIconsHtml}
                                    <span style="color: #3b82f6; font-size: 12px; margin-left: 10px;">Ver detalles ▼</span>
                                </div>
                            </div>
                        </summary>
                        <div style="padding: 20px; border-top: 1px solid #f1f5f9; background-color: #fff;">
                            
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(350px, 1fr)); gap: 20px; margin-bottom: 25px;">
                `;

                // All fields in detailed view
                visibleFields.forEach(f => {
                    const val = fila.valores[f.id];
                    const label = aliases[f.id] || f.nombre;
                    const content = renderCellContent(val, f);
                    const isFullWidth = content.includes('<table');

                    html += `
                        <div style="background: #f8fafc; padding: 12px; border-radius: 8px; border: 1px solid #f1f5f9; ${isFullWidth ? 'grid-column: 1 / -1;' : ''}">
                            <div style="font-weight: bold; color: #475569; font-size: 12px; text-transform: uppercase; margin-bottom: 5px;">${label}</div>
                            <div style="color: #1e293b; font-size: 14px;">${content}</div>
                        </div>
                    `;
                });

                html += `</div>`;

                // Seguimiento section
                if (showSeguimiento) {
                    const entries = seguimientoEntradas[fila.id] || [];
                    html += `
                        <div style="border-top: 2px dashed #f1f5f9; padding-top: 20px;">
                            <h3 style="margin: 0 0 15px 0; font-size: 15px; color: #334155; display: flex; align-items: center; gap: 8px;">
                                📝 Notas de Seguimiento
                            </h3>
                    `;
                    if (entries.length > 0) {
                        html += `<div style="display: flex; flexDirection: column; gap: 10px;">`;
                        entries.forEach(e => {
                            const style = e.realizado ? 'text-decoration: line-through; color: #94a3b8; background-color: #f8fafc;' : 'background-color: #ffffff; border-left: 3px solid #3b82f6;';
                            html += `
                                <div style="padding: 12px; border: 1px solid #e2e8f0; border-radius: 6px; margin-bottom: 8px; ${style}">
                                    <div style="font-size: 14px;">${e.contenido}</div>
                                    <div style="font-size: 11px; color: #94a3b8; margin-top: 5px;">${new Date(e.created_at).toLocaleDateString()} ${new Date(e.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</div>
                                </div>
                            `;
                        });
                        html += `</div>`;
                    } else {
                        html += `<p style="color: #94a3b8; font-style: italic; font-size: 13px;">Sin notas de seguimiento registradas.</p>`;
                    }
                    html += `</div>`;
                }

                html += `</div></details>`;
            });

            html += `</div>`;

            // 4. Copy to Clipboard
            const blob = new Blob([html], { type: 'text/html' });
            const dataToCopy = [new ClipboardItem({
                'text/html': blob,
                'text/plain': new Blob([html.replace(/<[^>]*>/g, '')], { type: 'text/plain' })
            })];

            await navigator.clipboard.write(dataToCopy);

            setShowExportSuccess(true);
            setTimeout(() => setShowExportSuccess(false), 3000);
        } catch (err) {
            console.error("Export failed", err);
            alert("Error al copiar al portapapeles.");
        } finally {
            setExporting(false);
        }
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            // Filter out special field ID which is a string and non-persistent
            const allFieldsOrderedIds = orderedFields
                .map(f => f.id)
                .filter(id => id !== 'special_seguimiento');

            const visibleFieldsIds = [...camposSeleccionados]
                .filter(id => id !== 'special_seguimiento');

            await api.put(`/seguimiento/${id}`, {
                nombre: data.nombre,
                campo_ids: allFieldsOrderedIds,
                all_fields_ordered: allFieldsOrderedIds,
                visible_fields: visibleFieldsIds,
                campos_principales: camposPrincipales,
                modos_visualizacion: modos,
                aliases: aliases
            });
            setEditMode(false);
            fetchData();
        } catch (err) {
            console.error("Error saving configuration:", err);
            alert("Error al guardar la configuración.");
        } finally {
            setSaving(false);
        }
    };

    const handleAddEntry = async (instanciaId, contenido) => {
        try {
            const res = await api.post(`/seguimiento/${id}/entrada`, { instancia_id: instanciaId, contenido });
            if (instanciaId) {
                setSeguimientoEntradas(prev => ({
                    ...prev,
                    [instanciaId]: [...(prev[instanciaId] || []), { id: res.data.id, contenido, created_at: res.data.created_at, realizado: 0 }]
                }));
            } else {
                setGlobalEntradas(prev => [...prev, { id: res.data.id, contenido, created_at: res.data.created_at, realizado: 0 }]);
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleToggleComplete = async (entradaId, instanciaId, realizado) => {
        try {
            const res = await api.patch(`/seguimiento/${id}/entrada/${entradaId}`, { realizado });
            if (instanciaId) {
                setSeguimientoEntradas(prev => ({
                    ...prev,
                    [instanciaId]: prev[instanciaId].map(e =>
                        e.id === entradaId ? { ...e, realizado: realizado ? 1 : 0, fecha_realizado: res.data.fecha_realizado } : e
                    )
                }));
            } else {
                setGlobalEntradas(prev => prev.map(e =>
                    e.id === entradaId ? { ...e, realizado: realizado ? 1 : 0, fecha_realizado: res.data.fecha_realizado } : e
                ));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleUpdateEntry = async (entradaId, instanciaId, contenido) => {
        try {
            await api.patch(`/seguimiento/${id}/entrada/${entradaId}`, { contenido });
            if (instanciaId) {
                setSeguimientoEntradas(prev => ({
                    ...prev,
                    [instanciaId]: prev[instanciaId].map(e =>
                        e.id === entradaId ? { ...e, contenido } : e
                    )
                }));
            } else {
                setGlobalEntradas(prev => prev.map(e =>
                    e.id === entradaId ? { ...e, contenido } : e
                ));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const handleDeleteEntry = async (entradaId, instanciaId) => {
        try {
            await api.delete(`/seguimiento/${id}/entrada/${entradaId}`);
            if (instanciaId) {
                setSeguimientoEntradas(prev => ({
                    ...prev,
                    [instanciaId]: prev[instanciaId].filter(e => String(e.id) !== String(entradaId))
                }));
            } else {
                setGlobalEntradas(prev => prev.filter(e => String(e.id) !== String(entradaId)));
            }
        } catch (err) {
            console.error(err);
        }
    };

    const formatDate = (val) => {
        if (typeof val !== 'string') return val;
        // Check for YYYY-MM-DD pattern
        const match = val.match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (match) {
            return `${match[3]}/${match[2]}/${match[1]}`;
        }
        return val;
    };

    const getCellValue = (valores, campo, expanded = false) => {
        const val = valores[campo.campo_id];
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

        if (campo.tipo === 'booleano') {
            return (
                <div className={styles.cellBoolean}>
                    {val?.valor_booleano ? '✅' : '❌'}
                </div>
            );
        }

        if (!val) return <div className={contentClass} style={{ color: '#d1d5db' }}>—</div>;

        const text = val.valor_texto || (val.valor_numero != null ? String(val.valor_numero) : null);
        if (!text) return <div className={contentClass} style={{ color: '#d1d5db' }}>—</div>;

        if (campo.tipo === 'tabla') {
            try {
                const rows = JSON.parse(text || '[]');
                if (rows.length === 0) return <div className={contentClass} style={{ color: '#d1d5db' }}>—</div>;
                const cols = typeof campo.opciones === 'string' ? JSON.parse(campo.opciones || '[]') : (campo.opciones || []);
                if (cols.length === 0) return <div className={contentClass}>{rows.length} filas</div>;
                return (
                    <div className={`${contentClass} ${styles.cellTable}`}>
                        <table>
                            <thead>
                                <tr>{cols.map((col, idx) => <th key={idx}>{col.nombre}</th>)}</tr>
                            </thead>
                            <tbody>
                                {rows.map((row, rIdx) => (
                                    <tr key={rIdx}>
                                        {cols.map((col, cIdx) => <td key={cIdx}>{formatDate(row[col.nombre])}</td>)}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                );
            } catch { return <div className={styles.cellContent}>Error</div>; }
        }

        if (campo.tipo === 'texto_largo') {
            return <div className={`${contentClass} rich-text-content`} dangerouslySetInnerHTML={{ __html: text }} />;
        }

        return <div className={contentClass}>{formatDate(text)}</div>;
    };

    if (loading) return <div>Cargando...</div>;
    if (!data) return <div>Lista no encontrada.</div>;

    const filteredRows = data.filas.filter(fila => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        if (fila.titulo && fila.titulo.toLowerCase().includes(term)) return true;

        // Optional: Search in all visible fields instead of just principal ones
        const visibleFields = orderedFields.filter(f => camposSeleccionados.includes(f.id));
        for (const field of visibleFields) {
            const val = fila.valores[field.id];
            if (val) {
                const textVal = val.valor_texto ? val.valor_texto.toLowerCase() : '';
                const numVal = val.valor_numero != null ? String(val.valor_numero) : '';
                if (textVal.includes(term) || numVal.includes(term)) return true;
            }
        }
        return false;
    });

    const shouldExpand = searchTerm && filteredRows.length <= 3;
    const visibleOrderedFields = orderedFields.filter(f => camposSeleccionados.includes(f.id));

    return (
        <div>
            <div className="page-header">
                <div className="header-title">
                    <h1>{data.nombre}</h1>
                    <p className={styles.subtitle}>
                        {data.plantilla_nombre} · {data.filas.length} instancia{data.filas.length !== 1 ? 's' : ''}
                    </p>
                </div>

                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Buscar por título o contenido..."
                        value={searchTerm}
                        onChange={e => {
                            const val = e.target.value;
                            setSearchTerm(val);
                            localStorage.setItem(`seguimiento_search_${id}`, val);
                        }}
                    />
                    {searchTerm && (
                        <button
                            onClick={() => {
                                setSearchTerm('');
                                localStorage.setItem(`seguimiento_search_${id}`, '');
                            }}
                            className="search-clear-btn"
                        >✕</button>
                    )}
                </div>

                <div className="header-actions">
                    <button
                        className={styles.backBtn}
                        onClick={handleExportToEmail}
                        title="Copiar tabla para Email"
                        disabled={exporting}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: showExportSuccess ? 'var(--success-color)' : 'var(--text-muted)', marginTop: 0 }}
                    >
                        {showExportSuccess ? '¡Copiado!' : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22,6 12,13 2,6"></polyline></svg>
                                Email
                            </>
                        )}
                    </button>
                    <button
                        className={styles.backBtn}
                        onClick={() => setShowSeguimiento(!showSeguimiento)}
                        title={showSeguimiento ? 'Ocultar Seguimiento' : 'Mostrar Seguimiento'}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: showSeguimiento ? 'var(--primary-color)' : 'var(--text-muted)', marginTop: 0 }}
                    >
                        {showSeguimiento ? (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                        ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                        )}
                        Seguimiento
                    </button>
                    <button className={styles.backBtn} onClick={() => navigate('/seguimiento')} style={{ marginTop: 0 }}>
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

            {editMode && (
                <div className={styles.editPanel}>
                    <p className={styles.subtitle}>
                        Buscar por título o cualquier campo visible...
                        <span className={styles.editHint}>
                            — ☑ incluir · modo de visualización · <b>arrastra para reordenar</b>
                        </span>
                    </p>
                    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
                        <SortableContext items={orderedFields.map(f => f.id)} strategy={verticalListSortingStrategy}>
                            <div className={styles.camposList}>
                                {orderedFields.filter(f => f.id !== 'special_seguimiento').map(c => {
                                    const selected = camposSeleccionados.some(id => Number(id) === Number(c.id));
                                    const modo = modos[c.id] || 'contenido';
                                    return (
                                        <SortableItem key={c.id} id={c.id}
                                            className={styles.campoItem}
                                            onClick={() => toggleCampo(c.id)}
                                        >
                                            <input type="checkbox" checked={selected} readOnly style={{ flexShrink: 0 }} />
                                            <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={c.nombre}>{c.nombre}</span>
                                            <span className={styles.tipo}>{c.tipo}</span>
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
                                        </SortableItem>
                                    );
                                })}
                            </div>
                        </SortableContext>
                    </DndContext>
                    <div className={styles.editFooter}>
                        <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                            {saving ? 'Guardando...' : 'Guardar configuración'}
                        </button>
                    </div>
                </div>
            )}

            {/* Global Notes Panel */}
            <div className={styles.globalContainer}>
                <div
                    className={styles.globalHeader}
                    onClick={() => setShowGlobalNotes(!showGlobalNotes)}
                >
                    <span className={styles.globalTitle}>📋 Notas globales de la lista</span>
                    <span className={`${styles.chevron} ${showGlobalNotes ? styles.chevronOpen : ''}`}>▼</span>
                </div>
                {showGlobalNotes && (
                    <div className={styles.globalContent}>
                        <SeguimientoInlineCell
                            instanciaId={null}
                            entries={globalEntradas}
                            onAddEntry={handleAddEntry}
                            onToggleComplete={handleToggleComplete}
                            onUpdateEntry={handleUpdateEntry}
                            onDeleteEntry={handleDeleteEntry}
                        />
                    </div>
                )}
            </div>

            {visibleOrderedFields.length === 0 && !editMode ? (
                <div className={styles.emptyState}>
                    <p>No hay campos seleccionados. Pulsa <strong>⚙️ Configurar campos</strong> para elegir qué mostrar.</p>
                </div>
            ) : (
                <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                        <thead>
                            <tr>
                                <th className={styles.tituloTh}>Título reunión</th>
                                {visibleOrderedFields.filter(c => c.id !== 'special_seguimiento').map(c => (
                                    <th
                                        key={c.id}
                                    >
                                        <div className={styles.thContent}>
                                            <div style={{ display: 'flex', alignItems: 'center' }}>
                                                {modos[c.id] === 'contenido' && (
                                                    <button
                                                        className={styles.toggleModeBtn}
                                                        onClick={() => updateLocalMode(c.id, localModos[c.id] === 'rellenado' ? 'contenido' : 'rellenado')}
                                                    >
                                                        {localModos[c.id] === 'rellenado' ? (
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path><line x1="1" y1="1" x2="23" y2="23"></line></svg>
                                                        ) : (
                                                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                                                        )}
                                                    </button>
                                                )}
                                                <span
                                                    onDoubleClick={() => setEditingAlias({ campoId: c.id, value: aliases[c.id] || c.nombre })}
                                                    style={{ cursor: 'text', marginLeft: modos[c.id] === 'contenido' ? '0.25rem' : '0' }}
                                                >
                                                    {editingAlias && editingAlias.campoId === c.id ? (
                                                        <input
                                                            autoFocus type="text" value={editingAlias.value}
                                                            onChange={e => handleAliasChange(c.id, e.target.value)}
                                                            onBlur={() => handleAliasBlur(c.id)}
                                                            onKeyDown={e => handleAliasKeyDown(e, c.id)}
                                                            className={styles.aliasInput}
                                                            onClick={e => e.stopPropagation()}
                                                        />
                                                    ) : (
                                                        aliases[c.id] || c.nombre
                                                    )}
                                                </span>
                                            </div>
                                        </div>
                                    </th>
                                ))}
                                {showSeguimiento && (
                                    <th className={styles.seguimientoTh}>Seguimiento</th>
                                )}
                                <th className={styles.actionTh}>Ver</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredRows.map(fila => (
                                <tr key={fila.id}>
                                    <td className={styles.tituloTd}>
                                        <div className={styles.cellContent}>{fila.titulo || '—'}</div>
                                    </td>
                                    {visibleOrderedFields.filter(c => c.id !== 'special_seguimiento').map(c => (
                                        <td key={c.id}>
                                            {getCellValue(fila.valores, { ...c, campo_id: c.id, modo_visualizacion: modos[c.id], tipo: c.tipo, opciones: c.opciones }, shouldExpand)}
                                        </td>
                                    ))}
                                    {showSeguimiento && (
                                        <td className={styles.seguimientoTd}>
                                            <SeguimientoInlineCell
                                                instanciaId={fila.id}
                                                entries={seguimientoEntradas[fila.id] || []}
                                                onAddEntry={handleAddEntry}
                                                onToggleComplete={handleToggleComplete}
                                                onUpdateEntry={handleUpdateEntry}
                                                onDeleteEntry={handleDeleteEntry}
                                            />
                                        </td>
                                    )}
                                    <td className={styles.actionTh}>
                                        <button className="btn btn-secondary" style={{ padding: '0.2rem 0.6rem', fontSize: '0.8rem' }} onClick={() => navigate(`/meetings/${fila.id}`)}>Ver</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

const SeguimientoInlineCell = ({ instanciaId, entries, onAddEntry, onToggleComplete, onUpdateEntry, onDeleteEntry }) => {
    const [text, setText] = useState('');
    const [saving, setSaving] = useState(false);
    const [editingId, setEditingId] = useState(null);
    const [editValue, setEditValue] = useState('');

    const handleSend = async () => {
        const cleanText = text.replace(/<p><br><\/p>/g, '').trim();
        if (!cleanText || cleanText === '<p></p>') return;
        setSaving(true);
        await onAddEntry(instanciaId, text);
        setText('');
        setSaving(false);
    };

    const handleStartEdit = (e) => {
        setEditingId(e.id);
        setEditValue(e.contenido);
    };

    const handleSaveEdit = async () => {
        await onUpdateEntry(editingId, instanciaId, editValue);
        setEditingId(null);
        setEditValue('');
    };

    const handleCancelEdit = () => {
        setEditingId(null);
        setEditValue('');
    };

    const handleDelete = async (entryId) => {
        if (window.confirm('¿Estás seguro de que deseas eliminar este comentario?')) {
            await onDeleteEntry(entryId, instanciaId);
        }
    };

    const modules = {
        toolbar: [
            ['bold', 'italic', 'underline'],
            [{ 'list': 'ordered' }, { 'list': 'bullet' }],
            [{ 'color': [] }],
            ['clean']
        ],
    };

    const formats = ['bold', 'italic', 'underline', 'list', 'bullet', 'color'];

    return (
        <div className={styles.inlineCell}>
            <div className={styles.inlineHistory}>
                {entries.map(e => (
                    <div key={e.id} className={`${styles.inlineEntry} ${e.realizado ? styles.entryCompleted : ''}`}>
                        <div className={styles.entryMain}>
                            <input
                                type="checkbox"
                                checked={!!e.realizado}
                                onChange={(evt) => onToggleComplete(e.id, instanciaId, evt.target.checked)}
                                className={styles.completeCheck}
                            />

                            <div className={styles.entryBody}>
                                {editingId === e.id ? (
                                    <div className={styles.editEntryWrapper}>
                                        <ReactQuill theme="snow" value={editValue} onChange={setEditValue} modules={modules} formats={formats} autoFocus />
                                        <div className={styles.editActions}>
                                            <button className={styles.saveEditBtn} onClick={handleSaveEdit}>Guardar</button>
                                            <button className={styles.cancelEditBtn} onClick={handleCancelEdit}>Cancelar</button>
                                        </div>
                                    </div>
                                ) : (
                                    <div
                                        className={`${styles.inlineEntryContent} ${e.realizado ? styles.contentCompleted : ''} ql-editor`}
                                        dangerouslySetInnerHTML={{ __html: e.contenido }}
                                        onClick={() => handleStartEdit(e)}
                                        title="Click para editar"
                                        style={{ cursor: 'pointer' }}
                                    />
                                )}
                            </div>

                            <div className={styles.inlineEntryMeta}>
                                <span>{new Date(e.created_at).toLocaleString([], { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                {!!e.realizado && e.fecha_realizado && (
                                    <span className={styles.completionDate} title={`Completado el ${new Date(e.fecha_realizado).toLocaleString()}`}>
                                        ✓ {new Date(e.fecha_realizado).toLocaleString([], { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                )}
                            </div>

                            <button className={styles.deleteEntryBtn} onClick={() => handleDelete(e.id)} title="Eliminar">×</button>
                        </div>
                    </div>
                ))}
            </div>
            <div className={styles.inlineInputWrapper}>
                <div className={styles.quillWrapper}>
                    <ReactQuill theme="snow" value={text} onChange={setText} modules={modules} formats={formats} placeholder="Añadir..." />
                </div>
                <button className={styles.inlineSendBtn} onClick={handleSend} disabled={saving || !text.trim() || text === '<p><br></p>'}>
                    {saving ? '...' : 'Añadir'}
                </button>
            </div>
        </div>
    );
};

export default SeguimientoView;
