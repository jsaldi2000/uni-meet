import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api';

const MeetingList = () => {
    const [meetings, setMeetings] = useState([]);
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState(localStorage.getItem('meeting_filter') || '');
    const navigate = useNavigate();

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        localStorage.setItem('meeting_filter', searchTerm);
    }, [searchTerm]);

    const fetchData = async () => {
        try {
            const [meetingsRes, templatesRes] = await Promise.all([
                api.get('/meetings'),
                api.get('/templates')
            ]);
            setMeetings(meetingsRes.data);
            setTemplates(templatesRes.data);
        } catch (error) {
            console.error('Error fetching data:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDuplicate = async (id) => {
        if (!window.confirm('¿Crear una copia de esta reunión?')) return;
        try {
            const res = await api.post(`/meetings/${id}/duplicate`);
            if (window.confirm('¡Reunión duplicada! ¿Ir a la nueva reunión?')) {
                navigate(`/meetings/${res.data.id}`);
            } else {
                fetchData();
            }
        } catch (error) {
            console.error('Error duplicating meeting:', error);
            alert('Duplicate failed');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('¿Estás seguro de que quieres borrar esta reunión?')) return;
        try {
            await api.delete(`/meetings/${id}`);
            fetchData();
        } catch (error) {
            console.error('Error deleting meeting:', error);
        }
    };

    const handleExport = async (templateId, templateTitle) => {
        try {
            const response = await api.get(`/export/excel/${templateId}`, {
                responseType: 'blob',
            });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            link.setAttribute('download', `${templateTitle.replace(/\s+/g, '_')}_Meetings.xlsx`);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (error) {
            console.error('Export failed:', error);
            alert('Export failed');
        }
    };

    if (loading) return <div>Loading...</div>;

    // Filter templates by searchTerm
    const filteredTemplates = templates.filter(t =>
        t.titulo.toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Group meetings by template_id
    const groupedMeetings = filteredTemplates.map(template => ({
        ...template,
        meetings: meetings.filter(m => m.plantilla_id === template.id)
    }));

    // Also catch meetings whose template might have been deleted (edge case)
    const orphanMeetings = meetings.filter(m => !templates.find(t => t.id === m.plantilla_id));

    return (
        <div>
            <div className="page-header">
                <div className="header-title">
                    <h1>Reuniones</h1>
                </div>

                <div className="search-container">
                    <input
                        type="text"
                        placeholder="Filtrar por nombre de plantilla..."
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
                    <Link to="/templates/new" className="btn btn-primary" style={{ whiteSpace: 'nowrap', flexShrink: 0 }}>Crear Nueva Plantilla</Link>
                </div>
            </div>

            {groupedMeetings.length === 0 && orphanMeetings.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <p>No se encontraron reuniones que coincidan con el filtro.</p>
                    {searchTerm && (
                        <button onClick={() => setSearchTerm('')} className="btn btn-secondary">Limpiar Filtro</button>
                    )}
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                    {groupedMeetings.map(group => (
                        <div key={group.id} className="card" style={{ padding: '0' }}>
                            <div style={{
                                padding: '1rem 1.5rem',
                                backgroundColor: '#f8f9fa',
                                borderBottom: '1px solid #dee2e6',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <h3 style={{ margin: 0 }}>{group.titulo}</h3>
                                <button
                                    className="btn btn-secondary"
                                    onClick={() => handleExport(group.id, group.titulo)}
                                    disabled={group.meetings.length === 0}
                                    style={{ fontSize: '0.875rem' }}
                                >
                                    Exportar Excel
                                </button>
                            </div>

                            {group.meetings.length === 0 ? (
                                <div style={{ padding: '1.5rem', color: 'var(--text-muted)', textAlign: 'center' }}>
                                    Todavía no hay reuniones para esta plantilla.
                                    < br />
                                    <Link to="/templates" style={{ color: 'var(--primary-color)' }}>Inicia una ahora</Link>
                                </div>
                            ) : (
                                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                    <thead>
                                        <tr>
                                            <th style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>Título</th>
                                            <th style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>Estado</th>
                                            <th style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>Última Actualización</th>
                                            <th style={{ padding: '1rem', borderBottom: '1px solid #dee2e6' }}>Acciones</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {group.meetings.map(meeting => (
                                            <tr key={meeting.id} style={{ borderBottom: '1px solid #f1f3f5' }}>
                                                <td style={{ padding: '1rem' }}>
                                                    <Link to={`/meetings/${meeting.id}`} style={{ fontWeight: 500, color: 'var(--primary-color)', textDecoration: 'none' }}>
                                                        {meeting.titulo}
                                                    </Link>
                                                    {meeting.subtitulo && <div style={{ fontSize: '0.875rem', color: 'var(--text-muted)' }}>{meeting.subtitulo}</div>}
                                                </td>
                                                <td style={{ padding: '1rem' }}>
                                                    <span style={{
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: '1rem',
                                                        fontSize: '0.75rem',
                                                        backgroundColor: meeting.estado === 'finalizada' ? '#d4edda' : '#fff3cd',
                                                        color: meeting.estado === 'finalizada' ? '#155724' : '#856404'
                                                    }}>
                                                        {meeting.estado}
                                                    </span>
                                                </td>
                                                <td style={{ padding: '1rem' }}>{new Date(meeting.fecha_actualizacion).toLocaleString()}</td>
                                                <td style={{ padding: '1rem' }}>
                                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                                        <Link to={`/meetings/${meeting.id}`} className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}>
                                                            Editar
                                                        </Link>
                                                        <button
                                                            className="btn btn-secondary"
                                                            onClick={() => handleDuplicate(meeting.id)}
                                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem' }}
                                                            title="Duplicate"
                                                        >
                                                            Copiar
                                                        </button>
                                                        <button
                                                            className="btn btn-secondary"
                                                            onClick={() => handleDelete(meeting.id)}
                                                            style={{ padding: '0.25rem 0.5rem', fontSize: '0.875rem', borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }}
                                                        >
                                                            Borrar
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    ))}

                    {orphanMeetings.length > 0 && !searchTerm && (
                        <div className="card" style={{ padding: '1rem' }}>
                            <h3>Reuniones Huérfanas (Plantilla borrada)</h3>
                            <ul>
                                {orphanMeetings.map(m => (
                                    <li key={m.id}><Link to={`/meetings/${m.id}`}>{m.titulo}</Link></li>
                                ))}
                            </ul>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default MeetingList;
