import { useEffect, useRef, useState } from 'react';
import { Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { Link, NavLink } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LogoMark } from './LogoMark';

type HeaderProps = {
  cartCount: number;
  onOpenCart: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  showSearch?: boolean;
};

export function Header({
  cartCount,
  onOpenCart,
  searchQuery,
  onSearchChange,
  showSearch = true,
}: HeaderProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const { user } = useAuth();
  const mobileNavRef = useRef<HTMLElement>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);

  function closeMenu() {
    setMenuOpen(false);
    // Restore focus to the button that opened the menu
    requestAnimationFrame(() => menuBtnRef.current?.focus());
  }

  // Focus trap + Escape key when mobile nav is open
  useEffect(() => {
    if (!menuOpen) return;

    const nav = mobileNavRef.current;
    if (!nav) return;

    const focusables = Array.from(
      nav.querySelectorAll<HTMLElement>('a, button')
    ).filter((el) => !el.hasAttribute('disabled'));

    // Move focus into the nav
    focusables[0]?.focus();

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        closeMenu();
        return;
      }
      if (e.key !== 'Tab' || focusables.length === 0) return;

      const first = focusables[0];
      const last = focusables[focusables.length - 1];

      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault();
          last.focus();
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [menuOpen]);

  return (
    <>
      <header className="site-header">
        <Link className="logo-wrap" to="/" onClick={closeMenu}>
          <LogoMark compact />
        </Link>
        <nav className="main-nav" aria-label="Navegação principal">
          <a href="/#novidades">Novidades</a>
          <a href="/#feminino">Moda Feminina</a>
          <a href="/#masculino">Moda Masculina</a>
          <NavLink to="/sobre" className={({ isActive }) => isActive ? 'nav-active' : ''}>Sobre</NavLink>
        </nav>
        {showSearch && (
          <label className="header-search" aria-label="Pesquisar produtos">
            <Search size={15} strokeWidth={1.8} aria-hidden="true" />
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Pesquisar produto, categoria, cor ou tamanho"
            />
          </label>
        )}
        <Link
          to={user ? '/minha-conta' : '/entrar'}
          className="header-account"
          aria-label={user ? `Minha conta — ${user.name}` : 'Entrar'}
        >
          <User size={15} strokeWidth={1.6} aria-hidden="true" />
          <span>{user ? user.name.split(' ')[0] : 'Entrar'}</span>
        </Link>
        <button className="header-bag" type="button" onClick={onOpenCart}>
          <ShoppingBag size={15} strokeWidth={1.6} aria-hidden="true" />
          <span>Sacola</span>
          {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
        </button>
        <button
          ref={menuBtnRef}
          className="mobile-menu-btn"
          type="button"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          aria-expanded={menuOpen}
          aria-controls="mobile-nav"
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={22} strokeWidth={1.6} /> : <Menu size={22} strokeWidth={1.6} />}
        </button>
      </header>

      {menuOpen && (
        <nav
          id="mobile-nav"
          className="mobile-nav"
          aria-label="Menu principal"
          ref={mobileNavRef}
        >
          <button
            type="button"
            className="mobile-nav-close"
            aria-label="Fechar menu"
            onClick={closeMenu}
          >
            <X size={22} strokeWidth={1.4} aria-hidden="true" />
          </button>
          <a href="/#novidades" onClick={closeMenu}>Novidades</a>
          <a href="/#feminino" onClick={closeMenu}>Moda Feminina</a>
          <a href="/#masculino" onClick={closeMenu}>Moda Masculina</a>
          <NavLink to="/sobre" onClick={closeMenu}>Sobre</NavLink>
          <NavLink to="/rastrear-pedido" onClick={closeMenu}>Meus Pedidos</NavLink>
        </nav>
      )}
    </>
  );
}