import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminShell from '../components/AdminShell';
import { adminApi } from '../lib/api';

type LevelItem = {
  code: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  name: string;
  description: string;
  unitCount: number;
};

export default function LevelsPage() {
  const [levels, setLevels] = useState<LevelItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadLevels = async () => {
    setError(null);
    setIsLoading(true);

    try {
      const response = await adminApi.get('/api/admin/levels');
      setLevels(response.data.levels ?? []);
    } catch {
      setError('Không tải được danh sách cấp độ.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void loadLevels();
  }, []);

  return (
    <AdminShell
      title="Cấp độ"
      subtitle=""
    >
      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      <section className="card admin-section admin-level-overview-hero">

        <h2 className="admin-level-overview-title">
          Quản lý cấp độ
        </h2>

        <p className="admin-level-overview-subtitle">
          Theo dõi lộ trình CEFR và quản lý các cấp độ học tập
          của hệ thống LingoUp.
        </p>

      </section>

      <section className="card admin-section">

        <div className="admin-level-overview-grid">

          {levels.map((level) => (
            <Link
              key={level.code}
              href={`/levels/${level.code}`}
              className="admin-level-overview-card"
              title={`Chỉnh sửa ${level.code}`}
            >

              <div
                className={`admin-level-overview-badge admin-level-overview-badge-${level.code.toLowerCase()}`}
              >
                {level.code}
              </div>

              <div className="admin-level-overview-meta">

                <h3>{level.name}</h3>

                <p>{level.description}</p>

              </div>

              <div className="admin-level-overview-footer">

                <span className="chip">
                  {level.unitCount} chủ đề
                </span>

                <span className="admin-level-overview-cta">
                  Mở
                </span>

              </div>

            </Link>
          ))}

        </div>

        {isLoading ? (
          <div
            className="muted"
            style={{ marginTop: 12 }}
          >
            Đang tải danh sách cấp độ...
          </div>
        ) : null}

        {!isLoading && !levels.length && !error ? (
          <div
            className="muted"
            style={{ marginTop: 12 }}
          >
            Không tìm thấy cấp độ nào.
          </div>
        ) : null}

      </section>
    </AdminShell>
  );
}