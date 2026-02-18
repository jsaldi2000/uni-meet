import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

const TemplateList = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchTemplates();
    }, []);

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

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h1>Plantillas</h1>
                <Link to="/templates/new" className="btn btn-primary">Crear Nueva Plantilla</Link>
            </div>

            {templates.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <p>No hay plantillas. ¡Crea la primera!</p>
                </div>
            ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
                    {templates.map(template => (
                        <div key={template.id} className="card">
                            <h3 style={{ marginBottom: '0.5rem' }}>{template.titulo}</h3>
                            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                                {template.descripcion || 'Sin descripción'}
                            </p>
                            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
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
                                    style={{ marginRight: '0.5rem' }}
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
