import { Component, OnInit, OnDestroy } from '@angular/core';
import { ElectronService } from '../../services/electron.service';
import { CartService, CartTab, CartItem } from '../../services/cart.service';
import { PaymentService } from '../../services/payment.service';
import { PaymentMethodsComponent } from '../payment-methods/payment-methods.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, FormsModule, PaymentMethodsComponent],
  templateUrl: './shop.component.html',
  styleUrl: './shop.component.scss'
})
export class ShopComponent implements OnInit, OnDestroy {
  products: any[] = [];
  carts: CartTab[] = [];
  activeCart: CartTab | null = null;
  activeTabId: string = '';
  
  private subscriptions: Subscription[] = [];

  constructor(
    private electronService: ElectronService,
    private cartService: CartService,
    private paymentService: PaymentService
  ) {}

  async ngOnInit() {
    await this.loadProducts();
    this.setupCartSubscriptions();
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Configura las suscripciones al servicio de carritos
   */
  private setupCartSubscriptions(): void {
    // Suscribirse a los carritos
    const cartsSubscription = this.cartService.carts$.subscribe(carts => {
      this.carts = carts;
    });

    // Suscribirse al ID de pestaña activa
    const activeTabSubscription = this.cartService.activeTabId$.subscribe(activeTabId => {
      this.activeTabId = activeTabId;
      this.activeCart = this.cartService.getActiveCart();
    });

    this.subscriptions.push(cartsSubscription, activeTabSubscription);
  }

  async loadProducts() {
    this.electronService.getProducts().then((products: any) => {
      this.products = products;
      console.log(this.products);
    });
  }

  getImageSrc(imagen: string): string {
    if (!imagen) return '';
    // Si es URL http/https, retorna tal cual
    if (/^https?:\/\//i.test(imagen)) return imagen;
    // Si es ruta local, usa file://
    return 'file://' + imagen;
  }

  /**
   * Devuelve la clase CSS basada en el stock disponible
   */
  getStockClass(stock: number): string {
    return stock > 3 ? 'stock-high' : 'stock-low';
  }

  // ============ MÉTODOS DEL CARRITO USANDO EL SERVICIO ============

  /**
   * Crea una nueva pestaña de cotización
   */
  createNewTab(): void {
    this.cartService.createNewTab();
  }

  /**
   * Cambia a una pestaña específica
   */
  setActiveTab(tabId: string): void {
    this.cartService.setActiveTab(tabId);
  }

  /**
   * Elimina una pestaña específica
   */
  deleteTab(tabId: string, event: Event): void {
    event.stopPropagation(); // Evitar que se active la pestaña al cerrarla
    if (confirm('¿Estás seguro de que quieres eliminar esta cotización?')) {
      this.cartService.deleteTab(tabId);
    }
  }

  /**
   * Agrega un producto al carrito activo
   */
  addToCart(product: any): void {
    const success = this.cartService.addToActiveCart(product);
    if (!success) {
      if (product.stock <= 0) {
        alert('Producto sin stock disponible');
      } else {
        alert('No hay suficiente stock disponible');
      }
    }
  }

  /**
   * Actualiza la cantidad de un producto en el carrito
   */
  updateCartQuantity(item: CartItem): void {
    const success = this.cartService.updateCartItemQuantity(item.id, item.quantity);
    if (!success) {
      // Revertir a la cantidad anterior
      const activeCart = this.cartService.getActiveCart();
      if (activeCart) {
        const originalItem = activeCart.items.find(i => i.id === item.id);
        if (originalItem) {
          item.quantity = originalItem.quantity;
        }
      }
      alert('Cantidad no válida o excede el stock disponible');
    }
  }

  /**
   * Elimina un producto del carrito
   */
  removeFromCart(item: CartItem): void {
    if (confirm('¿Eliminar este producto del carrito?')) {
      this.cartService.removeFromActiveCart(item.id);
    }
  }

  /**
   * Obtiene el total del carrito activo
   */
  getActiveCartTotal(): number {
    return this.cartService.getActiveCartTotal();
  }

  /**
   * Procesa la compra de la cotización activa
   */
  processPurchase(): void {
    const activeCart = this.cartService.getActiveCart();
    if (!activeCart || activeCart.items.length === 0) {
      alert('No hay productos para procesar');
      return;
    }

    // Preparar los datos de compra
    const purchaseData = {
      cart: activeCart,
      total: this.getActiveCartTotal(),
      items: [...activeCart.items], // Copia de los items
      timestamp: new Date()
    };

    // Abrir el modal de métodos de pago
    this.paymentService.openPaymentModal(purchaseData);
  }

  /**
   * Cancela/limpia la cotización activa
   */
  cancelCart(): void {
    const activeCart = this.cartService.getActiveCart();
    if (!activeCart) return;

    if (activeCart.items.length > 0) {
      if (confirm(`¿Estás seguro de que quieres cancelar la cotización "${activeCart.name}"?`)) {
        this.cartService.clearActiveCart();
        alert('Cotización cancelada');
      }
    }
  }
}
