import Link from 'next/link';
import { useEffect, useState } from 'react';
import AdminShell from '../components/AdminShell';
import { adminApi } from '../lib/api';
import { UnitItem, UserItem } from '../lib/admin-types';

type SummaryCard = {
  id: string;
  title: string;
  value: number;
  note: string;
  href: string;
  cta: string;
  tone: 'blue' | 'green' | 'amber' | 'rose' | 'indigo' | 'teal';
};

type IconName =
  | 'users'
  | 'levels'
  | 'units'
  | 'lessons'
  | 'questions'
  | 'stats'
  | 'bolt'
  | 'chart';

const DashboardIcon = ({ name }: { name: IconName }) => {
  switch (name) {
    case 'users':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M16 19a4 4 0 0 1 4 4M12 14a5 5 0 1 0 0-10a5 5 0 0 0 0 10ZM4 23a8 8 0 0 1 16 0"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'levels':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 19h16M6 16l3-4l3 2l6-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'units':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 5h7v7H4zM13 5h7v7h-7zM4 14h7v7H4zM13 14h7v7h-7z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'lessons':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M6 4h12a2 2 0 0 1 2 2v12H8a2 2 0 0 0-2 2V4Zm0 16a2 2 0 0 1 2-2h12"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    case 'questions':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M12 18h.01M9.1 9a3 3 0 1 1 4.88 2.36c-.8.65-1.36 1.13-1.36 2.14v.5"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.9"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle
            cx="12"
            cy="12"
            r="9"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
          />
        </svg>
      );

    case 'stats':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M5 20V10M12 20V4M19 20v-7"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );

    case 'bolt':
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M13 2L4 14h6l-1 8l9-12h-6l1-8Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true">
          <path
            d="M4 20h16M7 16v-4m5 4V8m5 8V6"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
        </svg>
      );
  }
};

export default function DashboardPage() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [units, setUnits] = useState<UnitItem[]>([]);
  const [lessonCount, setLessonCount] = useState(0);
  const [questionCount, setQuestionCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      try {
        setIsLoading(true);
        setError(null);

        const [usersRes, unitsRes] = await Promise.all([
          adminApi.get('/api/admin/users'),
          adminApi.get('/api/admin/units'),
        ]);

        const nextUsers = usersRes.data.users ?? [];
        const nextUnits = unitsRes.data.units ?? [];

        setUsers(nextUsers);
        setUnits(nextUnits);

        const sampledUnits = nextUnits.slice(0, 6);

        const lessonResponses = await Promise.all(
          sampledUnits.map((unit: UnitItem) =>
            adminApi.get(`/api/admin/units/${unit.unitNumber}/lessons`)
          )
        );

        let lessonsTotal = 0;
        let questionsTotal = 0;

        for (const lessonsRes of lessonResponses) {
          const lessons = lessonsRes.data.lessons ?? [];

          lessonsTotal += lessons.length;

          const sampledLessons = lessons.slice(0, 10);

          const questionResponses = await Promise.all(
            sampledLessons.map((lesson: { _id: string }) =>
              adminApi.get(`/api/admin/lessons/${lesson._id}/questions`)
            )
          );

          for (const questionsRes of questionResponses) {
            questionsTotal += (questionsRes.data.questions ?? []).length;
          }
        }

        setLessonCount(lessonsTotal);
        setQuestionCount(questionsTotal);

      } catch {
        setError('Không thể tải dữ liệu dashboard. Vui lòng thử lại.');
      } finally {
        setIsLoading(false);
      }
    })();
  }, []);

  const cards: SummaryCard[] = [
    {
      id: 'users',
      title: 'Người dùng',
      value: users.length,
      note: 'Quản lý tài khoản và hồ sơ học viên.',
      href: '/users',
      cta: 'Mở người dùng',
      tone: 'blue',
    },
    {
      id: 'levels',
      title: 'Cấp độ',
      value: units.length,
      note: 'Quản lý tiến trình và cấp độ học.',
      href: '/levels',
      cta: 'Mở cấp độ',
      tone: 'indigo',
    },
    {
      id: 'units',
      title: 'Chủ đề',
      value: units.length,
      note: 'Quản lý cấu trúc bài học và nội dung.',
      href: '/units',
      cta: 'Mở chủ đề',
      tone: 'teal',
    },
    {
      id: 'lessons',
      title: 'Bài học',
      value: lessonCount,
      note: 'Theo dõi số lượng bài học trong hệ thống.',
      href: '/lessons',
      cta: 'Mở bài học',
      tone: 'green',
    },
    {
      id: 'questions',
      title: 'Câu hỏi',
      value: questionCount,
      note: 'Quản lý và theo dõi ngân hàng câu hỏi.',
      href: '/lessons',
      cta: 'Quản lý câu hỏi',
      tone: 'amber',
    },
    {
      id: 'stats',
      title: 'Thống kê',
      value: users.length + units.length,
      note: 'Xem thống kê và dữ liệu toàn hệ thống.',
      href: '/stats',
      cta: 'Mở thống kê',
      tone: 'rose',
    },
  ];

  return (
    <AdminShell
      title="Bảng điều khiển"
      subtitle=""
    >
      {error ? (
        <div className="alert alert-error">
          {error}
        </div>
      ) : null}

      <section className="card admin-section admin-dashboard-hero">
        <div className="admin-dashboard-hero-copy">

          <div className="admin-dashboard-kicker">
            <span className="admin-dashboard-kicker-icon">
              <DashboardIcon name="bolt" />
            </span>

            <span>Trung tâm quản trị</span>
          </div>

          <h2 className="admin-dashboard-title">
            Toàn bộ công cụ quản lý LingoUp
          </h2>

          <p className="admin-dashboard-subtitle">
            Theo dõi hệ thống, chỉnh sửa nội dung và quản lý
            chất lượng trên một giao diện duy nhất.
          </p>

          <div className="admin-dashboard-quick-links">

            <Link href="/users" className="btn btn-secondary">
              Quản lý người dùng
            </Link>

            <Link href="/lessons" className="btn btn-primary">
              Quản lý bài học
            </Link>

            <Link href="/stats" className="btn btn-secondary">
              Phân tích dữ liệu
            </Link>

          </div>
        </div>

        <div className="admin-dashboard-hero-metrics">

          <div className="admin-dashboard-mini-card">

            <div className="admin-dashboard-mini-top">
              <span className="admin-dashboard-mini-icon">
                <DashboardIcon name="chart" />
              </span>

              <span>Tổng quan hoạt động</span>
            </div>

            <strong>
              {isLoading
                ? '...'
                : (users.length + units.length).toLocaleString()}
            </strong>

            <p>
              Tổng số người dùng và chủ đề hiện có.
            </p>
          </div>

          <div className="admin-dashboard-mini-card">

            <div className="admin-dashboard-mini-top">
              <span className="admin-dashboard-mini-icon">
                <DashboardIcon name="questions" />
              </span>

              <span>Ngân hàng câu hỏi</span>
            </div>

            <strong>
              {isLoading
                ? '...'
                : questionCount.toLocaleString()}
            </strong>

            <p>
              Tổng số câu hỏi hiện có trong hệ thống.
            </p>

          </div>
        </div>
      </section>

      <section className="card admin-section">
        <div className="admin-dashboard-grid">

          {cards.map((card) => (
            <article
              key={card.title}
              className={`admin-dashboard-card tone-${card.tone}`}
            >
              <div className="admin-dashboard-card-top">

                <span className="admin-dashboard-card-icon">
                  <DashboardIcon name={card.id as IconName} />
                </span>

                <div className="muted">
                  {card.title}
                </div>
              </div>

              <div
                className="panel-title"
                style={{ margin: '6px 0 10px' }}
              >
                {isLoading
                  ? '...'
                  : card.value.toLocaleString()}
              </div>

              <div
                className="muted"
                style={{ minHeight: 40 }}
              >
                {card.note}
              </div>

              <Link
                href={card.href}
                className="btn btn-secondary"
                style={{
                  display: 'inline-flex',
                  marginTop: 12,
                }}
              >
                {card.cta}
              </Link>
            </article>
          ))}

        </div>
      </section>
    </AdminShell>
  );
}