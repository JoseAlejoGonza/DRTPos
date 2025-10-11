import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PaymentService, PurchaseData, PaymentMethod } from '../../services/payment.service';
import { CartService } from '../../services/cart.service';
import { ElectronService } from '../../services/electron.service';

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

  // Propiedades para búsqueda y manejo de clientes
  documentTypes = [
    { value: 'CC', label: 'Cédula de Ciudadanía' },
    { value: 'NIT', label: 'NIT' },
    { value: 'PA', label: 'Pasaporte' }
  ];
  selectedDocumentType: string = 'CC';
  documentNumber: string = '';
  foundClient: any = null;
  isSearchingClient: boolean = false;
  showClientForm: boolean = false;
  clientNotFound: boolean = false;

  // Propiedades para formulario de cliente
  newClient = {
    document_type: 'CC',
    document_number: '',
    name: '',
    address: '',
    phone_number: '',
    email: '',
    registration_date: new Date().toISOString()
  };

  // Propiedades para efectivo y vueltas
  cashReceived: number = 0;
  changeAmount: number = 0;

  // Propiedades para desglose de totales
  subtotal: number = 0;
  ivaAmount: number = 0;
  total: number = 0;

  private subscriptions: Subscription[] = [];

  constructor(
    private paymentService: PaymentService,
    private cartService: CartService,
    private electronService: ElectronService
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
      if (data) {
        this.calculateTotals();
      }
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
    this.resetClientFields();
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

  /**
   * Busca un cliente por tipo y número de documento
   */
  async searchClient(): Promise<void> {
    if (!this.documentNumber.trim()) {
      alert('Por favor ingrese el número de documento');
      return;
    }

    this.isSearchingClient = true;
    this.clientNotFound = false;
    this.foundClient = null;

    try {
      const client = await this.electronService.searchClientByDocument(
        this.selectedDocumentType, 
        this.documentNumber.trim()
      );

      if (client) {
        this.foundClient = client;
        this.clientNotFound = false;
      } else {
        this.clientNotFound = true;
        this.foundClient = null;
      }
    } catch (error) {
      console.error('Error al buscar cliente:', error);
      alert('Error al buscar el cliente');
    } finally {
      this.isSearchingClient = false;
    }
  }

  /**
   * Abre el formulario para crear un nuevo cliente
   */
  openClientForm(): void {
    this.newClient = {
      document_type: this.selectedDocumentType,
      document_number: this.documentNumber.trim(),
      name: '',
      address: '',
      phone_number: '',
      email: '',
      registration_date: new Date().toISOString()
    };
    this.showClientForm = true;
  }

  /**
   * Cancela la creación de cliente
   */
  cancelClientForm(): void {
    this.showClientForm = false;
    this.newClient = {
      document_type: 'CC',
      document_number: '',
      name: '',
      address: '',
      phone_number: '',
      email: '',
      registration_date: new Date().toISOString()
    };
  }

  /**
   * Crea un nuevo cliente
   */
  async createClient(): Promise<void> {
    // Validaciones
    if (!this.newClient.name.trim()) {
      alert('El nombre completo es obligatorio');
      return;
    }
    if (!this.newClient.phone_number.trim()) {
      alert('El número de teléfono es obligatorio');
      return;
    }
    if (!this.newClient.email.trim()) {
      alert('El correo electrónico es obligatorio');
      return;
    }

    try {
      const result = await this.electronService.addClient(this.newClient);
      if (result) {
        alert('Cliente creado exitosamente');
        this.foundClient = { ...this.newClient, id: result.lastInsertRowid };
        this.showClientForm = false;
        this.clientNotFound = false;
      }
    } catch (error) {
      console.error('Error al crear cliente:', error);
      alert('Error al crear el cliente');
    }
  }

  /**
   * Calcula el desglose de totales con IVA
   */
  calculateTotals(): void {
    if (!this.purchaseData) return;
    
    this.total = this.purchaseData.total;
    this.ivaAmount = this.total * 0.19; // 19% IVA
    this.subtotal = this.total - this.ivaAmount;
  }

  /**
   * Calcula las vueltas cuando se ingresa dinero en efectivo
   */
  calculateChange(): void {
    if (this.cashReceived >= this.total) {
      this.changeAmount = this.cashReceived - this.total;
    } else {
      this.changeAmount = 0;
    }
  }

  /**
   * Se ejecuta cuando cambia el monto recibido en efectivo
   */
  onCashReceivedChange(): void {
    this.calculateChange();
  }

  /**
   * Resetea los campos de cliente
   */
  private resetClientFields(): void {
    this.selectedDocumentType = 'CC';
    this.documentNumber = '';
    this.foundClient = null;
    this.clientNotFound = false;
    this.showClientForm = false;
    this.cashReceived = 0;
    this.changeAmount = 0;
  }
}
