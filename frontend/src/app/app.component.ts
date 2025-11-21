import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';
import { ProductsComponent } from './components/products/products.component';
import { HomeComponent } from "./components/home/home.component";
import { ProductNotFoundModalComponent } from './components/product-not-found-modal/product-not-found-modal.component';
import { BarcodeService } from './services/barcode.service';
import { AuthService, User } from './services/auth.service';

declare global {
  interface Window { api: any; }
}
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, HomeComponent, ProductNotFoundModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})

export class AppComponent implements OnInit {
  title = 'DRT Solutions POS';
  currentUser: User | null = null;
  isLoggedIn: boolean = false;

  constructor(
    private barcodeService: BarcodeService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Inicializar el servicio de códigos de barras
    console.log('Servicio de códigos de barras inicializado');
    
    // Suscribirse a cambios en la autenticación
    this.authService.currentUser$.subscribe(user => {
      this.currentUser = user;
      this.isLoggedIn = user !== null;
      
      // Si no está logueado, redirigir al login
      if (!this.isLoggedIn && this.router.url !== '/login') {
        this.router.navigate(['/login']);
      }
    });
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
