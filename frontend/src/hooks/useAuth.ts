import { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthStore } from '../stores/createAuthStore';

export function useAuth() {
  const { isAuthenticated, user, token } = useAuthStore();
  return { isAuthenticated, user, token };
}

export function useRequireAuth(redirectTo: string = '/login') {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  useEffect(() => {
    if (!isAuthenticated) {
      router.push(redirectTo);
    }
  }, [isAuthenticated, redirectTo, router]);

  return { isAuthenticated };
}
