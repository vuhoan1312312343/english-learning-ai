import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import AdminShell from '../components/AdminShell';
import { adminApi } from '../lib/api';
import { UserItem } from '../lib/admin-types';

const USERS_PER_PAGE = 10;

const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

const buildAvatarUrl = (avatar?: string) => {
  if (!avatar) return null;
  if (/^https?:\/\//i.test(avatar)) return avatar;
  if (avatar.startsWith('/')) return `${backendBaseUrl}${avatar}`;
  return `${backendBaseUrl}/${avatar}`;
};

const getInitials = (name: string) =>
  name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

export default function UsersPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [searchText, setSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);

  const loadUsers = async () => {
    const response = await adminApi.get('/api/admin/users');
    setUsers(response.data.users ?? []);
  };

  useEffect(() => {
    void loadUsers();
  }, []);

  const deleteUser = async (user: UserItem) => {
    const confirmed = window.confirm(
      `Delete account "${user.name}" (${user.email})?\n\nThis removes the user and related posts, messages, progress, and follows. This action cannot be undone.`,
    );
    if (!confirmed) return;

    setError(null);
    setMessage(null);
    setDeletingUserId(user._id);

    try {
      await adminApi.delete(`/api/admin/users/${user._id}`);
      setUsers((currentUsers) => currentUsers.filter((item) => item._id !== user._id));
      setMessage(`Deleted ${user.name}.`);
    } catch (deleteError) {
      setError('Khong xoa duoc user nay.');
    } finally {
      setDeletingUserId(null);
    }
  };

  const filteredUsers = useMemo(() => {
    const keyword = searchText.trim().toLowerCase();
    if (!keyword) return users;

    return users.filter((user) => {
      const haystack = `${user.name} ${user.email} ${user.level}`.toLowerCase();
      return haystack.includes(keyword);
    });
  }, [users, searchText]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / USERS_PER_PAGE));

  const pagedUsers = useMemo(() => {
    const start = (page - 1) * USERS_PER_PAGE;
    return filteredUsers.slice(start, start + USERS_PER_PAGE);
  }, [filteredUsers, page]);

  useEffect(() => {
    setPage(1);
  }, [searchText]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pageNumbers = useMemo(() => {
    const nums: number[] = [];
    for (let i = 1; i <= totalPages; i += 1) nums.push(i);
    return nums;
  }, [totalPages]);

  return (
    <AdminShell title="Users" subtitle="">
      {error && <div className="alert alert-error">{error}</div>}
      {message && <div className="alert alert-success">{message}</div>}

      <section className="card admin-section">
        <div className="split" style={{ marginBottom: 14 }}>
          <h2 className="section-title" style={{ margin: 0 }}>Users list</h2>
          <span className="chip">{filteredUsers.length}/{users.length} users</span>
        </div>

        <div className="admin-users-toolbar">
          <input
            className="input"
            placeholder="Search"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
          <div className="muted">Page {page}/{totalPages}</div>
        </div>

        {pagedUsers.length === 0 ? (
          <div className="card surface-soft" style={{ marginTop: 12 }}>
            No matching users found.
          </div>
        ) : (
          <div className="admin-users-grid" style={{ marginTop: 12 }}>
            {pagedUsers.map((user) => {
              const avatarUrl = buildAvatarUrl(user.avatar);

              return (
                <div key={user._id} className="admin-user-card">
                  <div className="admin-user-avatar-wrap">
                    {avatarUrl ? (
                      <img src={avatarUrl} alt={user.name} className="admin-user-avatar" />
                    ) : (
                      <div className="admin-user-avatar admin-user-avatar-fallback">{getInitials(user.name)}</div>
                    )}

                    <div className="admin-user-hover-actions">
                      <Link
                        href={`/users/${user._id}`}
                        className="admin-hover-icon-btn admin-hover-icon-view"
                        title="View information"
                        aria-label="View information"
                      >
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M2.5 12C4.7 8.2 8 6 12 6C16 6 19.3 8.2 21.5 12C19.3 15.8 16 18 12 18C8 18 4.7 15.8 2.5 12Z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                          <circle cx="12" cy="12" r="3" fill="white" />
                        </svg>
                      </Link>
                      <button
                        type="button"
                        className="admin-hover-icon-btn admin-hover-icon-delete"
                        title="Delete account"
                        aria-label="Delete account"
                        disabled={deletingUserId === user._id}
                        onClick={() => void deleteUser(user)}
                      >
                        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
                          <path d="M5 7H19" stroke="white" strokeWidth="2" strokeLinecap="round" />
                          <path d="M9 7V5H15V7" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          <path d="M8 10V18M12 10V18M16 10V18" stroke="white" strokeWidth="2" strokeLinecap="round" />
                          <path d="M7 7L8 21H16L17 7" stroke="white" strokeWidth="2" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </div>
                  </div>

                  <div className="admin-user-meta">
                    <div className="admin-user-name-row">
                      <div className="admin-user-name" title={user.name}>{user.name}</div>
                      <span className="chip">{user.level}</span>
                    </div>
                    <div className="muted admin-user-email" title={user.email}>{user.email}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="admin-pagination" style={{ marginTop: 16 }}>
          <button className="btn btn-secondary" disabled={page <= 1} onClick={() => setPage((prev) => Math.max(1, prev - 1))}>
            Prev
          </button>
          <div className="admin-page-list">
            {pageNumbers.map((pageNumber) => (
              <button
                key={pageNumber}
                className={`admin-page-btn ${pageNumber === page ? 'is-active' : ''}`}
                onClick={() => setPage(pageNumber)}
              >
                {pageNumber}
              </button>
            ))}
          </div>
          <button className="btn btn-secondary" disabled={page >= totalPages} onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}>
            Next
          </button>
        </div>
      </section>
    </AdminShell>
  );
}
