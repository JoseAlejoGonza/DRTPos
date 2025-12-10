import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { BarcodeService } from '../../services/barcode.service';

@Component({
  selector: 'app-product-not-found-modal',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './product-not-found-modal.component.html',
  styleUrl: './product-not-found-modal.component.scss'
})
export class ProductNotFoundModalComponent implements OnInit, OnDestroy {
  showModal = false;
  scannedCode = '';
  private subscription: Subscription = new Subscription();

  constructor(
    private barcodeService: BarcodeService,
    private router: Router
  ) {}

  ngOnInit(): void {
    // Suscribirse a las notificaciones de productos no encontrados
    this.subscription.add(
      this.barcodeService.productNotFound$.subscribe(code => {
        if (code) {
          this.scannedCode = code;
          this.showModal = true;
        }
      })
    );
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
  }

  /**
   * Cierra el modal
   */
  closeModal(): void {
    this.showModal = false;
    this.scannedCode = '';
    this.barcodeService.clearNotifications();
  }

  /**
   * Navega a la página de agregar productos con el código pre-llenado
   */
  goToAddProduct(): void {
    console.log('🔥 Ejecutando goToAddProduct con código:', this.scannedCode);
    // Guardar el código antes de cerrar el modal
    const codeToSend = this.scannedCode;
    this.closeModal();
    // Navegar primero a inventario/productos
    this.router.navigate(['/products']).then(() => {
      // Después de la navegación, enviar el evento con un pequeño delay
      setTimeout(() => {
        console.log('⏱️ Enviando evento después de navegación con código:', codeToSend);
        this.barcodeService.openAddProductModal(codeToSend);
      }, 100);
    });
    console.log('🏃 Navegando a /products');
  }

  /**
   * Maneja el click en el backdrop para cerrar el modal
   */
  onBackdropClick(event: MouseEvent): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }
}