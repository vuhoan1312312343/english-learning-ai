// Mock database - Replace with real database later
interface UserData {
  id: string;
  email: string;
  name: string;
  avatar?: string;
  googleId?: string;
  password?: string;
  createdAt: Date;
  updatedAt: Date;
}

class Database {
  private users: Map<string, UserData> = new Map();

  async findUserByEmail(email: string): Promise<UserData | null> {
    const users = Array.from(this.users.values());
    return users.find(u => u.email === email) || null;
  }

  async findUserByGoogleId(googleId: string): Promise<UserData | null> {
    const users = Array.from(this.users.values());
    return users.find(u => u.googleId === googleId) || null;
  }

  async findUserById(id: string): Promise<UserData | null> {
    return this.users.get(id) || null;
  }

  async createUser(userData: Omit<UserData, 'id' | 'createdAt' | 'updatedAt'>): Promise<UserData> {
    const id = Date.now().toString();
    const user: UserData = {
      ...userData,
      id,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<UserData>): Promise<UserData | null> {
    const user = this.users.get(id);
    if (!user) return null;
    
    const updatedUser = {
      ...user,
      ...updates,
      updatedAt: new Date(),
    };
    this.users.set(id, updatedUser);
    return updatedUser;
  }
}

export const db = new Database();
