import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CartTab, CartItem } from './cart.service';

export interface PurchaseData {
  cart: CartTab;
  total: number;
  items: CartItem[];
  timestamp: Date;
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

  public showPaymentModal$ = this.showPaymentModalSubject.asObservable();
  public purchaseData$ = this.purchaseDataSubject.asObservable();

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
      id: 'transfer',
      name: 'Transferencia',
      icon: 'fas fa-exchange-alt',
      description: 'Transferencia bancaria',
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

  constructor() {}

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
   * Obtiene los datos actuales de compra
   */
  getCurrentPurchaseData(): PurchaseData | null {
    return this.purchaseDataSubject.value;
  }

  /**
   * Procesa el pago con el método seleccionado
   */
  processPayment(paymentMethodId: string, requiresInvoice: boolean, additionalData?: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const purchaseData = this.getCurrentPurchaseData();
      if (!purchaseData) {
        reject('No hay datos de compra disponibles');
        return;
      }

      // Simular procesamiento de pago
      console.log('Procesando pago:', {
        paymentMethod: paymentMethodId,
        requiresInvoice,
        purchaseData,
        additionalData,
        processedAt: new Date()
      });

      // Simular delay de procesamiento
      setTimeout(() => {
        // Aquí irá la lógica real de procesamiento según el método
        const result = {
          success: true,
          paymentMethodId,
          transactionId: this.generateTransactionId(),
          amount: purchaseData.total,
          requiresInvoice,
          processedAt: new Date()
        };

        resolve(result);
      }, 1500);
    });
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