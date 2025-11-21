import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-user-management',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './user-management.component.html',
  styleUrls: ['./user-management.component.scss']
})
export class UserManagementComponent implements OnInit {
  users: User[] = [];
  isLoading: boolean = false;
  showCreateForm: boolean = false;
  showEditForm: boolean = false;
  showChangePasswordForm: boolean = false;
  
  newUser: Partial<User> & { password: string; confirmPassword: string } = {
    username: '',
    full_name: '',
    user_type: 'general',
    password: '',
    confirmPassword: '',
    is_active: true
  };
  
  editingUser: Partial<User> & { password?: string; confirmPassword?: string } = {};
  changePasswordUser: { userId: number; currentPassword: string; newPassword: string; confirmPassword: string } = {
    userId: 0,
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  };
  
  errorMessage: string = '';
  successMessage: string = '';

  constructor(private authService: AuthService) {}

  async ngOnInit() {
    await this.loadUsers();
  }

  async loadUsers() {
    this.isLoading = true;
    this.errorMessage = '';
    
    try {
      const result = await this.authService.getAllUsers();
      if (result.success) {
        this.users = result.users || [];
      } else {
        this.errorMessage = result.error || 'Error al cargar usuarios';
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'Error de conexión';
    } finally {
      this.isLoading = false;
    }
  }

  showCreateUserForm() {
    this.showCreateForm = true;
    this.showEditForm = false;
    this.showChangePasswordForm = false;
    this.resetNewUser();
    this.clearMessages();
  }

  showEditUserForm(user: User) {
    this.editingUser = {
      id: user.id,
      username: user.username,
      full_name: user.full_name,
      user_type: user.user_type,
      is_active: user.is_active
    };
    this.showEditForm = true;
    this.showCreateForm = false;
    this.showChangePasswordForm = false;
    this.clearMessages();
  }

  showChangePasswordFormFor(user: User) {
    this.changePasswordUser = {
      userId: user.id,
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    };
    this.showChangePasswordForm = true;
    this.showCreateForm = false;
    this.showEditForm = false;
    this.clearMessages();
  }

  cancelForms() {
    this.showCreateForm = false;
    this.showEditForm = false;
    this.showChangePasswordForm = false;
    this.clearMessages();
  }

  async createUser() {
    this.errorMessage = '';
    this.successMessage = '';

    // Validaciones
    if (!this.newUser.username || !this.newUser.full_name || !this.newUser.password) {
      this.errorMessage = 'Todos los campos son requeridos';
      return;
    }

    if (this.newUser.password !== this.newUser.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden';
      return;
    }

    if (this.newUser.password.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    try {
      const result = await this.authService.createUser({
        username: this.newUser.username!,
        full_name: this.newUser.full_name!,
        user_type: this.newUser.user_type!,
        password: this.newUser.password,
        is_active: this.newUser.is_active!
      });

      if (result.success) {
        this.successMessage = 'Usuario creado exitosamente';
        this.cancelForms();
        await this.loadUsers();
      } else {
        this.errorMessage = result.error || 'Error al crear usuario';
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'Error de conexión';
    }
  }

  async updateUser() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.editingUser.username || !this.editingUser.full_name) {
      this.errorMessage = 'Usuario y nombre completo son requeridos';
      return;
    }

    try {
      const result = await this.authService.updateUser(this.editingUser);

      if (result.success) {
        this.successMessage = 'Usuario actualizado exitosamente';
        this.cancelForms();
        await this.loadUsers();
      } else {
        this.errorMessage = result.error || 'Error al actualizar usuario';
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'Error de conexión';
    }
  }

  async changePassword() {
    this.errorMessage = '';
    this.successMessage = '';

    if (!this.changePasswordUser.currentPassword || !this.changePasswordUser.newPassword) {
      this.errorMessage = 'Contraseña actual y nueva son requeridas';
      return;
    }

    if (this.changePasswordUser.newPassword !== this.changePasswordUser.confirmPassword) {
      this.errorMessage = 'Las contraseñas no coinciden';
      return;
    }

    if (this.changePasswordUser.newPassword.length < 6) {
      this.errorMessage = 'La contraseña debe tener al menos 6 caracteres';
      return;
    }

    try {
      const result = await this.authService.changePassword(
        this.changePasswordUser.userId,
        this.changePasswordUser.currentPassword,
        this.changePasswordUser.newPassword
      );

      if (result.success) {
        this.successMessage = 'Contraseña cambiada exitosamente';
        this.cancelForms();
      } else {
        this.errorMessage = result.error || 'Error al cambiar contraseña';
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'Error de conexión';
    }
  }

  async deleteUser(user: User) {
    if (user.username === 'admin') {
      this.errorMessage = 'No se puede eliminar el usuario administrador principal';
      return;
    }

    if (confirm(`¿Está seguro de eliminar el usuario "${user.full_name}"?`)) {
      try {
        const result = await this.authService.deleteUser(user.id);

        if (result.success) {
          this.successMessage = 'Usuario eliminado exitosamente';
          await this.loadUsers();
        } else {
          this.errorMessage = result.error || 'Error al eliminar usuario';
        }
      } catch (error: any) {
        this.errorMessage = error.message || 'Error de conexión';
      }
    }
  }

  private resetNewUser() {
    this.newUser = {
      username: '',
      full_name: '',
      user_type: 'general',
      password: '',
      confirmPassword: '',
      is_active: true
    };
  }

  private clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }
}