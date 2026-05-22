import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { CartSidebar } from './components/CartSidebar';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { fetchCatalog } from './lib/api';
import { HomePage } from './pages/HomePage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import type { CartItem, CatalogProduct } from './types';

function App() {
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    (async () => {
      try {
        const data = await fetchCatalog();
        if (!active) return;
        setItems(data);
      } catch {
        if (!active) return;
        setError('Não foi possível carregar os produtos agora.');
      } finally {
        if (!active) return;
        setLoading(false);
      }
    })();

    return () => {
      active = false;
    };
  }, []);

  function addToCart(item: CartItem) {
    setCartItems((current) => {
      const existing = current.find((entry) => entry.cartKey === item.cartKey);
      if (!existing) return [...current, item];

      return current.map((entry) =>
        entry.cartKey === item.cartKey
          ? { ...entry, quantity: Math.min(entry.quantity + 1, entry.stock) }
          : entry
      );
    });
  }

  function buyNow(item: CartItem) {
    addToCart(item);
    setCartOpen(true);
  }

  function changeCartQuantity(cartKey: string, delta: number) {
    setCartItems((current) =>
      current
        .map((item) => {
          if (item.cartKey !== cartKey) return item;
          return {
            ...item,
            quantity: Math.max(0, Math.min(item.quantity + delta, item.stock)),
          };
        })
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(cartKey: string) {
    setCartItems((current) => current.filter((item) => item.cartKey !== cartKey));
  }

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <div className="page-shell">
      <Header cartCount={cartCount} onOpenCart={() => setCartOpen(true)} />

      <Routes>
        <Route
          path="/"
          element={
            <HomePage
              items={items}
              loading={loading}
              error={error}
              onAddToCart={addToCart}
              onBuyNow={buyNow}
            />
          }
        />
        <Route
          path="/produto/:productId"
          element={
            <ProductDetailsPage
              items={items}
              loading={loading}
              error={error}
              onAddToCart={addToCart}
              onBuyNow={buyNow}
            />
          }
        />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>

      <CartSidebar
        items={cartItems}
        open={cartOpen}
        onClose={() => setCartOpen(false)}
        onDecrease={(cartKey) => changeCartQuantity(cartKey, -1)}
        onIncrease={(cartKey) => changeCartQuantity(cartKey, 1)}
        onRemove={removeFromCart}
      />

      <Footer />
    </div>
  );
}

export default App;
