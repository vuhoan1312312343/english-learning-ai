import { useEffect, useMemo, useState } from 'react';
import AdminShell from '../components/AdminShell';
import { adminApi } from '../lib/api';
import { LessonItem, QuestionItem, UnitItem, UserItem } from '../lib/admin-types';

export default function StatsPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [lessons, setLessons] = useState<LessonItem[]>([]);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setError(null);
        setIsLoading(true);
        const [usersRes, unitsRes] = await Promise.all([
          adminApi.get('/api/admin/users'),
          adminApi.get('/api/admin/units'),
        ]);
        const nextUsers = usersRes.data.users ?? [];
        const nextUnits = unitsRes.data.units ?? [];
        setUsers(nextUsers);
        setUnits(nextUnits);

        const lessonResponses = await Promise.all(
          nextUnits.map((unit: UnitItem) => adminApi.get(`/api/admin/units/${unit.unitNumber}/lessons`)),
        );

        const allLessons = lessonResponses.flatMap((response) => (response.data.lessons ?? []) as LessonItem[]);
        setLessons(allLessons);

        const allQuestions: QuestionItem[] = [];
        const chunkSize = 20;
        for (let i = 0; i < allLessons.length; i += chunkSize) {
          const lessonChunk = allLessons.slice(i, i + chunkSize);
          const chunkResponses = await Promise.all(
            lessonChunk.map((lesson) => adminApi.get(`/api/admin/lessons/${lesson._id}/questions`)),
          );
          for (const response of chunkResponses) {
            allQuestions.push(...((response.data.questions ?? []) as QuestionItem[]));
          }
        }

        setQuestions(allQuestions);
      } catch {
        setError('Unable to load analytics data. Please try again.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const levelStats = useMemo(() => {
    const map = new Map<string, number>();
    const order = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2'];
    for (const user of users) {
      map.set(user.level, (map.get(user.level) ?? 0) + 1);
    }
    return order.map((level) => [level, map.get(level) ?? 0] as const);
  }, [users]);

  const questionTypeStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const question of questions) {
      map.set(question.type, (map.get(question.type) ?? 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [questions]);

  const questionTotal = useMemo(() => questionTypeStats.reduce((sum, [, value]) => sum + value, 0), [questionTypeStats]);

  const overviewMax = useMemo(
    () => Math.max(users.length, units.length, lessons.length, questions.length, 1),
    [users.length, units.length, lessons.length, questions.length],
  );

  const overviewCards = [
    { key: 'users', label: 'Users', value: users.length, color: '#2563eb' },
    { key: 'units', label: 'Units', value: units.length, color: '#0f766e' },
    { key: 'lessons', label: 'Lessons', value: lessons.length, color: '#16a34a' },
    { key: 'questions', label: 'Questions', value: questions.length, color: '#b45309' },
  ];

  return (
    <AdminShell title="Analytics" subtitle="">
      {error ? <div className="alert alert-error">{error}</div> : null}

      <section className="card admin-section admin-stats-toolbar">
        <div className="admin-stats-toolbar-head">
          <h2>Phân tích toàn hệ thống</h2>
          <p>Tất cả các biểu đồ bên dưới đều được tính toán dựa trên toàn bộ nền tảng, chứ không phải chỉ một đơn vị hoặc bài học riêng lẻ.</p>
        </div>
      </section>

      <section className="card admin-section">
        <div className="admin-stats-overview-grid">
          {overviewCards.map((card) => {
            const ratio = Math.round((card.value / overviewMax) * 100);
            return (
              <article key={card.key} className="admin-stats-overview-card">
                <div className="admin-stats-donut" style={{ background: `conic-gradient(${card.color} ${ratio}%, #e6edf5 0)` }}>
                  <div className="admin-stats-donut-inner">{ratio}%</div>
                </div>
                <div>
                  <div className="muted">{card.label}</div>
                  <div className="panel-title" style={{ margin: '4px 0 0' }}>{isLoading ? '...' : card.value}</div>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="card admin-section admin-stats-chart-card">
        <h3>Phân phối cấp độ người dùng</h3>
        <div className="admin-stats-level-bars">
          {levelStats.map(([level, count]) => {
            const percent = users.length ? Math.round((count / users.length) * 100) : 0;
            return (
              <div key={level} className="admin-stats-level-row">
                <span className="admin-stats-level-label">{level}</span>
                <div className="admin-stats-level-track">
                  <div className="admin-stats-level-fill" style={{ width: `${percent}%` }} />
                </div>
                <span className="admin-stats-level-value">{count}</span>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card admin-section admin-stats-chart-card">
        <h3>Kết hợp loại câu hỏi</h3>
        {questionTypeStats.length === 0 ? (
          <div className="muted">No question data available for chart rendering.</div>
        ) : (
          <div className="admin-stats-type-chart">
            {questionTypeStats.slice(0, 10).map(([type, count]) => {
              const percent = questionTotal ? Math.max(8, Math.round((count / questionTotal) * 100)) : 0;
              return (
                <div key={type} className="admin-stats-type-col">
                  <div className="admin-stats-type-bar-wrap">
                    <div className="admin-stats-type-bar" style={{ height: `${percent}%` }} />
                  </div>
                  <div className="admin-stats-type-value">{count}</div>
                  <div className="admin-stats-type-label" title={type}>{type}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </AdminShell>
  );
}
