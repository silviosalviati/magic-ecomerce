import { useEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { CartSidebar } from './components/CartSidebar';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { fetchCatalog } from './lib/api';
import { HomePage } from './pages/HomePage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import type { CartItem, CatalogProduct } from './types';

const CATALOG_CACHE_KEY = 'magic.catalog.cache.v1';

function readCatalogCache(): CatalogProduct[] {
  if (typeof window === 'undefined') return [];

  try {
    const raw = window.localStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CatalogProduct[]) : [];
  } catch {
    return [];
  }
}

function saveCatalogCache(items: CatalogProduct[]) {
  if (typeof window === 'undefined') return;

  try {
    window.localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(items));
  } catch {
    // Ignore cache persistence errors.
  }
}

function App() {
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [warning, setWarning] = useState<string | null>(null);

  useEffect(() => {
    let active = true;

    const loadCatalog = async () => {
      setLoading(true);
      setError(null);
      setWarning(null);

      try {
        const data = await fetchCatalog();
        if (!active) return;
        setItems(data);
        saveCatalogCache(data);
      } catch {
        if (!active) return;
        const cached = readCatalogCache();
        if (cached.length > 0) {
          setItems(cached);
          setWarning('Catálogo exibido em modo offline temporário.');
          return;
        }

        setError('Não foi possível carregar os produtos agora.');
      } finally {
        if (!active) return;
        setLoading(false);
      }
    };

    void loadCatalog();

    return () => {
      active = false;
    };
  }, []);

  async function retryCatalogLoad() {
    setLoading(true);
    setError(null);
    setWarning(null);

    try {
      const data = await fetchCatalog();
      setItems(data);
      saveCatalogCache(data);
    } catch {
      const cached = readCatalogCache();
      if (cached.length > 0) {
        setItems(cached);
        setWarning('Catálogo exibido em modo offline temporário.');
        return;
      }

      setError('Não foi possível carregar os produtos agora.');
    } finally {
      setLoading(false);
    }
  }

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
              warning={warning}
              onRetry={retryCatalogLoad}
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
