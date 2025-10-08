import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PaymentService, PurchaseData, PaymentMethod } from '../../services/payment.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-payment-methods',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './payment-methods.component.html',
  styleUrl: './payment-methods.component.scss'
})
export class PaymentMethodsComponent implements OnInit, OnDestroy {
  showModal: boolean = false;
  purchaseData: PurchaseData | null = null;
  paymentMethods: PaymentMethod[] = [];
  selectedPaymentMethod: string = '';
  requiresInvoice: boolean = false;
  isProcessing: boolean = false;

  private subscriptions: Subscription[] = [];

  constructor(
    private paymentService: PaymentService,
    private cartService: CartService
  ) {}

  ngOnInit(): void {
    this.setupSubscriptions();
    this.loadPaymentMethods();
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(sub => sub.unsubscribe());
  }

  /**
   * Configura las suscripciones a los observables
   */
  private setupSubscriptions(): void {
    // Suscribirse al estado del modal
    const modalSubscription = this.paymentService.showPaymentModal$.subscribe(show => {
      this.showModal = show;
      if (!show) {
        this.resetModal();
      }
    });

    // Suscribirse a los datos de compra
    const dataSubscription = this.paymentService.purchaseData$.subscribe(data => {
      this.purchaseData = data;
    });

    this.subscriptions.push(modalSubscription, dataSubscription);
  }

  /**
   * Carga los métodos de pago disponibles
   */
  private loadPaymentMethods(): void {
    this.paymentMethods = this.paymentService.getEnabledPaymentMethods();
  }

  /**
   * Resetea el estado del modal
   */
  private resetModal(): void {
    this.selectedPaymentMethod = '';
    this.requiresInvoice = false;
    this.isProcessing = false;
  }

  /**
   * Cierra el modal
   */
  closeModal(): void {
    this.paymentService.closePaymentModal();
  }

  /**
   * Selecciona un método de pago
   */
  selectPaymentMethod(methodId: string): void {
    this.selectedPaymentMethod = methodId;
  }

  /**
   * Obtiene el total de items en la compra
   */
  getTotalItems(): number {
    if (!this.purchaseData) return 0;
    return this.purchaseData.items.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * Confirma y procesa el pago
   */
  async confirmPayment(): Promise<void> {
    if (!this.selectedPaymentMethod || !this.purchaseData) {
      alert('Por favor seleccione un método de pago');
      return;
    }

    this.isProcessing = true;

    try {
      // Procesar el pago
      const result = await this.paymentService.processPayment(
        this.selectedPaymentMethod,
        this.requiresInvoice
      );

      console.log('Pago procesado:', result);

      // Mostrar mensaje de éxito
      const paymentMethod = this.paymentService.getPaymentMethod(this.selectedPaymentMethod);
      const successMessage = `
        ¡Pago procesado exitosamente!
        
        Método: ${paymentMethod?.name}
        Transacción: ${result.transactionId}
        Monto: ${result.amount.toLocaleString('es-CO', {style: 'currency', currency: 'COP'})}
        ${this.requiresInvoice ? '\n✓ Factura electrónica: Se enviará por email' : ''}
      `;

      alert(successMessage);

      // Limpiar el carrito después del pago exitoso
      this.cartService.clearActiveCart();

      // Cerrar modal
      this.closeModal();

    } catch (error) {
      console.error('Error al procesar el pago:', error);
      alert('Error al procesar el pago. Por favor intente nuevamente.');
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Obtiene el nombre del método de pago seleccionado
   */
  getSelectedMethodName(): string {
    if (!this.selectedPaymentMethod) return '';
    const method = this.paymentService.getPaymentMethod(this.selectedPaymentMethod);
    return method ? method.name : '';
  }

  /**
   * Verifica si un método de pago está disponible
   */
  isMethodEnabled(methodId: string): boolean {
    const method = this.paymentService.getPaymentMethod(methodId);
    return method ? method.enabled : false;
  }
}
