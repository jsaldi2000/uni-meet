import React, { useState, useEffect } from 'react';
import styles from '../pages/MeetingEditor.module.css';

const TableField = ({ field, value, onChange, readOnly }) => {
    // Parse columns definition from field options
    const columns = typeof field.opciones === 'string' ? JSON.parse(field.opciones || '[]') : (field.opciones || []);

    // Parse current rows data (stored as JSON string in value)
    const [rows, setRows] = useState([]);

    useEffect(() => {
        try {
            const parsed = value ? JSON.parse(value) : [];
            setRows(Array.isArray(parsed) ? parsed : []);
        } catch (e) {
            setRows([]);
        }
    }, [value]);

    const updateRow = (rowIndex, colName, cellValue, event) => {
        // Auto-resize logic
        if (event && event.target && event.target.tagName === 'TEXTAREA') {
            event.target.style.height = 'auto';
            event.target.style.height = event.target.scrollHeight + 'px';
        }

        const newRows = [...rows];
        if (!newRows[rowIndex]) newRows[rowIndex] = {};
        newRows[rowIndex][colName] = cellValue;
        setRows(newRows);
        onChange(JSON.stringify(newRows));
    };

    // Auto-resize all textareas on value change
    useEffect(() => {
        const textareas = document.querySelectorAll(`.${styles.cellArea}`);
        textareas.forEach(ta => {
            ta.style.height = 'auto';
            ta.style.height = ta.scrollHeight + 'px';
        });
    }, [rows]);

    const addRow = () => {
        const newRows = [...rows, {}];
        setRows(newRows);
        onChange(JSON.stringify(newRows));
    };

    const removeRow = (rowIndex) => {
        const newRows = [...rows];
        newRows.splice(rowIndex, 1);
        setRows(newRows);
        onChange(JSON.stringify(newRows));
    };

    if (!columns || columns.length === 0) return <div className={styles.error}>La tabla no tiene columnas definidas.</div>;

    return (
        <div className={styles.tableInputContainer}>
            <table className={styles.inputTable}>
                <thead>
                    <tr>
                        {columns.map((col, idx) => (
                            <th key={idx}>{col.nombre}</th>
                        ))}
                        {!readOnly && <th style={{ width: '50px' }}></th>}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, rowIndex) => (
                        <tr key={rowIndex}>
                            {columns.map((col, colIndex) => (
                                <td key={colIndex}>
                                    {col.tipo === 'booleano' ? (
                                        <input
                                            type="checkbox"
                                            checked={!!row[col.nombre]}
                                            onChange={(e) => updateRow(rowIndex, col.nombre, e.target.checked, e)}
                                            disabled={readOnly}
                                        />
                                    ) : col.tipo === 'numero' ? (
                                        <input
                                            type="number"
                                            value={row[col.nombre] || ''}
                                            onChange={(e) => updateRow(rowIndex, col.nombre, e.target.value, e)}
                                            className={styles.cellInput}
                                            disabled={readOnly}
                                        />
                                    ) : col.tipo === 'fecha' ? (
                                        <input
                                            type="date"
                                            value={row[col.nombre] || ''}
                                            onChange={(e) => updateRow(rowIndex, col.nombre, e.target.value, e)}
                                            className={styles.cellInput}
                                            disabled={readOnly}
                                        />
                                    ) : (
                                        <textarea
                                            value={row[col.nombre] || ''}
                                            onChange={(e) => updateRow(rowIndex, col.nombre, e.target.value, e)}
                                            className={styles.cellArea}
                                            disabled={readOnly}
                                            rows={1}
                                        />
                                    )}
                                </td>
                            ))}
                            {!readOnly && (
                                <td>
                                    <button
                                        onClick={() => removeRow(rowIndex)}
                                        className={styles.removeRowBtn}
                                        title="Remove Row"
                                    >
                                        &times;
                                    </button>
                                </td>
                            )}
                        </tr>
                    ))}
                </tbody>
            </table>
            {!readOnly && (
                <button onClick={addRow} className={styles.addRowBtn}>+ Añadir Fila</button>
            )}
        </div>
    );
};

export default TableField;
