import axios from 'axios';
import { useEffect, useMemo, useState } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { ADMIN_API, useAdmin } from '../contexts/AdminContext';

interface DashboardData {
  totalProducts: number;
  totalVariants: number;
  totalUsers: number;
  lowStockAlerts: number;
  lowStockItems: Array<{
    id: string;
    stock: number;
    barcode: string | null;
    color: string;
    size: string;
    product: { name: string };
  }>;
}

const TODAY = new Date().toLocaleDateString('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
});

const PAGE_SIZE = 10;

type KpiAccent = 'accent' | 'blue' | 'green' | 'red' | 'neutral';

function IconPackage() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );
}

function IconLayers() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function IconUsers2() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function IconAlertTri() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconSearch() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  );
}

function IconChevronLeft() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconChevronRight() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function IconCheck() {
  return (
    <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
      <polyline points="22 4 12 14.01 9 11.01" />
    </svg>
  );
}

function IconAlertSmall() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

interface KpiCardProps {
  icon: React.ReactNode;
  label: string;
  value: number;
  desc: string;
  accent: KpiAccent;
}

function KpiCard({ icon, label, value, desc, accent }: KpiCardProps) {
  return (
    <div className="adm-kpi">
      <div className="adm-kpi-top">
        <div className={`adm-kpi-icon adm-kpi-icon--${accent}`}>{icon}</div>
      </div>
      <p className="adm-kpi-label">{label}</p>
      <p className={`adm-kpi-value${accent === 'red' ? ' adm-kpi-value--red' : ''}`}>{value}</p>
      <p className="adm-kpi-desc">{desc}</p>
    </div>
  );
}

export function AdminDashboardPage() {
  const { headers } = useAdmin();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  useEffect(() => {
    setLoading(true);
    axios
      .get<DashboardData>(`${ADMIN_API}/admin/dashboard`, { headers })
      .then((r) => setData(r.data))
      .catch(() => setError('Falha ao carregar o dashboard.'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!data) return [];
    const q = search.toLowerCase().trim();
    if (!q) return data.lowStockItems;
    return data.lowStockItems.filter(
      (item) =>
        item.product.name.toLowerCase().includes(q) ||
        (item.barcode ?? '').toLowerCase().includes(q),
    );
  }, [data, search]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  function handleSearch(q: string) {
    setSearch(q);
    setPage(1);
  }

  return (
    <AdminLayout title="Dashboard">
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <span className="adm-spinner" />
        </div>
      )}

      {error && <p className="adm-message adm-message--error">{error}</p>}

      {data && (
        <>
          <div className="adm-dash-header">
            <p className="adm-dash-eyebrow">Visão geral</p>
            <div className="adm-dash-date">
              <p className="adm-dash-date-value">{TODAY}</p>
              <p className="adm-dash-date-sub">Atualizado agora</p>
            </div>
          </div>

          <div className="adm-kpis">
            <KpiCard
              icon={<IconPackage />}
              label="Produtos"
              value={data.totalProducts}
              desc="cadastrados"
              accent="accent"
            />
            <KpiCard
              icon={<IconLayers />}
              label="Variantes"
              value={data.totalVariants}
              desc="ativas no catálogo"
              accent="blue"
            />
            <KpiCard
              icon={<IconUsers2 />}
              label="Clientes"
              value={data.totalUsers}
              desc="registrados"
              accent="green"
            />
            <KpiCard
              icon={<IconAlertTri />}
              label="Alertas de estoque"
              value={data.lowStockAlerts}
              desc={data.lowStockAlerts === 0 ? 'estoque saudável' : 'itens críticos'}
              accent={data.lowStockAlerts > 0 ? 'red' : 'neutral'}
            />
          </div>

          {data.lowStockItems.length > 0 ? (
            <>
              <div className="adm-section-bar">
                <span className="adm-section-bar-icon"><IconAlertSmall /></span>
                <span className="adm-section-bar-label">Estoque crítico</span>
                <span className="adm-alert-count">{data.lowStockItems.length} itens</span>
                <div className="adm-section-search">
                  <IconSearch />
                  <input
                    placeholder="Buscar produto ou código..."
                    value={search}
                    onChange={(e) => handleSearch(e.target.value)}
                  />
                </div>
              </div>

              {filtered.length === 0 ? (
                <div className="adm-empty" style={{ marginTop: 0 }}>
                  <p className="adm-empty-title" style={{ fontSize: 13 }}>
                    Nenhum resultado para &ldquo;{search}&rdquo;
                  </p>
                  <p className="adm-empty-desc">
                    Tente um nome de produto ou código de barras diferente.
                  </p>
                </div>
              ) : (
                <>
                  <div className="adm-table-wrap">
                    <table className="adm-table">
                      <thead>
                        <tr>
                          <th>Produto</th>
                          <th>Cor / Tamanho</th>
                          <th>Código de barras</th>
                          <th>Estoque</th>
                        </tr>
                      </thead>
                      <tbody>
                        {paginated.map((item) => (
                          <tr key={item.id} className={item.stock === 0 ? 'adm-low-stock-row' : ''}>
                            <td>
                              <p className="adm-table-name">{item.product.name}</p>
                            </td>
                            <td>{item.color} · {item.size}</td>
                            <td style={{ fontFamily: 'monospace', fontSize: 12 }}>
                              {item.barcode || '—'}
                            </td>
                            <td>
                              <span className={`adm-badge ${item.stock === 0 ? 'adm-badge--cancelled' : 'adm-badge--pending'}`}>
                                {item.stock === 0 ? 'Sem estoque' : `${item.stock} un.`}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {totalPages > 1 && (
                    <div className="adm-pagination">
                      <span className="adm-pagination-total">{filtered.length} resultados</span>
                      <button
                        type="button"
                        className="adm-pagination-btn"
                        onClick={() => setPage((p) => p - 1)}
                        disabled={page === 1}
                        aria-label="Página anterior"
                      >
                        <IconChevronLeft />
                      </button>
                      <span className="adm-pagination-info">
                        {page} <span>de</span> {totalPages}
                      </span>
                      <button
                        type="button"
                        className="adm-pagination-btn"
                        onClick={() => setPage((p) => p + 1)}
                        disabled={page === totalPages}
                        aria-label="Próxima página"
                      >
                        <IconChevronRight />
                      </button>
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <div className="adm-empty">
              <div className="adm-empty-icon" style={{ color: '#3A6A52' }}>
                <IconCheck />
              </div>
              <p className="adm-empty-title">Estoque saudável</p>
              <p className="adm-empty-desc">Nenhuma variante com estoque crítico no momento.</p>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}