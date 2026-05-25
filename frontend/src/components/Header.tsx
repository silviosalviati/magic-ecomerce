import { useState } from 'react';
import { Menu, Search, ShoppingBag, User, X } from 'lucide-react';
import { Link } from 'react-router-dom';
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

  function closeMenu() {
    setMenuOpen(false);
  }

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
          className="mobile-menu-btn"
          type="button"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setMenuOpen((v) => !v)}
        >
          {menuOpen ? <X size={22} strokeWidth={1.6} /> : <Menu size={22} strokeWidth={1.6} />}
        </button>
      </header>

      {menuOpen && (
        <nav className="mobile-nav" aria-label="Menu principal">
          <a href="/#novidades" onClick={closeMenu}>Novidades</a>
          <a href="/#feminino" onClick={closeMenu}>Moda Feminina</a>
          <a href="/#masculino" onClick={closeMenu}>Moda Masculina</a>
        </nav>
      )}
    </>
  );
}