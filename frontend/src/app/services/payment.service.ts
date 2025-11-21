import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CartTab, CartItem } from './cart.service';
import { ElectronService } from './electron.service';

export interface PurchaseData {
  cart: CartTab;
  total: number;
  items: CartItem[];
  timestamp: Date;
  // Campos para manejo de descuentos
  total_with_discount?: number; // Total final cobrado (con descuento aplicado)
  original_total?: number; // Total original sin descuento
  discount?: number; // Monto del descuento aplicado
}

export interface PaymentMethod {
  id: string;
  name: string;
  icon: string;
  description: string;
  enabled: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class PaymentService {
  private showPaymentModalSubject = new BehaviorSubject<boolean>(false);
  private purchaseDataSubject = new BehaviorSubject<PurchaseData | null>(null);
  private refreshInventorySubject = new BehaviorSubject<boolean>(false);

  public showPaymentModal$ = this.showPaymentModalSubject.asObservable();
  public purchaseData$ = this.purchaseDataSubject.asObservable();
  public refreshInventory$ = this.refreshInventorySubject.asObservable();

  // Métodos de pago disponibles
  public paymentMethods: PaymentMethod[] = [
    {
      id: 'cash',
      name: 'Efectivo',
      icon: 'fas fa-money-bill-wave',
      description: 'Pago en efectivo',
      enabled: true
    },
    {
      id: 'card',
      name: 'Tarjeta',
      icon: 'fas fa-credit-card',
      description: 'Tarjeta de crédito o débito',
      enabled: true
    },
    {
      id: 'nequi',
      name: 'NEQUI',
      icon: 'fas fa-mobile-alt',
      description: 'Pago con NEQUI',
      enabled: true
    },
    {
      id: 'daviplata',
      name: 'Daviplata',
      icon: 'fas fa-mobile-alt',
      description: 'Pago con Daviplata',
      enabled: true
    },
    {
      id: 'qr',
      name: 'Código QR',
      icon: 'fas fa-qrcode',
      description: 'Pago mediante código QR',
      enabled: true
    },
    {
      id: 'paymentlink',
      name: 'Link de Pago',
      icon: 'fas fa-link',
      description: 'Enviar enlace de pago',
      enabled: true
    }
  ];

  constructor(private electronService: ElectronService) {}

  /**
   * Abre el modal de métodos de pago con los datos de compra
   */
  openPaymentModal(purchaseData: PurchaseData): void {
    this.purchaseDataSubject.next(purchaseData);
    this.showPaymentModalSubject.next(true);
  }

  /**
   * Cierra el modal de métodos de pago
   */
  closePaymentModal(): void {
    this.showPaymentModalSubject.next(false);
    // Limpiar datos después de un pequeño delay para la animación
    setTimeout(() => {
      this.purchaseDataSubject.next(null);
    }, 300);
  }

  /**
   * Notifica que se debe actualizar el inventario
   */
  notifyInventoryRefresh(): void {
    this.refreshInventorySubject.next(true);
  }

  /**
   * Obtiene los datos actuales de compra
   */
  getCurrentPurchaseData(): PurchaseData | null {
    return this.purchaseDataSubject.value;
  }

  /**
   * Procesa el pago con el método seleccionado
   */
  async processPayment(paymentMethodId: string, requiresInvoice: boolean, clientData?: any, additionalData?: any): Promise<any> {
    try {
      const purchaseData = this.getCurrentPurchaseData();
      if (!purchaseData) {
        throw new Error('No hay datos de compra disponibles');
      }

      console.log('Procesando pago:', {
        paymentMethod: paymentMethodId,
        requiresInvoice,
        purchaseData,
        clientData,
        additionalData,
        processedAt: new Date()
      });

      // Preparar datos para el backend
      const finalTotal = additionalData?.finalTotal || purchaseData.total;
      const paymentData = {
        saleData: {
          total: finalTotal, // Usar el total con descuento
          originalTotal: additionalData?.originalTotal || purchaseData.total,
          discount: additionalData?.discount || 0,
          items: purchaseData.items,
          timestamp: new Date().toISOString()
        },
        clientData: clientData || null,
        paymentMethod: this.getPaymentMethod(paymentMethodId)?.name || 'Desconocido',
        requiresInvoice,
        additionalData
      };

      // Procesar pago en el backend
      const result = await this.electronService.processPayment(paymentData);
      
      return {
        success: true,
        paymentMethodId,
        transactionId: this.generateTransactionId(),
        amount: finalTotal, // Usar el total con descuento
        originalAmount: additionalData?.originalTotal || purchaseData.total,
        discount: additionalData?.discount || 0,
        requiresInvoice,
        processedAt: new Date(),
        saleId: result.saleId,
        invoice: result.invoice,
        backendResult: result
      };

    } catch (error) {
      console.error('Error procesando pago:', error);
      throw error;
    }
  }

  /**
   * Genera un ID de transacción único
   */
  private generateTransactionId(): string {
    return 'TXN_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Obtiene un método de pago por ID
   */
  getPaymentMethod(id: string): PaymentMethod | undefined {
    return this.paymentMethods.find(method => method.id === id);
  }

  /**
   * Obtiene todos los métodos de pago habilitados
   */
  getEnabledPaymentMethods(): PaymentMethod[] {
    return this.paymentMethods.filter(method => method.enabled);
  }
}