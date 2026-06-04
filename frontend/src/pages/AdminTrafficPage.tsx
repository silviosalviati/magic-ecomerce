import axios from 'axios';
import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { ADMIN_API, useAdmin } from '../contexts/AdminContext';
import { formatIntegerBR } from '../lib/numberFormat';

type Period = 'today' | '7d' | '30d';

const PERIOD_LABELS: Record<Period, string> = { today: 'Hoje', '7d': '7 dias', '30d': '30 dias' };

const FUNNEL_LABELS: Record<string, string> = {
  page_view:        'Visitas',
  product_view:     'Produto visto',
  add_to_cart:      'Carrinho',
  checkout_start:   'Checkout',
  checkout_complete:'Pedido',
};

const STAGE_META: Record<string, { label: string; cls: string }> = {
  checkout_complete: { label: 'Comprou',   cls: 'complete'  },
  checkout_start:    { label: 'Checkout',  cls: 'checkout'  },
  add_to_cart:       { label: 'Carrinho',  cls: 'cart'      },
  product_view:      { label: 'Produto',   cls: 'browse'    },
  page_view:         { label: 'Browsing',  cls: 'browse'    },
};

interface Overview {
  sessions: number;
  pageViews: number;
  addToCart: number;
  checkouts: number;
  orders: number;
  conversionRate: number;
}
interface FunnelStage { stage: string; sessions: number }
interface Source      { source: string; sessions: number; percentage: number }
interface TopProduct  { productId: string; name: string; views: number; addToCart: number; cartRate: number }
interface Session     { sessionId: string; firstSeen: string; pageCount: number; source: string; linkedEmail: string | null; lastStage: string | null }
interface SessionsPayload { total: number; page: number; pageSize: number; sessions: Session[] }

function formatSessionTime(iso: string, period: Period): string {
  const d = new Date(iso);
  if (period === 'today') return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) + ' ' +
    d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

// ── Icons ──────────────────────────────────────────────────────────────────────
function IconActivity() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
}
function IconEye() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>;
}
function IconCart() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>;
}
function IconBox() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>;
}
function IconTrend() {
  return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 6 13.5 15.5 8.5 10.5 1 18"/><polyline points="17 6 23 6 23 12"/></svg>;
}
function IconChevronLeft() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
}
function IconChevronRight() {
  return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
}

// ── KPI Card ───────────────────────────────────────────────────────────────────
type KpiAccent = 'accent' | 'blue' | 'green' | 'red' | 'neutral';

function KpiCard({ icon, label, value, desc, accent }: { icon: React.ReactNode; label: string; value: string; desc: string; accent: KpiAccent }) {
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

// ── Page ───────────────────────────────────────────────────────────────────────
export function AdminTrafficPage() {
  const { headers } = useAdmin();
  const [period, setPeriod] = useState<Period>('today');

  const [overview,  setOverview]  = useState<Overview | null>(null);
  const [funnel,    setFunnel]    = useState<FunnelStage[]>([]);
  const [sources,   setSources]   = useState<Source[]>([]);
  const [products,  setProducts]  = useState<TopProduct[]>([]);
  const [sessions,  setSessions]  = useState<SessionsPayload | null>(null);
  const [sessPage,  setSessPage]  = useState(1);

  const [loading,      setLoading]      = useState(true);
  const [error,        setError]        = useState('');
  const [sessLoading,  setSessLoading]  = useState(false);

  // Fetch overview + funnel + sources + products when period changes
  useEffect(() => {
    setLoading(true);
    setError('');
    setSessPage(1);

    const q = `period=${period}`;
    Promise.all([
      axios.get<Overview>     (`${ADMIN_API}/admin/analytics/overview?${q}`,  { headers }),
      axios.get<FunnelStage[]>(`${ADMIN_API}/admin/analytics/funnel?${q}`,    { headers }),
      axios.get<Source[]>     (`${ADMIN_API}/admin/analytics/sources?${q}`,   { headers }),
      axios.get<TopProduct[]> (`${ADMIN_API}/admin/analytics/products?${q}`,  { headers }),
    ])
      .then(([ov, fn, sr, pr]) => {
        setOverview(ov.data);
        setFunnel(fn.data);
        setSources(sr.data);
        setProducts(pr.data);
      })
      .catch(() => setError('Falha ao carregar dados de tráfego.'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period]);

  // Fetch sessions separately (pagination-aware)
  useEffect(() => {
    setSessLoading(true);
    axios
      .get<SessionsPayload>(`${ADMIN_API}/admin/analytics/sessions?period=${period}&page=${sessPage}`, { headers })
      .then((r) => setSessions(r.data))
      .catch(() => setSessions(null))
      .finally(() => setSessLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period, sessPage]);

  const funnelMax = funnel[0]?.sessions ?? 1;
  const sessTotalPages = sessions ? Math.max(1, Math.ceil(sessions.total / sessions.pageSize)) : 1;

  return (
    <AdminLayout title="Tráfego">
      {/* ── Period selector ───────────────────────────────────────────── */}
      <div className="adm-traffic-header">
        <p className="adm-dash-eyebrow">Visitantes do storefront</p>
        <div className="adm-traffic-periods">
          {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
            <button
              key={p}
              type="button"
              className={`adm-traffic-period-btn${period === p ? ' is-active' : ''}`}
              onClick={() => setPeriod(p)}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <span className="adm-spinner" />
        </div>
      )}

      {error && <p className="adm-message adm-message--error">{error}</p>}

      {!loading && overview && (
        <>
          {/* ── KPI Cards ──────────────────────────────────────────────── */}
          <div className="adm-kpis adm-kpis--5">
            <KpiCard icon={<IconActivity />} label="Sessões"       value={formatIntegerBR(overview.sessions)}  desc="visitas únicas"          accent="accent"  />
            <KpiCard icon={<IconEye />}      label="Visualizações" value={formatIntegerBR(overview.pageViews)} desc="páginas abertas"          accent="blue"    />
            <KpiCard icon={<IconCart />}     label="Carrinho"      value={formatIntegerBR(overview.addToCart)} desc="adicionaram ao carrinho"  accent="neutral" />
            <KpiCard icon={<IconBox />}      label="Pedidos"       value={formatIntegerBR(overview.orders)}    desc="concluídos no período"    accent="green"   />
            <KpiCard icon={<IconTrend />}    label="Conversão"     value={`${overview.conversionRate}%`}       desc="sessão → pedido"          accent={overview.conversionRate >= 2 ? 'green' : 'neutral'} />
          </div>

          {/* ── Funnel + Sources ───────────────────────────────────────── */}
          <div className="adm-traffic-charts">
            <div className="adm-traffic-card">
              <p className="adm-traffic-card-title">Funil de conversão</p>
              <div className="adm-funnel">
                {funnel.map((stage) => (
                  <div key={stage.stage} className="adm-funnel-row">
                    <span className="adm-funnel-label">{FUNNEL_LABELS[stage.stage] ?? stage.stage}</span>
                    <div className="adm-funnel-bar-track">
                      <div
                        className="adm-funnel-bar-fill"
                        style={{ width: `${funnelMax > 0 ? (stage.sessions / funnelMax) * 100 : 0}%` }}
                      />
                    </div>
                    <span className="adm-funnel-count">{formatIntegerBR(stage.sessions)}</span>
                  </div>
                ))}
                {funnel.length === 0 && (
                  <p style={{ fontSize: 12, color: 'var(--adm-text-2)', margin: 0 }}>Sem dados no período.</p>
                )}
              </div>
            </div>

            <div className="adm-traffic-card">
              <p className="adm-traffic-card-title">Origens de tráfego</p>
              <div className="adm-sources">
                {sources.map((s) => (
                  <div key={s.source} className="adm-source-row">
                    <div className="adm-source-meta">
                      <span className="adm-source-label">{s.source}</span>
                      <span className="adm-source-pct">{s.sessions} sess. · {s.percentage}%</span>
                    </div>
                    <div className="adm-source-track">
                      <div className="adm-source-fill" style={{ width: `${s.percentage}%` }} />
                    </div>
                  </div>
                ))}
                {sources.length === 0 && (
                  <p style={{ fontSize: 12, color: 'var(--adm-text-2)', margin: 0 }}>Sem dados no período.</p>
                )}
              </div>
            </div>
          </div>

          {/* ── Top Products ───────────────────────────────────────────── */}
          {products.length > 0 && (
            <div className="adm-traffic-card" style={{ marginTop: 16 }}>
              <p className="adm-traffic-card-title">Produtos mais vistos</p>
              <div className="adm-table-wrap">
                <table className="adm-table">
                  <thead>
                    <tr>
                      <th>Produto</th>
                      <th style={{ textAlign: 'right' }}>Views</th>
                      <th style={{ textAlign: 'right' }}>Carrinho</th>
                      <th style={{ textAlign: 'right' }}>Taxa</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => (
                      <tr key={p.productId}>
                        <td><p className="adm-table-name">{p.name}</p></td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--adm-font-number)', fontSize: 12 }}>{formatIntegerBR(p.views)}</td>
                        <td style={{ textAlign: 'right', fontFamily: 'var(--adm-font-number)', fontSize: 12 }}>{formatIntegerBR(p.addToCart)}</td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={`adm-badge ${p.cartRate >= 10 ? 'adm-badge--confirmed' : 'adm-badge--pending'}`}>
                            {p.cartRate}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Sessions ───────────────────────────────────────────────── */}
          <div className="adm-traffic-card adm-traffic-sessions">
            <p className="adm-traffic-card-title">Sessões recentes</p>

            {sessLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 24 }}>
                <span className="adm-spinner" />
              </div>
            ) : sessions && sessions.sessions.length > 0 ? (
              <>
                <div className="adm-table-wrap">
                  <table className="adm-table">
                    <thead>
                      <tr>
                        <th>Sessão</th>
                        <th>Início</th>
                        <th style={{ textAlign: 'right' }}>Páginas</th>
                        <th>Origem</th>
                        <th>E-mail</th>
                        <th>Estágio</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sessions.sessions.map((s) => {
                        const stage = s.lastStage ? (STAGE_META[s.lastStage] ?? STAGE_META['page_view']) : { label: 'Entrada', cls: 'browse' };
                        return (
                          <tr key={s.sessionId}>
                            <td style={{ fontFamily: 'monospace', fontSize: 11, color: 'var(--adm-text-2)' }}>{s.sessionId}…</td>
                            <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatSessionTime(s.firstSeen, period)}</td>
                            <td style={{ textAlign: 'right', fontFamily: 'var(--adm-font-number)', fontSize: 12 }}>{s.pageCount}</td>
                            <td style={{ fontSize: 12 }}>{s.source}</td>
                            <td style={{ fontSize: 11, color: 'var(--adm-text-2)' }}>{s.linkedEmail ?? '—'}</td>
                            <td>
                              <span className={`adm-session-stage adm-session-stage--${stage.cls}`}>{stage.label}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {sessTotalPages > 1 && (
                  <div className="adm-pagination">
                    <span className="adm-pagination-total">{formatIntegerBR(sessions.total)} sessões</span>
                    <button type="button" className="adm-pagination-btn" onClick={() => setSessPage((p) => p - 1)} disabled={sessPage === 1} aria-label="Página anterior">
                      <IconChevronLeft />
                    </button>
                    <span className="adm-pagination-info">
                      {sessPage} <span>de</span> {sessTotalPages}
                    </span>
                    <button type="button" className="adm-pagination-btn" onClick={() => setSessPage((p) => p + 1)} disabled={sessPage === sessTotalPages} aria-label="Próxima página">
                      <IconChevronRight />
                    </button>
                  </div>
                )}
              </>
            ) : (
              <p style={{ fontSize: 12, color: 'var(--adm-text-2)', margin: 0 }}>Nenhuma sessão no período.</p>
            )}
          </div>
        </>
      )}
    </AdminLayout>
  );
}
