import { Link } from 'react-router-dom';
import { LogoMark } from './LogoMark';

type HeaderProps = {
  cartCount: number;
  onOpenCart: () => void;
};

export function Header({ cartCount, onOpenCart }: HeaderProps) {
  return (
    <header className="site-header">
      <Link className="product-link" to="/">
        <LogoMark compact />
      </Link>
      <nav className="main-nav" aria-label="Navegação principal">
        <a href="/#novidades">Novidades</a>
        <a href="/#colecao">Coleção</a>
        <a href="/#sobre">Sobre</a>
      </nav>
      <button className="ghost-btn header-bag" type="button" onClick={onOpenCart}>
        <svg className="header-bag-icon" viewBox="0 0 24 24" aria-hidden="true">
          <path d="M6 7h12l-1 11H7L6 7z" />
          <path d="M9 7a3 3 0 0 1 6 0" />
        </svg>
        <span>Sacola</span>
        <span className="cart-badge">{cartCount}</span>
      </button>
    </header>
  );
}
