export interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  googleId?: string;
  level: 'A1' | 'A2' | 'B1' | 'B2' | 'C1' | 'C2';
  createdAt: Date;
  updatedAt: Date;
}

export interface AuthRequest {
  email: string;
  password?: string;
  name?: string;
}

export interface AuthResponse {
  success: boolean;
  message: string;
  token?: string;
  user?: User;
}
