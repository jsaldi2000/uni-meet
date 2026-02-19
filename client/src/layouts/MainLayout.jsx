import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import styles from './MainLayout.module.css';

const MainLayout = () => {
    const location = useLocation();

    const isActive = (path) => location.pathname === path;

    const isFullWidth = /^\/seguimiento\/\d+$/.test(location.pathname);

    return (
        <div className={styles.layout}>
            <aside className={styles.sidebar}>
                <div className={styles.brand}>
                    <div className={styles.logo}>
                        <h1>UniMeet</h1>
                        <span className={styles.version}>v1.3.12</span>
                    </div>
                </div>
                <nav className={styles.nav}>
                    <Link to="/" className={`${styles.navItem} ${isActive('/') ? styles.active : ''}`}>
                        Panel
                    </Link>
                    <Link to="/templates" className={`${styles.navItem} ${isActive('/templates') || location.pathname.startsWith('/templates/') ? styles.active : ''}`}>
                        Plantillas
                    </Link>
                    <Link to="/meetings" className={`${styles.navItem} ${isActive('/meetings') ? styles.active : ''}`}>
                        Reuniones
                    </Link>
                    <Link to="/seguimiento" className={`${styles.navItem} ${isActive('/seguimiento') || location.pathname.startsWith('/seguimiento/') ? styles.active : ''}`}>
                        Seguimiento
                    </Link>
                    <Link to="/backup" className={`${styles.navItem} ${isActive('/backup') ? styles.active : ''}`}>
                        Copia de Seguridad
                    </Link>
                </nav>
            </aside>
            <main className={styles.content}>
                <div className={isFullWidth ? "container-fluid" : "container"}>
                    <Outlet />
                </div>
            </main>
        </div>
    );
};

export default MainLayout;
