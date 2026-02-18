import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import TemplateList from './pages/TemplateList';
import TemplateBuilder from './pages/TemplateBuilder';
import MeetingList from './pages/MeetingList';
import MeetingEditor from './pages/MeetingEditor';

function App() {
    return (
        <Router>
            <Routes>
                <Route path="/" element={<MainLayout />}>
                    <Route index element={<Home />} />
                    <Route path="templates" element={<TemplateList />} />
                    <Route path="templates/new" element={<TemplateBuilder />} />
                    <Route path="templates/:id/edit" element={<TemplateBuilder />} />
                    <Route path="meetings" element={<MeetingList />} />
                    <Route path="meetings/new/:templateId" element={<div>Nueva Reunión (Próximamente)</div>} />
                    <Route path="meetings/:id" element={<MeetingEditor />} />
                </Route>
            </Routes>
        </Router>
    );
}

export default App;
