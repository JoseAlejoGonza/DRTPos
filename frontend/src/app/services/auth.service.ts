import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface User {
  id: number;
  username: string;
  full_name: string;
  user_type: 'admin' | 'general';
  created_at: string;
  last_login?: string;
  is_active: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor() {
    // Verificar si hay sesión almacenada al iniciar
    this.checkStoredSession();
  }

  private checkStoredSession() {
    try {
      const storedUser = sessionStorage.getItem('currentUser');
      if (storedUser) {
        const user = JSON.parse(storedUser);
        this.currentUserSubject.next(user);
      }
    } catch (error) {
      console.error('Error loading stored session:', error);
      this.logout();
    }
  }

  async login(username: string, password: string): Promise<{ success: boolean; error?: string; user?: User }> {
    try {
      const result = await (window as any).api.login(username, password);
      
      if (result.success && result.user) {
        const user: User = result.user;
        this.currentUserSubject.next(user);
        sessionStorage.setItem('currentUser', JSON.stringify(user));
        return { success: true, user };
      } else {
        return { success: false, error: result.error || 'Credenciales incorrectas' };
      }
    } catch (error: any) {
      return { success: false, error: error.message || 'Error de conexión' };
    }
  }

  logout() {
    this.currentUserSubject.next(null);
    sessionStorage.removeItem('currentUser');
  }

  getCurrentUser(): User | null {
    return this.currentUserSubject.value;
  }

  isLoggedIn(): boolean {
    return this.getCurrentUser() !== null;
  }

  isAdmin(): boolean {
    const user = this.getCurrentUser();
    return user ? user.user_type === 'admin' : false;
  }

  isGeneral(): boolean {
    const user = this.getCurrentUser();
    return user ? user.user_type === 'general' : false;
  }

  canAccessSettings(): boolean {
    return this.isAdmin();
  }

  canAccessAllReports(): boolean {
    return this.isAdmin();
  }

  canAccessUserManagement(): boolean {
    return this.isAdmin();
  }

  // Métodos para gestión de usuarios (solo admin)
  async getAllUsers() {
    if (!this.isAdmin()) {
      throw new Error('Acceso denegado');
    }
    return await (window as any).api.getAllUsers();
  }

  async createUser(userData: Partial<User> & { password: string }) {
    if (!this.isAdmin()) {
      throw new Error('Acceso denegado');
    }
    return await (window as any).api.createUser(userData);
  }

  async updateUser(userData: Partial<User> & { password?: string }) {
    if (!this.isAdmin()) {
      throw new Error('Acceso denegado');
    }
    return await (window as any).api.updateUser(userData);
  }

  async deleteUser(id: number) {
    if (!this.isAdmin()) {
      throw new Error('Acceso denegado');
    }
    return await (window as any).api.deleteUser(id);
  }

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    return await (window as any).api.changePassword(userId, currentPassword, newPassword);
  }
}