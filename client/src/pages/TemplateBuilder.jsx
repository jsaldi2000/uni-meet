import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import api from '../api';
import styles from './TemplateBuilder.module.css';

const FIELD_TYPES = [
    { value: 'texto_corto', label: 'Texto Corto' },
    { value: 'texto_largo', label: 'Texto Largo' },
    { value: 'numero', label: 'Número' },
    { value: 'fecha', label: 'Fecha' },
    { value: 'fecha_hora', label: 'Fecha y Hora' },
    { value: 'booleano', label: 'Casilla' },
    { value: 'seccion', label: 'SECCIÓN' },
    { value: 'tabla', label: 'Tabla' },
    { value: 'adjunto', label: 'Archivo/Imagen' },
];

// Sortable Item Component
const SortableField = ({ id, field, index, updateField, removeField }) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        cursor: 'default', // Cursor handled by drag handle
    };

    const isSection = field.tipo === 'seccion';
    const isTable = field.tipo === 'tabla';

    const addColumn = () => {
        const newCols = field.opciones ? [...field.opciones] : [];
        newCols.push({ nombre: 'Columna 1', tipo: 'texto_corto' });
        updateField(index, 'opciones', newCols);
    };

    const updateColumn = (colIndex, key, value) => {
        const newCols = [...(field.opciones || [])];
        newCols[colIndex][key] = value;
        updateField(index, 'opciones', newCols);
    };

    const removeColumn = (colIndex) => {
        const newCols = [...(field.opciones || [])];
        newCols.splice(colIndex, 1);
        updateField(index, 'opciones', newCols);
    };

    return (
        <div ref={setNodeRef} style={style} className={`${styles.fieldCard} ${isSection ? styles.sectionCard : ''}`}>
            <div className={styles.fieldRow}>
                <div {...attributes} {...listeners} className={styles.dragHandle} title="Drag to reorder">
                    ⋮⋮
                </div>
                <input
                    type="text"
                    value={field.nombre}
                    onChange={(e) => updateField(index, 'nombre', e.target.value)}
                    className={`${styles.input} ${isSection ? styles.sectionInput : ''}`}
                    placeholder={isSection ? "TÍTULO DE SECCIÓN" : "Etiqueta del Campo"}
                />
                <select
                    value={field.tipo}
                    onChange={(e) => updateField(index, 'tipo', e.target.value)}
                    className={styles.select}
                >
                    {FIELD_TYPES.map(t => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                </select>

                {!isSection && (
                    <label className={styles.checkboxLabel}>
                        <input
                            type="checkbox"
                            checked={field.requerido}
                            onChange={(e) => updateField(index, 'requerido', e.target.checked)}
                        />
                        Obligatorio
                    </label>
                )}

                <button className={styles.deleteBtn} onClick={() => removeField(index)}>
                    &times;
                </button>
            </div>

            {isTable && (
                <div className={styles.tableConfig}>
                    <h4>Columnas de la Tabla</h4>
                    {field.opciones && field.opciones.map((col, idx) => (
                        <div key={idx} className={styles.columnRow}>
                            <input
                                type="text"
                                placeholder="Nombre Columna"
                                value={col.nombre}
                                onChange={(e) => updateColumn(idx, 'nombre', e.target.value)}
                                className={styles.colInput}
                            />
                            <select
                                value={col.tipo}
                                onChange={(e) => updateColumn(idx, 'tipo', e.target.value)}
                                className={styles.colSelect}
                            >
                                <option value="texto_corto">Texto</option>
                                <option value="numero">Número</option>
                                <option value="fecha">Fecha</option>
                                <option value="booleano">Casilla</option>
                            </select>
                            <button onClick={() => removeColumn(idx)} className={styles.removeColBtn}>&times;</button>
                        </div>
                    ))}
                    <button onClick={addColumn} className="btn btn-sm btn-secondary" style={{ marginTop: '0.5rem' }}>+ Añadir Columna</button>
                </div>
            )}
        </div>
    );
};

const TemplateBuilder = () => {
    const navigate = useNavigate();
    const { id } = useParams(); // Get ID if editing
    const [title, setTitle] = useState('');
    const [description, setDescription] = useState('');
    const [fields, setFields] = useState([]);
    const [loading, setLoading] = useState(false);

    // Load data if editing
    useEffect(() => {
        if (id) {
            loadTemplate();
        }
    }, [id]);

    const loadTemplate = async () => {
        try {
            const res = await api.get(`/templates/${id}`);
            setTitle(res.data.titulo);
            setDescription(res.data.descripcion || '');
            // Ensure fields have a unique ID for DnD key, use database ID or fallback
            setFields(res.data.fields.map(f => ({
                ...f,
                id: f.id,
                opciones: typeof f.opciones === 'string' ? JSON.parse(f.opciones) : f.opciones
            })));
        } catch (error) {
            console.error('Failed to load template', error);
            alert('Error al cargar la plantilla');
        }
    };

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const addField = () => {
        setFields([
            ...fields,
            {
                id: `temp_${Date.now()}`,
                nombre: 'Nuevo Campo',
                tipo: 'texto_corto',
                requerido: false,
            }
        ]);
    };

    const updateField = (index, key, value) => {
        const newFields = [...fields];
        newFields[index][key] = value;
        setFields(newFields);
    };

    const removeField = (index) => {
        const newFields = [...fields];
        newFields.splice(index, 1);
        setFields(newFields);
    };

    const handleDragEnd = (event) => {
        const { active, over } = event;

        if (active.id !== over.id) {
            setFields((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleSave = async () => {
        if (!title.trim()) {
            alert('Por favor introduce un título');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                titulo: title,
                descripcion: description,
                // Map fields to remove temporary DnD IDs if they are new (start with temp_)
                campos: fields.map(f => {
                    const isTemp = typeof f.id === 'string' && f.id.startsWith('temp_');
                    return {
                        ...f,
                        id: isTemp ? undefined : f.id // Backend needs undefined/null to know it's new
                    };
                })
            };

            if (id) {
                await api.put(`/templates/${id}`, payload);
            } else {
                await api.post('/templates', payload);
            }

            navigate('/templates');
        } catch (error) {
            console.error('Error saving template:', error);
            alert('Error al guardar la plantilla');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={styles.builder}>
            <div className={styles.header}>
                <h1>{id ? 'Editar Plantilla' : 'Crear Plantilla'}</h1>
                <button className="btn btn-primary" onClick={handleSave} disabled={loading}>
                    {loading ? 'Guardando...' : 'Guardar Plantilla'}
                </button>
            </div>

            <div className={styles.metadata}>
                <div className={styles.formGroup}>
                    <label>Título</label>
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        className={styles.input}
                        placeholder="Ej. Revisión Mensual"
                    />
                </div>
                <div className={styles.formGroup}>
                    <label>Descripción</label>
                    <textarea
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className={styles.textarea}
                        placeholder="Descripción opcional..."
                    />
                </div>
            </div>

            <div className={styles.fieldsContainer}>
                <div className={styles.fieldsHeader}>
                    <h2>Campos del Formulario (Arrastrar para ordenar)</h2>
                    <button className="btn btn-secondary" onClick={addField}>+ Añadir Campo</button>
                </div>

                {fields.length === 0 && <p className={styles.emptyState}>No hay campos añadidos aún.</p>}

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={fields}
                        strategy={verticalListSortingStrategy}
                    >
                        <div className={styles.fieldsList}>
                            {fields.map((field, index) => (
                                <SortableField
                                    key={field.id}
                                    id={field.id}
                                    field={field}
                                    index={index}
                                    updateField={updateField}
                                    removeField={removeField}
                                />
                            ))}
                        </div>
                    </SortableContext>
                </DndContext>
            </div>
        </div>
    );
};

export default TemplateBuilder;
