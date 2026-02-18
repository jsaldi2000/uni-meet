import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import styles from './MainLayout.module.css';

const MainLayout = () => {
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    return (
        <div className={styles.layout}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                        <h1>UniMeet</h1>
                        <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '-5px' }}>v1.1.0</span>
                    </div>
                </div>
                <nav className={styles.nav}>
                    <Link to="/" className={`${styles.navItem} ${isActive('/') ? styles.active : ''}`}>
                        Inicio
                    </Link>
                    <Link to="/templates" className={`${styles.navItem} ${isActive('/templates') || location.pathname.startsWith('/templates/') ? styles.active : ''}`}>
                        Plantillas
                    </Link>
                    <Link to="/meetings" className={`${styles.navItem} ${isActive('/meetings') ? styles.active : ''}`}>
                        Reuniones
                    </Link>
                    <Link to="/seguimiento" className={`${styles.navItem} ${isActive('/seguimiento') ? styles.active : ''}`}>
                        Seguimiento
                    </Link>
                    <Link to="/backup" className={`${styles.navItem} ${isActive('/backup') ? styles.active : ''}`}>
                        Copia de Seguridad
                    </Link>
                </nav>
            </aside>
            <main className={styles.content}>
                <div className="container">
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
