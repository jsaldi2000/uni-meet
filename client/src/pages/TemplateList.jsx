import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

const TemplateList = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [viewMode, setViewMode] = useState(localStorage.getItem('templates_view_mode') || 'grid');
    const [searchTerm, setSearchTerm] = useState(localStorage.getItem('templates_search_term') || '');
    const navigate = useNavigate();

    useEffect(() => {
        fetchTemplates();
    }, []);

    useEffect(() => {
        localStorage.setItem('templates_view_mode', viewMode);
    }, [viewMode]);

    useEffect(() => {
        localStorage.setItem('templates_search_term', searchTerm);
    }, [searchTerm]);

    const fetchTemplates = async () => {
        try {
            const response = await api.get('/templates');
            setTemplates(response.data);
        } catch (error) {
            console.error('Error fetching templates:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de que quieres borrar esta plantilla? ¡Se borrarán todas las reuniones asociadas!')) return;
        try {
            await api.delete(`/templates/${id}`);
            fetchTemplates();
        } catch (error) {
            console.error('Error deleting template:', error);
        }
    };

    const startMeeting = async (templateId, templateTitle) => {
        const title = prompt(`Título para la nueva reunión de ${templateTitle}:`);
        if (!title) return;

        try {
            const response = await api.post('/meetings', {
                plantilla_id: templateId,
                titulo: title
            });
            navigate(`/meetings/${response.data.id}`);
        } catch (error) {
            console.error('Error creating meeting:', error);
            alert('Error al crear la reunión');
        }
    };

    if (loading) return <div>Loading...</div>;

    const filteredTemplates = templates.filter(t =>
        t.titulo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div>
            <div className="page-header">
                <div className="header-title">
                    <h1>Plantillas</h1>
                    <p>Gestiona tus plantillas de reuniones y cuestionarios.</p>
                </div>

                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Buscar plantilla..."
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

                    <Link to="/templates/new" className="btn btn-primary" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>Crear Nueva Plantilla</Link>
                </div>
            </div>

            {filteredTemplates.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <p>{searchTerm ? 'No se encontraron plantillas que coincidan con la búsqueda.' : 'No hay plantillas. ¡Crea la primera!'}</p>
                    {searchTerm && <button className="btn btn-secondary" onClick={() => setSearchTerm('')}>Limpiar búsqueda</button>}
                </div>
            ) : viewMode === 'list' ? (
                <div className="card" style={{ padding: 0, overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                        <thead>
                            <tr style={{ backgroundColor: '#f8f9fa', borderBottom: '1px solid var(--border-color)' }}>
                                <th style={{ padding: '1rem' }}>Título de la Plantilla</th>
                                <th style={{ padding: '1rem' }}>Descripción</th>
                                <th style={{ padding: '1rem', textAlign: 'right' }}>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredTemplates.map(template => (
                                <tr
                                    key={template.id}
                                    style={{ borderBottom: '1px solid #f1f3f5' }}
                                    className="list-row-hover"
                                >
                                    <td style={{ padding: '1rem', fontWeight: 500, color: 'var(--primary-color)' }}>
                                        {template.titulo}
                                    </td>
                                    <td style={{ padding: '1rem', color: 'var(--text-muted)', fontSize: '0.9rem' }}>
                                        {template.descripcion || 'Sin descripción'}
                                    </td>
                                    <td style={{ padding: '1rem', textAlign: 'right' }}>
                                        <div style={{ display: 'flex', gap: '0.5rem', justifyContent: 'flex-end' }}>
                                            <button
                                                className="btn btn-primary"
                                                onClick={() => startMeeting(template.id, template.titulo)}
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                            >
                                                Iniciar
                                            </button>
                                            <Link
                                                to={`/templates/${template.id}/edit`}
                                                className="btn btn-secondary"
                                                style={{ padding: '0.25rem 0.5rem', fontSize: '0.8rem' }}
                                            >
                                                Editar
                                            </Link>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => handleDelete(template.id)}
                                                style={{ padding: '0.25rem 0.5rem', borderColor: 'var(--danger-color)', color: 'var(--danger-color)', fontSize: '0.8rem' }}
                                            >
                                                Borrar
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {filteredTemplates.map(template => (
                        <div key={template.id} className="card">
                            <h3>{template.titulo}</h3>
                            <p>
                                {template.descripcion || 'Sin descripción'}
                            </p>
                            <div className="card-actions">
                                <button
                                    className="btn btn-primary"
                                    onClick={() => startMeeting(template.id, template.titulo)}
                                >
                                    Iniciar Reunión
                                </button>
                                <div style={{ flex: 1 }}></div>
                                <Link
                                    to={`/templates/${template.id}/edit`}
                                    className="btn btn-secondary"
                                >
                                    Editar
                                </Link>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => handleDelete(template.id)}
                                    style={{ borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }}
                                >
                                    Borrar
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default TemplateList;
