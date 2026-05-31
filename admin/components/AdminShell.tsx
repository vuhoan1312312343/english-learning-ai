import Link from 'next/link';
import { useRouter } from 'next/router';
import { PropsWithChildren, useEffect, useState } from 'react';
import { adminApi, getAdminToken, setAdminToken } from '../lib/api';

const NAV_ITEMS = [
  { href: '/dashboard', label: 'Home', icon: 'home' },
  { href: '/users', label: 'Users', icon: 'users' },
  { href: '/levels', label: 'Levels', icon: 'levels' },
  { href: '/units', label: 'Units', icon: 'units' },
  { href: '/lessons', label: 'Lessons and Questions', icon: 'lessons' },

  // THÊM DÒNG NÀY
  { href: '/fill-blank', label: 'Fill Blank', icon: 'fillblank' },

  { href: '/stats', label: 'Statistics', icon: 'stats' },
] as const;

const NavIcon = ({ type }: { type: (typeof NAV_ITEMS)[number]['icon'] }) => {
  switch (type) {
    case 'home':
      return (
        <span className={`admin-nav-icon admin-nav-icon-${type}`} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M4 10.5L12 4L20 10.5V20H4V10.5Z" stroke="white" strokeWidth="2" strokeLinejoin="round" />
            <path d="M9 20V13H15V20" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      );
    case 'users':
      return (
        <span className={`admin-nav-icon admin-nav-icon-${type}`} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="9" cy="8" r="3" stroke="white" strokeWidth="2" />
            <circle cx="17" cy="9" r="2.5" stroke="white" strokeWidth="2" />
            <path d="M3.5 19C3.5 15.9624 5.96243 13.5 9 13.5C12.0376 13.5 14.5 15.9624 14.5 19" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <path d="M14.5 18.5C14.5 16.567 16.067 15 18 15C19.933 15 21.5 16.567 21.5 18.5" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      );
    case 'levels':
      return (
        <span className={`admin-nav-icon admin-nav-icon-${type}`} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="8" stroke="white" strokeWidth="2" />
            <circle cx="12" cy="12" r="4" stroke="white" strokeWidth="2" />
            <circle cx="12" cy="12" r="1.5" fill="white" />
          </svg>
        </span>
      );
    case 'units':
      return (
        <span className={`admin-nav-icon admin-nav-icon-${type}`} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M8 4H4V8H8V4Z" stroke="white" strokeWidth="2" />
            <path d="M20 4H16V8H20V4Z" stroke="white" strokeWidth="2" />
            <path d="M8 16H4V20H8V16Z" stroke="white" strokeWidth="2" />
            <path d="M20 16H16V20H20V16Z" stroke="white" strokeWidth="2" />
            <path d="M10 6H14M6 10V14M18 10V14M10 18H14" stroke="white" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </span>
      );
    case 'lessons':
      return (
        <span className={`admin-nav-icon admin-nav-icon-${type}`} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M5 5.5C5 4.67157 5.67157 4 6.5 4H12V20H6.5C5.67157 20 5 19.3284 5 18.5V5.5Z" stroke="white" strokeWidth="2" />
            <path d="M19 5.5C19 4.67157 18.3284 4 17.5 4H12V20H17.5C18.3284 20 19 19.3284 19 18.5V5.5Z" stroke="white" strokeWidth="2" />
          </svg>
        </span>
      );
      case 'fillblank':
  return (
    <span className={`admin-nav-icon admin-nav-icon-${type}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none">
        <path
          d="M4 20H20"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M7 16L17 6"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
        <path
          d="M15 6H17V8"
          stroke="white"
          strokeWidth="2"
          strokeLinecap="round"
        />
      </svg>
    </span>
  );
    case 'stats':
      return (
        <span className={`admin-nav-icon admin-nav-icon-${type}`} aria-hidden="true">
          <svg viewBox="0 0 24 24" fill="none">
            <path d="M4 20H20" stroke="white" strokeWidth="2" strokeLinecap="round" />
            <rect x="6" y="11" width="3" height="7" rx="1" fill="white" />
            <rect x="11" y="8" width="3" height="10" rx="1" fill="white" />
            <rect x="16" y="5" width="3" height="13" rx="1" fill="white" />
          </svg>
        </span>
      );
  }
};

type AdminShellProps = PropsWithChildren<{
  title: string;
  subtitle: string;
}>;

export default function AdminShell({ title, subtitle, children }: AdminShellProps) {
  const router = useRouter();
  const [isRouting, setIsRouting] = useState(false);

  const isActiveRoute = (href: string) => {
    if (href === '/dashboard') return router.pathname === '/dashboard';
    return router.pathname === href || router.pathname.startsWith(`${href}/`) || router.asPath.startsWith(`${href}/`);
  };

  useEffect(() => {
    if (!getAdminToken()) {
      void router.replace('/');
      return;
    }

    let active = true;

    void (async () => {
      try {
        await adminApi.get('/api/admin/me');
      } catch {
        if (!active) return;
        setAdminToken(null);
        await router.replace('/');
      }
    })();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    const handleStart = (url: string) => {
      if (url !== router.asPath) {
        setIsRouting(true);
      }
    };
    const handleDone = () => setIsRouting(false);

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleDone);
    router.events.on('routeChangeError', handleDone);

    return () => {
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleDone);
      router.events.off('routeChangeError', handleDone);
    };
  }, [router]);

  useEffect(() => {
    if (!getAdminToken()) return;
    for (const item of NAV_ITEMS) {
      if (item.href !== router.pathname) {
        void router.prefetch(item.href);
      }
    }
  }, [router]);

  const logout = async () => {
    setAdminToken(null);
    await router.push('/');
  };

  return (
    <div className="container admin-layout">
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand-title">LingoUp Admin</div>
          <div className="subtitle">Control Panel</div>
        </div>

        <nav className="admin-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={`admin-nav-item ${isActiveRoute(item.href) ? 'is-active' : ''}`}
              onMouseEnter={() => {
                void router.prefetch(item.href);
              }}
            >
              <NavIcon type={item.icon} />
              <span className="admin-nav-text">{item.label}</span>
            </Link>
          ))}
        </nav>
      </aside>

      <main className={`admin-main ${isRouting ? 'is-routing' : ''}`}>
        <section className="card hero-card admin-section">
          <div className="page-header" style={{ marginBottom: 0 }}>
            <div>
              <h1 className="panel-title" style={{ marginBottom: 6 }}>{title}</h1>
              <p className="subtitle">{subtitle}</p>
            </div>
            <button className="btn btn-secondary" onClick={logout}>Sign out</button>
          </div>
        </section>

        {children}
      </main>
    </div>
  );
}
