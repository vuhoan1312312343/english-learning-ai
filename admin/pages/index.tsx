import { FormEvent, useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { adminApi, getAdminToken, setAdminToken } from '../lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('admin');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const sessionMessage =
    router.query.expired === '1'
      ? 'Phien dang nhap admin da het han. Vui long dang nhap lai.'
      : null;

  useEffect(() => {
    if (getAdminToken()) {
      void router.replace('/dashboard');
    }
  }, [router]);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const response = await adminApi.post('/api/admin/login', { username, password });
      const token = response.data?.token as string | undefined;
      if (!token) {
        throw new Error('No token returned');
      }
      setAdminToken(token);
      await router.push('/dashboard');
    } catch (err) {
      setError('Dang nhap that bai. Kiem tra tai khoan/mat khau admin.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container" style={{ maxWidth: 560, paddingTop: 42 }}>
      <div className="card hero-card" style={{ marginBottom: 12 }}>
        <h1 className="panel-title" style={{ marginBottom: 6 }}>LingoUp Admin</h1>
        <p className="subtitle">Dang nhap de quan ly users, units, lessons, va questions.</p>
      </div>

      <div className="card">
        <h2 className="section-title" style={{ marginTop: 0 }}>Admin Login</h2>
        <p className="subtitle" style={{ marginBottom: 12 }}>Su dung tai khoan admin cua he thong backend.</p>

        <form onSubmit={onSubmit} className="grid">
          <label>
            Username
            <input className="input" value={username} onChange={(e) => setUsername(e.target.value)} />
          </label>
          <label>
            Password
            <input
              className="input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>
          {sessionMessage && !error && <div className="alert alert-info">{sessionMessage}</div>}
          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? 'Dang dang nhap...' : 'Dang nhap'}
          </button>
        </form>
      </div>
    </div>
  );
}
