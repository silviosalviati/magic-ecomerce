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
          <div className="adm-stats">
            <div className="adm-stat">
              <p className="adm-stat-value">{data.totalProducts}</p>
              <p className="adm-stat-label">Produtos</p>
            </div>
            <div className="adm-stat">
              <p className="adm-stat-value">{data.totalVariants}</p>
              <p className="adm-stat-label">Variantes</p>
            </div>
            <div className="adm-stat">
              <p className="adm-stat-value">{data.totalUsers}</p>
              <p className="adm-stat-label">Clientes</p>
            </div>
            <div className="adm-stat">
              <p className={`adm-stat-value${data.lowStockAlerts > 0 ? ' adm-stat-value--alert' : ''}`}>
                {data.lowStockAlerts}
              </p>
              <p className="adm-stat-label">Alertas estoque</p>
            </div>
          </div>

          {data.lowStockItems.length > 0 && (
            <>
              <p className="adm-section-title">Estoque crítico</p>
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
              <p className="adm-empty-title">Estoque saudável</p>
              <p className="adm-empty-desc">Nenhuma variante com estoque crítico no momento.</p>
            </div>
          )}
        </>
      )}
    </AdminLayout>
  );
}
