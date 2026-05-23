import { ShoppingBag } from 'lucide-react';
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
        <a href="/#sobre">Sobre</a>
      </nav>
      <button className="header-bag" type="button" onClick={onOpenCart}>
        <ShoppingBag size={15} strokeWidth={1.6} aria-hidden="true" />
        <span>Sacola</span>
        <span className="cart-badge">{cartCount}</span>
      </button>
    </header>
  );
}
