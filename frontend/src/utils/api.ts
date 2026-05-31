import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

export const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (data: { email: string; password: string; name: string }) => 
    api.post('/api/auth/register', data),
  login: (data: { email: string; password: string }) => 
    api.post('/api/auth/login', data),
  getCurrentUser: () => api.get('/api/auth/me'),
  updateLevel: (level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2') =>
    api.patch('/api/auth/level', { level }),
  updateProfile: (data: { name?: string; avatar?: string }) =>
    api.patch('/api/auth/profile', data),
  uploadAvatar: (file: File) => {
    const form = new FormData();
    form.append('avatar', file);
    return api.post('/api/auth/upload-avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  changePassword: (data: { currentPassword: string; newPassword: string }) =>
    api.post('/api/auth/change-password', data),
  getLearningStats: () => api.get('/api/auth/learning-stats'),
  updateLearningStats: (data: {
    goalXp?: 1 | 10 | 20 | 30 | 50;
    xpByDate?: Record<string, number>;
  }) => api.patch('/api/auth/learning-stats', data),
  logout: () => api.post('/api/auth/logout'),
};

// Lesson API
export const lessonAPI = {
  getUnits: (level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2') =>
    api.get('/api/units', {
      params: level ? { level } : undefined,
    }),
  getUnit: (unitNumber: number, level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2') =>
    api.get(`/api/units/${unitNumber}`, {
      params: level ? { level } : undefined,
    }),
  getLessonsByUnit: (unitNumber: number, level?: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2') =>
    api.get(`/api/units/${unitNumber}/lessons`, {
      params: level ? { level } : undefined,
    }),
  getLesson: (lessonId: string) => api.get(`/api/lessons/${lessonId}`),
  getLessonQuestions: (lessonId: string) => api.get(`/api/lessons/${lessonId}/questions`),
  saveProgress: (data: {
    lessonId: string;
    completed: boolean;
    score: number;
    totalQuestions: number;
    correctAnswers: number;
    incorrectAnswers: number;
    timeSpent: number;
  }) => api.post('/api/progress', data),
  getProgress: () => api.get('/api/progress'),
  getAdminUnitSections: (unitNumber: number) =>
    api.get(`/api/admin/units/${unitNumber}/sections`),
  updateAdminUnitSections: (
    unitNumber: number,
    sections: Array<
      | 'vocabulary'
      | 'reading'
      | 'speaking'
      | 'writing'
      | 'grammar-focus'
      | 'practice'
      | 'unit-review'
    >,
  ) => api.patch(`/api/admin/units/${unitNumber}/sections`, { sections }),
  resetAdminUnitSections: (unitNumber: number) =>
    api.post(`/api/admin/units/${unitNumber}/sections/reset`),
};

export const postAPI = {
  getPosts: () => api.get('/api/posts'),
  createPost: (data: {
    content: string;
    type?: 'text' | 'image' | 'mixed' | 'question';
    visibility?: 'public' | 'followers' | 'private';
    images?: string[];
    location?: string;
    isPinned?: boolean;
  }) => api.post('/api/posts', data),
  updatePost: (
    postId: string,
    data: {
      content?: string;
      visibility?: 'public' | 'followers' | 'private';
      images?: string[];
      location?: string;
      isPinned?: boolean;
    }
  ) => api.put(`/api/posts/${postId}`, data),
  deletePost: (postId: string) => api.delete(`/api/posts/${postId}`),
  toggleLike: (postId: string) => api.post(`/api/posts/${postId}/like`),
  getComments: (postId: string) => api.get(`/api/posts/${postId}/comments`),
  addComment: (postId: string, content: string) =>
    api.post(`/api/posts/${postId}/comments`, { content }),
};

export const userAPI = {
  getSuggestions: () => api.get('/api/users/suggestions'),
  getLeaderboard: () => api.get('/api/users/leaderboard'),
  getProfile: (userId: string) => api.get(`/api/users/${userId}`),
  getUserPosts: (userId: string) => api.get(`/api/users/${userId}/posts`),
  getFollowingList: (userId: string) => api.get(`/api/users/${userId}/following`),
  getFollowersList: (userId: string) => api.get(`/api/users/${userId}/followers`),
  followUser: (userId: string) => api.post(`/api/users/${userId}/follow`),
  unfollowUser: (userId: string) => api.delete(`/api/users/${userId}/follow`),
};

export const messageAPI = {
  getConversations: () => api.get('/api/messages/conversations'),
  openConversation: (userId: string) =>
    api.post('/api/messages/conversations/open', { userId }),
  getMessages: (conversationId: string) =>
    api.get(`/api/messages/conversations/${conversationId}/messages`),
  sendMessage: (conversationId: string, content: string, clientMessageId: string) =>
    api.post(`/api/messages/conversations/${conversationId}/messages`, { content, clientMessageId }),
};

export const getGoogleAuthUrl = () => {
  return `${API_URL}/api/auth/google`;
};
