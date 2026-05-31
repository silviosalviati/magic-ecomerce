import axios from 'axios';
import { useEffect, useState } from 'react';
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

function IconAlert() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
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

export function AdminDashboardPage() {
  const { headers } = useAdmin();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    setLoading(true);
    axios
      .get<DashboardData>(`${ADMIN_API}/admin/dashboard`, { headers })
      .then((r) => setData(r.data))
      .catch(() => setError('Falha ao carregar o dashboard.'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

          <div className="adm-stats">
            <div className="adm-stat">
              <p className="adm-stat-label">Produtos</p>
              <p className="adm-stat-value">{data.totalProducts}</p>
            </div>
            <div className="adm-stat">
              <p className="adm-stat-label">Variantes</p>
              <p className="adm-stat-value">{data.totalVariants}</p>
            </div>
            <div className="adm-stat">
              <p className="adm-stat-label">Clientes</p>
              <p className="adm-stat-value">{data.totalUsers}</p>
            </div>
            <div className="adm-stat">
              <p className="adm-stat-label">Alertas estoque</p>
              <p className={`adm-stat-value${data.lowStockAlerts > 0 ? ' adm-stat-value--alert' : ''}`}>
                {data.lowStockAlerts}
              </p>
            </div>
          </div>

          {data.lowStockItems.length > 0 && (
            <>
              <div className="adm-alert-header">
                <span className="adm-alert-header-icon"><IconAlert /></span>
                <span className="adm-alert-header-label">Estoque crítico</span>
                <span className="adm-alert-count">{data.lowStockItems.length} itens</span>
              </div>
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
                    {data.lowStockItems.map((item) => (
                      <tr key={item.id} className={item.stock === 0 ? 'adm-low-stock-row' : ''}>
                        <td>
                          <p className="adm-table-name">{item.product.name}</p>
                        </td>
                        <td>{item.color} · {item.size}</td>
                        <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{item.barcode || '—'}</td>
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
            </>
          )}

          {data.lowStockItems.length === 0 && (
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
