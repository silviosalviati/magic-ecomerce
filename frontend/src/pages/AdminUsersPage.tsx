import axios from 'axios';
import { useEffect, useState } from 'react';
import { AdminLayout } from '../components/admin/AdminLayout';
import { ADMIN_API, useAdmin } from '../contexts/AdminContext';
import { formatCurrencyBRL, formatIntegerBR } from '../lib/numberFormat';

interface AdminUser {
  id: string;
  name: string;
  email: string;
  isAdmin: boolean;
  emailVerifiedAt: string | null;
  failedLoginAttempts: number;
  lockedUntil: string | null;
  createdAt: string;
  _count: { orders: number };
}

interface UserDetail extends AdminUser {
  orders: Array<{
    id: string;
    total: number | string;
    status: string;
    createdAt: string;
    paymentMethod: string | null;
  }>;
}

interface UsersResponse {
  users: AdminUser[];
  total: number;
  page: number;
  totalPages: number;
}

const STATUS_LABELS: Record<string, string> = {
  PENDING: 'Aguardando', PAID: 'Pago', PREPARING: 'Em preparo',
  SHIPPED: 'Enviado', DELIVERED: 'Entregue', CANCELLED: 'Cancelado',
  OVERDUE: 'Vencido', REFUNDED: 'Reembolsado',
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function formatCurrency(v: number | string) {
  return formatCurrencyBRL(v);
}

export function AdminUsersPage() {
  const { headers } = useAdmin();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [selected, setSelected] = useState<UserDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', email: '', isAdmin: false });
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [saveError, setSaveError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    setLoading(true);
    setError('');
    axios
      .get<UsersResponse>(`${ADMIN_API}/admin/users`, {
        headers,
        params: { page, limit: 25, search: search || undefined },
      })
      .then((r) => {
        setUsers(r.data.users);
        setTotal(r.data.total);
        setTotalPages(r.data.totalPages);
      })
      .catch(() => setError('Falha ao carregar usuários.'))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, search]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  }

  async function openUser(user: AdminUser) {
    setLoadingDetail(true);
    setSelected(null);
    setSaveMsg('');
    setSaveError('');
    setConfirmDelete(false);
    try {
      const { data } = await axios.get<UserDetail>(`${ADMIN_API}/admin/users/${user.id}`, { headers });
      setSelected(data);
      setEditForm({ name: data.name, email: data.email, isAdmin: data.isAdmin });
    } catch {
      // ignore
    } finally {
      setLoadingDetail(false);
    }
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    setSaveMsg('');
    setSaveError('');
    try {
      await axios.patch(
        `${ADMIN_API}/admin/users/${selected.id}`,
        { name: editForm.name, email: editForm.email, isAdmin: editForm.isAdmin },
        { headers }
      );
      setSaveMsg('Usuário atualizado com sucesso.');
      setUsers((prev) => prev.map((u) =>
        u.id === selected.id ? { ...u, name: editForm.name, email: editForm.email, isAdmin: editForm.isAdmin } : u
      ));
      setSelected((prev) => prev ? { ...prev, name: editForm.name, email: editForm.email, isAdmin: editForm.isAdmin } : prev);
    } catch {
      setSaveError('Falha ao salvar. Tente novamente.');
    } finally {
      setSaving(false);
    }
  }

  async function handleUnlock() {
    if (!selected) return;
    setSaving(true);
    try {
      await axios.patch(`${ADMIN_API}/admin/users/${selected.id}`, { unlockAccount: true }, { headers });
      setSaveMsg('Conta desbloqueada.');
      setSelected((prev) => prev ? { ...prev, failedLoginAttempts: 0, lockedUntil: null } : prev);
      setUsers((prev) => prev.map((u) => u.id === selected.id ? { ...u, failedLoginAttempts: 0, lockedUntil: null } : u));
    } catch {
      setSaveError('Falha ao desbloquear.');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selected) return;
    setDeleting(true);
    try {
      await axios.delete(`${ADMIN_API}/admin/users/${selected.id}`, { headers });
      setUsers((prev) => prev.filter((u) => u.id !== selected.id));
      setTotal((t) => t - 1);
      setSelected(null);
    } catch {
      setSaveError('Falha ao excluir usuário.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  const isLocked = (u: AdminUser) => !!u.lockedUntil && new Date(u.lockedUntil) > new Date();

  return (
    <AdminLayout title="Usuários">
      {/* Toolbar */}
      <div className="adm-toolbar">
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', gap: 8, flex: 1 }}>
          <input
            type="text"
            className="adm-search"
            placeholder="Buscar por nome ou e-mail…"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
          />
          <button type="submit" className="adm-btn adm-btn--ghost">Buscar</button>
        </form>
        <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 12, color: '#6B5F5C', flexShrink: 0 }}>
          {formatIntegerBR(total)} usuário(s)
        </p>
      </div>

      {error && <p className="adm-message adm-message--error">{error}</p>}

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}>
          <span className="adm-spinner" />
        </div>
      ) : (
        <>
          <div className="adm-table-wrap">
            <table className="adm-table">
              <thead>
                <tr>
                  <th>Nome</th>
                  <th>Status</th>
                  <th>Pedidos</th>
                  <th>Cadastro</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <p className="adm-table-name">{u.name}</p>
                      <p className="adm-table-sub">{u.email}</p>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                        {u.isAdmin && <span className="adm-badge adm-badge--admin">Admin</span>}
                        {u.emailVerifiedAt
                          ? <span className="adm-badge adm-badge--verified">Verificado</span>
                          : <span className="adm-badge adm-badge--unverified">Não verificado</span>}
                        {isLocked(u) && <span className="adm-badge adm-badge--locked">Bloqueado</span>}
                      </div>
                    </td>
                    <td>{u._count.orders}</td>
                    <td>{formatDate(u.createdAt)}</td>
                    <td className="adm-table-actions">
                      <button
                        type="button"
                        className="adm-table-btn"
                        onClick={() => void openUser(u)}
                        disabled={loadingDetail}
                      >
                        Editar
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {users.length === 0 && (
              <div className="adm-empty" style={{ padding: '48px 20px' }}>
                <p className="adm-empty-title">Nenhum usuário encontrado</p>
              </div>
            )}

            {totalPages > 1 && (
              <div className="adm-pagination">
                <span>Página {formatIntegerBR(page)} de {formatIntegerBR(totalPages)}</span>
                <div className="adm-pagination-btns">
                  <button
                    type="button"
                    className="adm-page-btn"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >← Anterior</button>
                  <button
                    type="button"
                    className="adm-page-btn"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >Próxima →</button>
                </div>
              </div>
            )}
          </div>
        </>
      )}

      {/* Detail Panel */}
      {(selected || loadingDetail) && (
        <div className="adm-panel-overlay" onClick={() => { setSelected(null); }}>
          <div className="adm-panel" onClick={(e) => e.stopPropagation()}>
            <div className="adm-panel-hd">
              <h2 className="adm-panel-title">
                {selected ? selected.name : 'Carregando…'}
              </h2>
              <button type="button" className="adm-panel-close" onClick={() => setSelected(null)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {loadingDetail && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
                <span className="adm-spinner" />
              </div>
            )}

            {selected && (
              <div className="adm-panel-body">
                {/* Status badges */}
                <div style={{ display: 'flex', gap: 6, marginBottom: 20, flexWrap: 'wrap' }}>
                  {selected.isAdmin && <span className="adm-badge adm-badge--admin">Admin</span>}
                  {selected.emailVerifiedAt
                    ? <span className="adm-badge adm-badge--verified">E-mail verificado</span>
                    : <span className="adm-badge adm-badge--unverified">E-mail não verificado</span>}
                  {isLocked(selected) && <span className="adm-badge adm-badge--locked">Conta bloqueada</span>}
                </div>

                <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 11, color: '#6B5F5C', margin: '0 0 16px' }}>
                  Cadastrado em {formatDate(selected.createdAt)}
                </p>

                {/* Edit form */}
                <form onSubmit={handleSave}>
                  <p className="adm-section-title">Dados do usuário</p>

                  <div className="adm-field">
                    <label className="adm-label" htmlFor="edit-name">Nome</label>
                    <input
                      id="edit-name"
                      type="text"
                      className="adm-input"
                      value={editForm.name}
                      onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                    />
                  </div>

                  <div className="adm-field">
                    <label className="adm-label" htmlFor="edit-email">E-mail</label>
                    <input
                      id="edit-email"
                      type="email"
                      className="adm-input"
                      value={editForm.email}
                      onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                    />
                  </div>

                  <div className="adm-checkbox-row">
                    <input
                      id="edit-admin"
                      type="checkbox"
                      className="adm-checkbox"
                      checked={editForm.isAdmin}
                      onChange={(e) => setEditForm((f) => ({ ...f, isAdmin: e.target.checked }))}
                    />
                    <label htmlFor="edit-admin" className="adm-checkbox-label">Acesso administrativo</label>
                  </div>

                  {saveMsg && <p className="adm-message adm-message--success" style={{ marginTop: 12 }}>{saveMsg}</p>}
                  {saveError && <p className="adm-message adm-message--error" style={{ marginTop: 12 }}>{saveError}</p>}

                  <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                    <button type="submit" className="adm-btn adm-btn--primary" disabled={saving}>
                      {saving ? <span className="adm-spinner" style={{ borderTopColor: '#050505', borderColor: 'rgba(5,5,5,0.3)', width: 13, height: 13 }} /> : 'Salvar'}
                    </button>
                    {isLocked(selected) && (
                      <button
                        type="button"
                        className="adm-btn adm-btn--ghost"
                        disabled={saving}
                        onClick={() => void handleUnlock()}
                      >
                        Desbloquear
                      </button>
                    )}
                  </div>
                </form>

                {/* Recent orders */}
                {selected.orders.length > 0 && (
                  <>
                    <p className="adm-section-title">Pedidos recentes</p>
                    <div className="adm-table-wrap">
                      <table className="adm-table" style={{ fontSize: 12 }}>
                        <thead>
                          <tr>
                            <th>Pedido</th>
                            <th>Status</th>
                            <th>Total</th>
                            <th>Data</th>
                          </tr>
                        </thead>
                        <tbody>
                          {selected.orders.map((o) => (
                            <tr key={o.id}>
                              <td style={{ fontFamily: 'monospace', fontSize: 11 }}>#{o.id.slice(0, 8).toUpperCase()}</td>
                              <td>
                                <span className={`adm-badge adm-badge--${o.status.toLowerCase()}`}>
                                  {STATUS_LABELS[o.status] || o.status}
                                </span>
                              </td>
                              <td>{formatCurrency(o.total)}</td>
                              <td>{formatDate(o.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* Delete */}
                <p className="adm-section-title" style={{ marginTop: 28 }}>Zona de risco</p>
                {!confirmDelete ? (
                  <button
                    type="button"
                    className="adm-btn adm-btn--danger"
                    onClick={() => setConfirmDelete(true)}
                  >
                    Excluir usuário
                  </button>
                ) : (
                  <div style={{ background: 'rgba(239,139,160,0.06)', border: '0.5px solid rgba(239,139,160,0.2)', padding: 16 }}>
                    <p style={{ fontFamily: "var(--adm-font-ui)", fontSize: 13, color: '#EF8BA0', margin: '0 0 12px', lineHeight: 1.5 }}>
                      Confirmar exclusão de <strong>{selected.name}</strong>? Esta ação não pode ser desfeita.
                    </p>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button
                        type="button"
                        className="adm-btn adm-btn--danger"
                        disabled={deleting}
                        onClick={() => void handleDelete()}
                      >
                        {deleting ? 'Excluindo…' : 'Confirmar exclusão'}
                      </button>
                      <button type="button" className="adm-btn adm-btn--ghost" onClick={() => setConfirmDelete(false)}>
                        Cancelar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
