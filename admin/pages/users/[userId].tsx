import Link from 'next/link';
import { useRouter } from 'next/router';
import { ReactNode, useEffect, useMemo, useState } from 'react';
import AdminShell from '../../components/AdminShell';
import { adminApi } from '../../lib/api';

type UserDetail = {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  createdAt?: string;
};

type UserStats = {
  totalLessons: number;
  completedLessons: number;
  averageScore: number;
  totalTimeSpentSeconds: number;
  totalCorrectAnswers: number;
};

type UserDetailResponse = {
  user: UserDetail;
  profile: {
    followingCount: number;
    followersCount: number;
    stats: UserStats;
  };
};

const MetaIcon = ({ children, className }: { children: ReactNode; className?: string }) => (
  <span className={`admin-meta-icon ${className ?? ''}`.trim()} aria-hidden="true">{children}</span>
);

const CalendarSvg = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <rect x="4" y="6" width="16" height="14" rx="3" stroke="currentColor" strokeWidth="2" />
    <path d="M8 4V8M16 4V8M4 11H20" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const UsersSvg = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="2" />
    <circle cx="17" cy="9" r="2.5" stroke="currentColor" strokeWidth="2" />
    <path d="M4 19C4 16.2 6.2 14 9 14C11.8 14 14 16.2 14 19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M14.5 18.5C14.5 16.8 15.8 15.5 17.5 15.5C19.2 15.5 20.5 16.8 20.5 18.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

const CheckSvg = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M5 12L10 17L19 8" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ListSvg = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M9 7H19M9 12H19M9 17H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="5" cy="7" r="1.5" fill="currentColor" />
    <circle cx="5" cy="12" r="1.5" fill="currentColor" />
    <circle cx="5" cy="17" r="1.5" fill="currentColor" />
  </svg>
);

const TargetSvg = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="2" />
    <circle cx="12" cy="12" r="1.6" fill="currentColor" />
  </svg>
);

const ClockSvg = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" />
    <path d="M12 8V12L14.8 14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const BoltSvg = () => (
  <svg viewBox="0 0 24 24" fill="none">
    <path d="M13.5 3L6.5 13H11L10.5 21L17.5 11H13L13.5 3Z" fill="currentColor" />
  </svg>
);

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

const formatJoinedDate = (date?: string) => {
  if (!date) return 'Unknown';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 'Unknown';
  return parsed.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
};

const formatTimeSpent = (seconds: number) => {
  if (!seconds || seconds <= 0) return '0m';
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remainMins = mins % 60;
  return `${hours}h ${remainMins}m`;
};

export default function UserDetailPage() {
  const router = useRouter();
  const { userId } = router.query;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<UserDetailResponse | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!router.isReady || !userId || typeof userId !== 'string') return;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await adminApi.get(`/api/admin/users/${userId}`);
        setData(response.data as UserDetailResponse);
      } catch {
        setError('Khong tai duoc thong tin user.');
      } finally {
        setLoading(false);
      }
    })();
  }, [router.isReady, userId]);

  const avatarUrl = useMemo(() => buildAvatarUrl(data?.user.avatar), [data?.user.avatar]);

  const deleteUser = async () => {
    if (!data?.user || typeof userId !== 'string') return;

    const confirmed = window.confirm(
      `Delete account "${data.user.name}" (${data.user.email})?\n\nThis removes the user and related posts, messages, progress, and follows. This action cannot be undone.`,
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);

    try {
      await adminApi.delete(`/api/admin/users/${userId}`);
      await router.push('/users');
    } catch {
      setError('Khong xoa duoc user nay.');
      setDeleting(false);
    }
  };

  return (
    <AdminShell title="Thong tin nguoi dung" subtitle="Trang profile chi tiet cua user trong he thong admin">
      <section className="card admin-section">
        <div className="split" style={{ marginBottom: 12 }}>
          <Link href="/users" className="btn btn-secondary" style={{ display: 'inline-flex' }}>
            Back
          </Link>
          {!loading && !error && data ? (
            <button
              type="button"
              className="btn btn-danger"
              onClick={() => void deleteUser()}
              disabled={deleting}
            >
              {deleting ? 'Deleting...' : 'Delete account'}
            </button>
          ) : null}
        </div>

        {loading ? <div className="muted">Dang tai thong tin user...</div> : null}
        {error ? <div className="alert alert-error">{error}</div> : null}

        {!loading && !error && data ? (
          <>
            <div className="admin-user-profile-top">
              <div className="admin-user-profile-avatar-wrap">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={data.user.name} className="admin-user-profile-avatar" />
                ) : (
                  <div className="admin-user-profile-avatar admin-user-avatar-fallback">{getInitials(data.user.name)}</div>
                )}
              </div>

              <div className="admin-user-profile-main">
                <h2 className="admin-user-profile-name">{data.user.name}</h2>
                <div className="admin-user-handle">{data.user.email.split('@')[0]}</div>
                <div className="row" style={{ alignItems: 'center', marginBottom: 8 }}>
                  <span className="chip">{data.user.level}</span>
                </div>
                <div className="admin-user-profile-line muted admin-user-profile-line-icon">
                  <MetaIcon className="is-joined"><CalendarSvg /></MetaIcon>
                  <span>Joined {formatJoinedDate(data.user.createdAt)}</span>
                </div>
                <div className="admin-user-profile-line muted admin-user-profile-line-icon">
                  <MetaIcon className="is-friends"><UsersSvg /></MetaIcon>
                  <span>{data.profile.followingCount} Following / {data.profile.followersCount} Followers</span>
                </div>
              </div>
            </div>

            <div className="admin-user-stats-title">Statistics</div>
            <div className="admin-user-stats-grid">
              <div className="admin-user-stat-card">
                <div className="admin-user-stat-row">
                  <MetaIcon className="is-done"><CheckSvg /></MetaIcon>
                  <div>
                    <div className="admin-user-stat-value">{data.profile.stats.completedLessons}</div>
                    <div className="muted">Completed lessons</div>
                  </div>
                </div>
              </div>
              <div className="admin-user-stat-card">
                <div className="admin-user-stat-row">
                  <MetaIcon className="is-attempt"><ListSvg /></MetaIcon>
                  <div>
                    <div className="admin-user-stat-value">{data.profile.stats.totalLessons}</div>
                    <div className="muted">Total attempts</div>
                  </div>
                </div>
              </div>
              <div className="admin-user-stat-card">
                <div className="admin-user-stat-row">
                  <MetaIcon className="is-score"><TargetSvg /></MetaIcon>
                  <div>
                    <div className="admin-user-stat-value">{data.profile.stats.averageScore}</div>
                    <div className="muted">Average score</div>
                  </div>
                </div>
              </div>
              <div className="admin-user-stat-card">
                <div className="admin-user-stat-row">
                  <MetaIcon className="is-time"><ClockSvg /></MetaIcon>
                  <div>
                    <div className="admin-user-stat-value">{formatTimeSpent(data.profile.stats.totalTimeSpentSeconds)}</div>
                    <div className="muted">Time spent</div>
                  </div>
                </div>
              </div>
              <div className="admin-user-stat-card">
                <div className="admin-user-stat-row">
                  <MetaIcon className="is-correct"><BoltSvg /></MetaIcon>
                  <div>
                    <div className="admin-user-stat-value">{data.profile.stats.totalCorrectAnswers}</div>
                    <div className="muted">Correct answers</div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : null}
      </section>
    </AdminShell>
  );
}
