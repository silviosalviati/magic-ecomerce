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
      <button className="ghost-btn" type="button" onClick={onOpenCart}>
        Minha sacola
        <span className="cart-badge">{cartCount}</span>
      </button>
    </header>
  );
}
