import { ShoppingBag } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LogoMark } from './LogoMark';

type HeaderProps = {
  cartCount: number;
  onOpenCart: () => void;
  masculineProductId?: string;
  feminineProductId?: string;
};

export function Header({
  cartCount,
  onOpenCart,
  masculineProductId,
  feminineProductId,
}: HeaderProps) {
  return (
    <header className="site-header">
      <Link className="product-link" to="/">
        <LogoMark compact />
      </Link>
      <nav className="main-nav" aria-label="Navegação principal">
        <a href="/#novidades">Novidades</a>
        <Link to={masculineProductId ? `/produto/${masculineProductId}` : '/#novidades'}>
          Moda Masculina
        </Link>
        <Link to={feminineProductId ? `/produto/${feminineProductId}` : '/#novidades'}>
          Moda Feminina
        </Link>
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
