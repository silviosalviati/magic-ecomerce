import { useEffect, useMemo, useState } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { CartSidebar } from './components/CartSidebar';
import { FloatingActions } from './components/FloatingActions';
import { Toast } from './components/Toast';
import { AdminGuard } from './components/admin/AdminGuard';
import { Footer } from './components/Footer';
import { Header } from './components/Header';
import { AdminProvider } from './contexts/AdminContext';
import { AuthProvider } from './contexts/AuthContext';
import { fetchCatalog } from './lib/api';
import { AboutPage } from './pages/AboutPage';
import { AccountPage } from './pages/AccountPage';
import { AdminDashboardPage } from './pages/AdminDashboardPage';
import { AdminFotoPage } from './pages/AdminFotoPage';
import { AdminLeitorPage } from './pages/AdminLeitorPage';
import { AdminLoginPage } from './pages/AdminLoginPage';
import { AdminOrdersPage } from './pages/AdminOrdersPage';
import { AdminUsersPage } from './pages/AdminUsersPage';
import { AdminCouponsPage } from './pages/AdminCouponsPage';
import { CheckoutPage } from './pages/CheckoutPage';
import { HomePage } from './pages/HomePage';
import { LoginPage } from './pages/LoginPage';
import { OrderLookupPage } from './pages/OrderLookupPage';
import { PasswordRecoveryPage } from './pages/PasswordRecoveryPage';
import { ProductDetailsPage } from './pages/ProductDetailsPage';
import { RegisterPage } from './pages/RegisterPage';
import { ResetPasswordPage } from './pages/ResetPasswordPage';
import { VerifyEmailPage } from './pages/VerifyEmailPage';
import type { CartItem, CatalogProduct } from './types';

const CATALOG_CACHE_KEY = 'magic.catalog.cache.v1';
const CART_KEY = 'magic.cart.v1';

function readCartCache(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(CART_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CartItem[]) : [];
  } catch { return []; }
}

function readCatalogCache(): CatalogProduct[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(CATALOG_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as CatalogProduct[]) : [];
  } catch { return []; }
}

function saveCatalogCache(items: CatalogProduct[]) {
  if (typeof window === 'undefined') return;
  try { window.localStorage.setItem(CATALOG_CACHE_KEY, JSON.stringify(items)); } catch { /* ignore */ }
}

function normalizeSearchText(value: string): string {
  return value.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().trim();
}

function App() {
  const [items, setItems] = useState<CatalogProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [cartItems, setCartItems] = useState<CartItem[]>(readCartCache);
  const [cartOpen, setCartOpen] = useState(false);
  const [toastKey, setToastKey] = useState(0);
  const [toastOpen, setToastOpen] = useState(false);
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
        if (active) setLoading(false);
      }
    };
    void loadCatalog();
    return () => { active = false; };
  }, []);

  // Persiste carrinho no localStorage a cada mudança
  useEffect(() => {
    try { window.localStorage.setItem(CART_KEY, JSON.stringify(cartItems)); } catch { /* ignore */ }
  }, [cartItems]);

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
      if (cached.length > 0) { setItems(cached); setWarning('Catálogo exibido em modo offline temporário.'); return; }
      setError('Não foi possível carregar os produtos agora.');
    } finally { setLoading(false); }
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
    setToastKey((k) => k + 1);
    setToastOpen(true);
  }

  function buyNow(item: CartItem) { addToCart(item); setCartOpen(true); }

  function changeCartQuantity(cartKey: string, delta: number) {
    setCartItems((current) =>
      current
        .map((item) => item.cartKey !== cartKey ? item : { ...item, quantity: Math.max(0, Math.min(item.quantity + delta, item.stock)) })
        .filter((item) => item.quantity > 0)
    );
  }

  function removeFromCart(cartKey: string) {
    setCartItems((current) => current.filter((item) => item.cartKey !== cartKey));
  }

  function clearCart() { setCartItems([]); }

  const filteredItems = useMemo(() => {
    const term = normalizeSearchText(searchQuery);
    if (!term) return items;
    return items.filter((product) => {
      const baseFields = [product.name, product.description, product.category];
      const variantFields = product.variants.flatMap((v) => [v.color, v.size, v.barcode]);
      return [...baseFields, ...variantFields].some((f) => normalizeSearchText(String(f || '')).includes(term));
    });
  }, [items, searchQuery]);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const location = useLocation();
  const isCheckoutPage = location.pathname === '/checkout';
  const isAuthPage = ['/entrar', '/cadastrar', '/verificar-email', '/recuperar-senha', '/redefinir-senha'].includes(location.pathname);
  const isAdminPage = location.pathname.startsWith('/admin');
  const showHeaderSearch = location.pathname === '/';

  return (
    <AuthProvider>
      {/* Admin routes rendered without storefront chrome */}
      {isAdminPage ? (
        <AdminProvider>
          <Routes>
            <Route path="/admin" element={<AdminLoginPage />} />
            <Route path="/admin/dashboard" element={<AdminGuard><AdminDashboardPage /></AdminGuard>} />
            <Route path="/admin/pedidos"   element={<AdminGuard><AdminOrdersPage /></AdminGuard>} />
            <Route path="/admin/foto"      element={<AdminGuard><AdminFotoPage /></AdminGuard>} />
            <Route path="/admin/leitor"    element={<AdminGuard><AdminLeitorPage /></AdminGuard>} />
            <Route path="/admin/usuarios"  element={<AdminGuard><AdminUsersPage /></AdminGuard>} />
            <Route path="/admin/cupons"    element={<AdminGuard><AdminCouponsPage /></AdminGuard>} />
            <Route path="/admin/*"         element={<Navigate to="/admin/dashboard" replace />} />
          </Routes>
        </AdminProvider>
      ) : (
      <div className="page-shell">
        {!isCheckoutPage && !isAuthPage && (
          <>
            <div className="announcement-bar" role="region" aria-label="Promoções e informações de envio">
              <strong>Até R$ 15 de desconto no frete</strong> acima de R$&nbsp;299 &nbsp;·&nbsp; Troca fácil em até 7 dias &nbsp;·&nbsp; <strong>Compra 100% segura</strong>
            </div>
            <Header
              cartCount={cartCount}
              onOpenCart={() => setCartOpen(true)}
              searchQuery={searchQuery}
              onSearchChange={setSearchQuery}
              showSearch={showHeaderSearch}
            />
          </>
        )}

        <Routes>
          <Route path="/" element={<HomePage items={filteredItems} searchQuery={searchQuery} loading={loading} error={error} warning={warning} onRetry={retryCatalogLoad} onAddToCart={addToCart} onBuyNow={buyNow} />} />
          <Route path="/produto/:productId" element={<ProductDetailsPage items={items} loading={loading} error={error} onAddToCart={addToCart} onBuyNow={buyNow} />} />
          <Route path="/checkout" element={<CheckoutPage cartItems={cartItems} onDecrease={(k) => changeCartQuantity(k, -1)} onIncrease={(k) => changeCartQuantity(k, 1)} onRemove={removeFromCart} onClearCart={clearCart} />} />
          <Route path="/entrar"          element={<LoginPage />} />
          <Route path="/cadastrar"       element={<RegisterPage />} />
          <Route path="/verificar-email" element={<VerifyEmailPage />} />
          <Route path="/recuperar-senha" element={<PasswordRecoveryPage />} />
          <Route path="/redefinir-senha" element={<ResetPasswordPage />} />
          <Route path="/sobre"           element={<AboutPage />} />
          <Route path="/minha-conta"     element={<AccountPage />} />
          <Route path="/rastrear-pedido" element={<OrderLookupPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {!isCheckoutPage && !isAuthPage && (
          <>
            <CartSidebar items={cartItems} open={cartOpen} onClose={() => setCartOpen(false)} onDecrease={(k) => changeCartQuantity(k, -1)} onIncrease={(k) => changeCartQuantity(k, 1)} onRemove={removeFromCart} />
            <Footer />
          </>
        )}

        {toastOpen && (
          <Toast key={toastKey} onDismiss={() => setToastOpen(false)} />
        )}

        {!isCheckoutPage && !isAuthPage && <FloatingActions />}
      </div>
      )}
    </AuthProvider>
  );
}

export default App;
