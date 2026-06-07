import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAdmin } from '../../contexts/AdminContext';

interface NavItem {
  to: string;
  label: string;
  icon: React.ReactNode;
}

function IconDashboard() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" />
      <rect x="3" y="14" width="7" height="7" /><rect x="14" y="14" width="7" height="7" />
    </svg>
  );
}
function IconOrders() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" />
    </svg>
  );
}
function IconCamera() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
      <circle cx="12" cy="13" r="4" />
    </svg>
  );
}
function IconBarcode() {
  return (
    <svg width="16" height="16" viewBox="0 0 28 22" fill="none">
      <rect x="1"    y="1" width="3"   height="20" rx="0.5" fill="currentColor" opacity="0.9"/>
      <rect x="6"    y="1" width="1.5" height="20" rx="0.5" fill="currentColor" opacity="0.6"/>
      <rect x="9"    y="1" width="3"   height="20" rx="0.5" fill="currentColor" opacity="0.9"/>
      <rect x="14"   y="1" width="1.5" height="20" rx="0.5" fill="currentColor" opacity="0.6"/>
      <rect x="17.5" y="1" width="2.5" height="20" rx="0.5" fill="currentColor" opacity="0.9"/>
      <rect x="22"   y="1" width="1.5" height="20" rx="0.5" fill="currentColor" opacity="0.6"/>
      <rect x="25"   y="1" width="2"   height="20" rx="0.5" fill="currentColor" opacity="0.9"/>
    </svg>
  );
}
function IconUsers() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}
function IconCoupon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
      <line x1="7" y1="7" x2="7.01" y2="7"/>
    </svg>
  );
}
function IconTraffic() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>
    </svg>
  );
}
function IconPrice() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  );
}
function IconLogout() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" />
    </svg>
  );
}
function IconMenu() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
    </svg>
  );
}

const NAV_ITEMS: NavItem[] = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: <IconDashboard /> },
  { to: '/admin/pedidos',   label: 'Pedidos',   icon: <IconOrders /> },
  { to: '/admin/foto',      label: 'Foto',      icon: <IconCamera /> },
  { to: '/admin/leitor',    label: 'Leitor',    icon: <IconBarcode /> },
  { to: '/admin/precos',    label: 'Preços',    icon: <IconPrice /> },
  { to: '/admin/usuarios',  label: 'Usuários',  icon: <IconUsers /> },
  { to: '/admin/cupons',    label: 'Cupons',    icon: <IconCoupon /> },
  { to: '/admin/trafego',   label: 'Tráfego',   icon: <IconTraffic /> },
];

interface AdminLayoutProps {
  children: React.ReactNode;
  title: string;
}

export function AdminLayout({ children, title }: AdminLayoutProps) {
  const { logout } = useAdmin();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  function handleLogout() {
    logout();
    navigate('/admin', { replace: true });
  }

  return (
    <div className="adm-shell">
      <div
        className={`adm-sidebar-overlay${sidebarOpen ? ' is-open' : ''}`}
        onClick={() => setSidebarOpen(false)}
      />

      <aside className={`adm-sidebar${sidebarOpen ? ' is-open' : ''}`}>
        <div className="adm-sidebar-logo">
          <img src="/logo/logo-transparent.png" alt="Vista Magic" className="adm-sidebar-logo-img" />
          <p className="adm-sidebar-tag">Painel Admin</p>
        </div>

        <nav className="adm-nav" role="navigation" aria-label="Menu admin">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `adm-nav-item${isActive ? ' is-active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="adm-nav-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="adm-sidebar-footer">
          <button
            type="button"
            className="adm-btn adm-btn--logout"
            onClick={handleLogout}
          >
            <IconLogout /> Sair
          </button>
        </div>
      </aside>

      <div className="adm-content">
        <header className="adm-topbar">
          <button
            type="button"
            className="adm-hamburger"
            aria-label="Abrir menu"
            onClick={() => setSidebarOpen(true)}
          >
            <IconMenu />
          </button>
          <img src="/logo/logo-transparent.png" alt="Vista Magic" className="adm-topbar-logo" />
        </header>

        <div className="adm-content-inner">
          <h1 className="adm-page-title">{title}</h1>
          {children}
        </div>
      </div>
    </div>
  );
}
