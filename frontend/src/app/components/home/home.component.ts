import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { BarcodeService } from '../../services/barcode.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy{
  shopName: string = 'DRT';

  constructor(
    public router: Router, 
    private barcodeService: BarcodeService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    // Solo configurar el contexto si está logueado
    if (this.authService.isLoggedIn()) {
      this.barcodeService.setShopContext(false);
      // Solo navegar a productos si no estamos ya en una ruta específica
      if (this.router.url === '/' || this.router.url === '/home') {
        this.router.navigate(['/products']);
      }
    }
  }

  ngOnDestroy(): void {
    this.barcodeService.setShopContext(false);
  }

  navigateTo(route: string) {
    // Verificar permisos antes de navegar
    if (route === 'settings' && !this.authService.canAccessSettings()) {
      alert('No tiene permisos para acceder a Configuración');
      return;
    }
    
    if ((route === 'users' || route === 'license') && !this.authService.canAccessUserManagement()) {
      alert('No tiene permisos para acceder a esta sección');
      return;
    }
    
    this.router.navigate([`/${route}`]);
  }

  isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }

  canAccessRoute(route: string): boolean {
    switch (route) {
      case 'settings':
        return this.authService.canAccessSettings();
      case 'users':
      case 'license':
        return this.authService.canAccessUserManagement();
      default:
        return true;
    }
  }
}
