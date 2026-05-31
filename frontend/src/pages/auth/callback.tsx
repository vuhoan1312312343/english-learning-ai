import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '~/stores/createAuthStore';
import { authAPI, lessonAPI } from '~/utils/api';
import { useBoundStore } from '~/hooks/useBoundStore';

export default function AuthCallback() {
  const router = useRouter();
  const { setUser, setToken } = useAuthStore();
  const setLessonsCompleted = useBoundStore((x) => x.setLessonsCompleted);

  useEffect(() => {
    const handleAuth = async () => {
      const { token, error } = router.query;

      if (error) {
        console.error('Authentication error:', error);
        router.push('/login?error=' + error);
        return;
      }

      if (token && typeof token === 'string') {
        try {
          // Save token
          setToken(token);

          // Get user info
          const response = await authAPI.getCurrentUser();
          setUser(response.data.user);

          // Get lessons completed
          try {
            const progressRes = await lessonAPI.getProgress();
            const lessonsCompleted = progressRes.data?.lessonsCompleted;
            if (typeof lessonsCompleted === 'number') {
              setLessonsCompleted(lessonsCompleted);
            }
          } catch (err) {
            // Không có API hoặc lỗi thì bỏ qua
          }

          // Redirect to home page
          router.push('/');
        } catch (error) {
          console.error('Failed to get user info:', error);
          router.push('/login?error=failed');
        }
      }
    };

    if (router.isReady) {
      handleAuth();
    }
  }, [router.isReady, router.query, setToken, setUser, router, setLessonsCompleted]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <div className="text-center">
        <div className="mb-4 text-2xl">Đang xác thực...</div>
        <div className="text-gray-500">Vui lòng chờ</div>
      </div>
    </div>
  );
}
