import { Component, OnInit, OnDestroy } from '@angular/core';
import { ElectronService } from '../../services/electron.service';
import { CartService, CartTab, CartItem } from '../../services/cart.service';
import { PaymentService } from '../../services/payment.service';
import { BarcodeService } from '../../services/barcode.service';
import { PaymentMethodsComponent } from '../payment-methods/payment-methods.component';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, FormsModule, PaymentMethodsComponent],
  templateUrl: './shop.component.html',
  styleUrl: './shop.component.scss'
})
export class ShopComponent implements OnInit, OnDestroy {
  products: any[] = [];
  filteredProducts: any[] = [];
  searchTerm: string = '';
  carts: CartTab[] = [];
  activeCart: CartTab | null = null;
  activeTabId: string = '';
  
  private subscriptions: Subscription[] = [];

  constructor(
    private electronService: ElectronService,
    private cartService: CartService,
    private paymentService: PaymentService,
    private barcodeService: BarcodeService,
    private notificationService: NotificationService
  ) {}

  async ngOnInit() {
    await this.loadProducts();
    this.setupCartSubscriptions();
    
    // Notificar al BarcodeService que estamos en la sección de ventas
    this.barcodeService.setShopContext(true);
  }

  ngOnDestroy() {
    this.subscriptions.forEach(sub => sub.unsubscribe());
    
    // Notificar al BarcodeService que salimos de la sección de ventas
    this.barcodeService.setShopContext(false);
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

    // Suscribirse a actualizaciones de inventario
    const refreshInventorySubscription = this.paymentService.refreshInventory$.subscribe(shouldRefresh => {
      if (shouldRefresh) {
        console.log('🔄 Actualizando inventario suavemente después del pago...');
        this.softRefreshProducts();
      }
    });

    this.subscriptions.push(cartsSubscription, activeTabSubscription, refreshInventorySubscription);
  }

  async loadProducts() {
    this.electronService.getProducts().then((products: any) => {
      this.products = products;
      this.filteredProducts = products; // Inicializar productos filtrados
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

  /**
   * Filtra productos por nombre después del tercer carácter
   */
  onSearchChange(): void {
    if (this.searchTerm.length >= 3) {
      this.filteredProducts = this.products.filter(product => 
        product.name.toLowerCase().includes(this.searchTerm.toLowerCase())
      );
    } else {
      this.filteredProducts = this.products; // Mostrar todos si menos de 3 caracteres
    }
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
  async deleteTab(tabId: string, event: Event): Promise<void> {
    event.stopPropagation(); // Evitar que se active la pestaña al cerrarla
    const confirmed = await this.notificationService.confirm('Eliminar Cotización', '¿Estás seguro de que quieres eliminar esta cotización?');
    if (confirmed) {
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
        this.notificationService.warning('Sin Stock', 'Producto sin stock disponible');
      } else {
        this.notificationService.warning('Stock Insuficiente', 'No hay suficiente stock disponible');
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
      this.notificationService.warning('Cantidad Inválida', 'Cantidad no válida o excede el stock disponible');
    }
  }

  /**
   * Elimina un producto del carrito
   */
  async removeFromCart(item: CartItem): Promise<void> {
    const confirmed = await this.notificationService.confirm('Eliminar Producto', '¿Eliminar este producto del carrito?');
    if (confirmed) {
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
      this.notificationService.warning('Sin Productos', 'No hay productos para procesar');
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
   * Actualización suave de productos que no interfiere con inputs
   */
  async softRefreshProducts(): Promise<void> {
    try {
      console.log('🔄 Iniciando actualización suave de productos...');
      
      // Usar setTimeout para no bloquear el hilo principal
      setTimeout(async () => {
        try {
          // Guardar estado actual de búsqueda si existe
          const currentSearchTerm = this.searchTerm || '';
          
          // Cargar productos en background
          const products = await this.electronService.getProducts();
          
          // Actualizar sin afectar inputs
          if (products) {
            this.products = products;
            
            // Reaplicar filtro de búsqueda si existía
            if (currentSearchTerm) {
              this.filteredProducts = products.filter((product: any) => 
                product.name.toLowerCase().includes(currentSearchTerm.toLowerCase())
              );
            } else {
              this.filteredProducts = products;
            }
            
            console.log('✅ Productos actualizados suavemente:', products.length);
          }
        } catch (error) {
          console.error('Error en actualización suave:', error);
          // Si falla la actualización suave, no hacer nada para no romper la UX
        }
      }, 500); // Delay pequeño para que el modal se cierre primero
      
    } catch (error) {
      console.error('Error iniciando actualización suave:', error);
    }
  }

  /**
   * Cancela/limpia la cotización activa
   */
  async cancelCart(): Promise<void> {
    const activeCart = this.cartService.getActiveCart();
    if (!activeCart) return;

    if (activeCart.items.length > 0) {
      const confirmed = await this.notificationService.confirm('Cancelar Cotización', `¿Estás seguro de que quieres cancelar la cotización "${activeCart.name}"?`);
      if (confirmed) {
        this.cartService.clearActiveCart();
        this.notificationService.info('Cotización Cancelada', 'Cotización cancelada');
      }
    }
  }
}
