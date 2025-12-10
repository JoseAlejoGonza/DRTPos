import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService, User } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {
  username: string = '';
  password: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';
  showPassword: boolean = false;

  constructor(
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    // Si ya está logueado, redirigir a home
    if (this.authService.isLoggedIn()) {
      this.router.navigate(['/home']);
    }
  }

  async onSubmit() {
    if (!this.username || !this.password) {
      this.errorMessage = 'Por favor ingrese usuario y contraseña';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    try {
      const result = await this.authService.login(this.username, this.password);
      
      if (result.success) {
        // Login exitoso
        this.router.navigate(['/home']);
      } else {
        this.errorMessage = result.error || 'Error al iniciar sesión';
      }
    } catch (error: any) {
      this.errorMessage = error.message || 'Error de conexión';
    } finally {
      this.isLoading = false;
    }
  }

  onEnterPressed() {
    // Solo ejecutar onSubmit si hay usuario y contraseña, y no está cargando
    if (this.username.trim() && this.password.trim() && !this.isLoading) {
      this.onSubmit();
    }
  }

  togglePasswordVisibility() {
    this.showPassword = !this.showPassword;
  }
}