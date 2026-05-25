import { Search, ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
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
  return (
    <header className="site-header">
      <Link className="logo-wrap" to="/">
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
      <button className="header-bag" type="button" onClick={onOpenCart}>
        <ShoppingBag size={15} strokeWidth={1.6} aria-hidden="true" />
        <span>Sacola</span>
        {cartCount > 0 && <span className="cart-badge">{cartCount}</span>}
      </button>
    </header>
  );
}