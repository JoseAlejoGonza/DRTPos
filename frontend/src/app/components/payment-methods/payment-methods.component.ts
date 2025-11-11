import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PaymentService, PurchaseData, PaymentMethod } from '../../services/payment.service';
import { CartService } from '../../services/cart.service';
import { ElectronService } from '../../services/electron.service';
import { ConfigService } from '../../services/config.service';

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
  newClient: any = {
    document_type: 'CC',
    document_number: '',
    name: '',
    address: '',
    phone_number: '',
    email: '',
    registration_date: new Date().toISOString()
  };

  // Propiedades para efectivo y vueltas (usando any para evitar problemas de ngModel)
  cashReceived: any = 0;
  changeAmount: any = 0;

  // Propiedades para desglose de totales
  subtotal: number = 0;
  ivaAmount: number = 0;
  total: number = 0;

  private subscriptions: Subscription[] = [];

  constructor(
    private paymentService: PaymentService,
    private cartService: CartService,
    private electronService: ElectronService,
    private configService: ConfigService
  ) {
    // Inicialización forzada en constructor para evitar problemas de ngModel
    this.forceInitialization();
  }

  /**
   * Cancela el modal de WhatsApp
   */
  // La funcionalidad de envío por WhatsApp fue eliminada; solo dejamos generación/descarga de PDF.

  /**
   * Fuerza la inicialización de todas las propiedades críticas
   */
  private forceInitialization(): void {
    this.cashReceived = 0;
    this.changeAmount = 0;
    this.documentNumber = '';
    this.selectedDocumentType = 'CC';
    this.selectedPaymentMethod = '';
    
    this.newClient = {
      document_type: 'CC',
      document_number: '',
      name: '',
      address: '',
      phone_number: '',
      email: '',
      registration_date: new Date().toISOString()
    };

    console.log('🔧 Inicialización forzada completada en constructor');
  }

  ngOnInit(): void {
    this.initializeDefaults();
    this.setupSubscriptions();
    this.loadPaymentMethods();
  }

  /**
   * Inicializa valores por defecto para evitar problemas con inputs
   */
  private initializeDefaults(): void {
    // Asegurar que todas las propiedades string estén inicializadas
    this.selectedDocumentType = this.selectedDocumentType || 'CC';
    this.documentNumber = this.documentNumber || '';
    this.selectedPaymentMethod = this.selectedPaymentMethod || '';
    
    // Asegurar que el objeto newClient esté completo
    this.newClient = {
      document_type: this.newClient?.document_type || 'CC',
      document_number: this.newClient?.document_number || '',
      name: this.newClient?.name || '',
      address: this.newClient?.address || '',
      phone_number: this.newClient?.phone_number || '',
      email: this.newClient?.email || '',
      registration_date: this.newClient?.registration_date || new Date().toISOString()
    };
    
    // Asegurar que los números estén inicializados
    this.cashReceived = this.cashReceived || 0;
    this.changeAmount = this.changeAmount || 0;
    this.subtotal = this.subtotal || 0;
    this.ivaAmount = this.ivaAmount || 0;
    this.total = this.total || 0;
    
    console.log('✅ Payment methods - Propiedades inicializadas:', {
      selectedDocumentType: this.selectedDocumentType,
      newClient: this.newClient,
      cashReceived: this.cashReceived
    });
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
      } else {
        // Cuando se abre el modal, asegurar inicialización
        this.initializeDefaults();
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
    this.resetNewClientForm();
  }

  /**
   * Resetea el formulario de nuevo cliente
   */
  private resetNewClientForm(): void {
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

    // Validar que si requiere factura, debe tener cliente
    if (this.requiresInvoice && !this.foundClient) {
      alert('Para generar factura electrónica debe seleccionar un cliente');
      return;
    }

    // Validar efectivo si es el método seleccionado
    if (this.selectedPaymentMethod === 'cash') {
      if (this.cashReceived < this.total) {
        alert('El monto recibido debe ser mayor o igual al total a pagar');
        return;
      }
    }

    this.isProcessing = true;

    try {
      // Procesar el pago
      const result = await this.paymentService.processPayment(
        this.selectedPaymentMethod,
        this.requiresInvoice,
        this.foundClient,
        {
          cashReceived: this.cashReceived,
          changeAmount: this.changeAmount
        }
      );

      console.log('Pago procesado:', result);

      // Mostrar opciones post-pago
      await this.showPostPaymentOptions(result);

      // Limpiar el carrito después del pago exitoso
      this.cartService.clearActiveCart();

      // Cerrar modal
      this.closeModal();

    } catch (error) {
      console.error('Error al procesar el pago:', error);
      alert('Error al procesar el pago: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Muestra las opciones después del pago (impresión, WhatsApp, etc.)
   */
  async showPostPaymentOptions(paymentResult: any): Promise<void> {
    const paymentMethod = this.paymentService.getPaymentMethod(this.selectedPaymentMethod);
    const successMessage = `¡Pago procesado exitosamente!\n\nMétodo: ${paymentMethod?.name}\nMonto: ${paymentResult.amount.toLocaleString('es-CO', {style: 'currency', currency: 'COP'})}`;
    
    if (this.requiresInvoice && paymentResult.invoice) {
      alert(successMessage + '\n\n✓ Factura electrónica generada: ' + paymentResult.invoice.invoiceNumber);

      // Ofrecer descarga inmediata del PDF si existe
      try {
        const pdfPath = paymentResult.invoice.pdfPath || (paymentResult.invoice && paymentResult.invoice.url ? paymentResult.invoice.url : null);
        if (pdfPath) {
          const wantsDownload = confirm('¿Desea descargar una copia del PDF de la factura ahora?');
          if (wantsDownload) {
            const saveRes = await this.electronService.saveFileCopy(pdfPath);
            if (saveRes && saveRes.success) {
              alert('Copia guardada en: ' + saveRes.savedPath);
            } else {
              alert('No se pudo guardar la copia: ' + (saveRes?.error || 'error desconocido'));
            }
          }
        }
      } catch (err) {
        console.warn('Error tratando de ofrecer descarga del PDF:', err);
      }
    } else {
      alert(successMessage);
    }

    // Verificar configuración de impresión automática
    const config = this.configService.getCurrentConfig();
    const legacyPrinter = config.printer.legacy.printerName;
    
    if (config.postPayment.autoprint && config.printer.legacy.enabled) {
      // Impresión automática habilitada
      await this.executeAutomaticPrint(paymentResult);
    } else {
      // Preguntar si quiere impresión automática o manual
      const autoChoice = confirm(
        `${successMessage}\n\n` +
        `🪄 ¿Desea IMPRIMIR AUTOMÁTICAMENTE con método exitoso?\n\n` +
        `✓ Impresora: ${legacyPrinter}\n` +
        `✓ Imprime + Corta + Abre cajón\n\n` +
        `Presione OK para IMPRIMIR AHORA\n` +
        `Presione CANCELAR para más opciones`
      );

      if (autoChoice) {
        // Impresión automática con método exitoso
        await this.executeAutomaticPrint(paymentResult);
      } else {
        // Preguntar qué hacer después del pago
        const action = await this.getPostPaymentAction();
        
        if (action) {
            await this.executePostPaymentAction(action, paymentResult);
        }
      }
    }
  }

  // Nota: el modal de WhatsApp fue removido; solo soporte para generar/guardar PDF.

  /**
   * Ejecuta la impresión automática con método exitoso
   */
  async executeAutomaticPrint(paymentResult: any): Promise<void> {
    try {
      const config = this.configService.getCurrentConfig();
      const legacyPrinter = config.printer.legacy.printerName;
      
      const printData = {
        saleData: this.purchaseData,
        clientData: this.foundClient,
        invoiceData: this.requiresInvoice ? {
          requiresInvoice: true,
          invoiceNumber: paymentResult.invoice?.invoiceNumber,
          cufe: paymentResult.invoice?.cufe
        } : null,
        paymentMethod: this.paymentService.getPaymentMethod(this.selectedPaymentMethod)?.name,
        printerName: legacyPrinter,
        // Agregar configuración de la empresa
        companyConfig: {
          name: config.invoicing.companyName || 'DRT POS',
          nit: config.invoicing.companyNit || 'NIT: No configurado',
          address: config.invoicing.companyAddress || 'Dirección no configurada',
          city: config.invoicing.companyCity || '',
          phone: config.invoicing.companyPhone || 'Teléfono no configurado',
          email: config.invoicing.companyEmail || ''
        }
      };

      console.log('🪄 Ejecutando impresión automática con método exitoso...');
      console.log('📋 Impresora configurada:', legacyPrinter);
      
      await this.electronService.printThermalLegacy(printData);
      
      alert(
        `✅ IMPRESIÓN AUTOMÁTICA COMPLETADA\n\n` +
        `Impresora: ${legacyPrinter}\n\n` +
        `✓ Ticket impreso\n` +
        `✓ Papel cortado\n` +
        `✓ Cajón abierto\n\n` +
        `¡Venta completada exitosamente!\n\n` +
        `🎯 SIGUIENTE VENTA LISTA`
      );
      
    } catch (error) {
      console.error('Error en impresión automática:', error);
      alert(`❌ Error en impresión automática: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  /**
   * Obtiene la acción que quiere realizar después del pago
   */
  async getPostPaymentAction(): Promise<string | null> {
    return new Promise((resolve) => {
      const options = [
        '1. Imprimir comprobante (Windows)',
        '2. Enviar por WhatsApp',
        '3. Imprimir térmica (experimental)',
        '4. 🪄 MÉTODO EXITOSO → DigitalPOS (Funciona 100%)',
        '5. Ver impresoras disponibles',
        '6. No hacer nada'
      ];

      const choice = prompt(
        'Seleccione una opción:\n\n' + options.join('\n') + '\n\nIngrese el número de la opción:'
      );

      if (choice) {
        resolve(choice.trim());
      } else {
        resolve(null);
      }
    });
  }

  /**
   * Ejecuta la acción seleccionada después del pago
   */
  async executePostPaymentAction(action: string, paymentResult: any): Promise<void> {
    try {
      const printData = {
        saleData: this.purchaseData,
        clientData: this.foundClient,
        invoiceData: this.requiresInvoice ? {
          requiresInvoice: true,
          invoiceNumber: paymentResult.invoice?.invoiceNumber,
          cufe: paymentResult.invoice?.cufe
        } : null,
        paymentMethod: this.paymentService.getPaymentMethod(this.selectedPaymentMethod)?.name
      };

      switch (action) {
        case '1':
          await this.electronService.showPrintDialog(printData);
          alert('Diálogo de impresión abierto');
          break;

        case '2':
          // Generar PDF y ofrecer opción de guardar (descargar) el archivo para enviar por otro medio
          try {
            if (this.requiresInvoice && paymentResult.invoice) {
              const invoiceGen = await this.electronService.generateElectronicInvoice({ saleData: this.purchaseData, clientData: this.foundClient });
              if (invoiceGen && invoiceGen.pdfPath) {
                // Preguntar al usuario si desea guardar una copia
                const save = confirm('PDF generado en el sistema. ¿Desea guardar una copia en otra ubicación?');
                if (save) {
                  const saveRes = await this.electronService.saveFileCopy(invoiceGen.pdfPath);
                  if (saveRes && saveRes.success) {
                    alert('Copia guardada en: ' + saveRes.savedPath);
                  } else {
                    alert('No se guardó la copia: ' + (saveRes?.error || 'Error desconocido'));
                  }
                } else {
                  alert('PDF generado en: ' + invoiceGen.pdfPath);
                }
              } else {
                alert('No se pudo generar el PDF de la factura');
              }
            } else {
              // Para comprobantes no electrónicos, abrir diálogo de impresión y el usuario puede escoger "Guardar como PDF"
              alert('Para exportar el comprobante a PDF, use la opción "Guardar como PDF" en el diálogo de impresión. Se abrirá el diálogo ahora.');
              await this.electronService.showPrintDialog(printData);
            }
          } catch (err) {
            console.error('Error generando/guardando PDF:', err);
            alert('Error generando/guardando PDF: ' + (err instanceof Error ? err.message : String(err)));
          }
          break;

        case '3':
          const printers = await this.electronService.getAvailablePrinters();
          if (printers.thermal.length === 0) {
            alert('No se encontraron impresoras térmicas');
            break;
          }

          // Si hay múltiples impresoras térmicas, permitir seleccionar
          let selectedPrinter = printers.thermal[0].name;
          if (printers.thermal.length > 1) {
            const printerNames = printers.thermal.map((p: any, i: number) => `${i + 1}. ${p.name}`);
            const printerChoice = prompt(
              'Seleccione impresora térmica:\n\n' + printerNames.join('\n') + '\n\nIngrese el número:'
            );
            
            if (printerChoice) {
              const index = parseInt(printerChoice) - 1;
              if (index >= 0 && index < printers.thermal.length) {
                selectedPrinter = printers.thermal[index].name;
              }
            }
          }

          // Configurar ancho de papel
          const paperWidth = prompt('Ancho del papel térmico (58, 60, 80mm):', '80');
          if (paperWidth && ['58', '60', '80'].includes(paperWidth)) {
            await this.electronService.setThermalPaperWidth(parseInt(paperWidth));
          }

          await this.electronService.printThermal({
            ...printData,
            printerName: selectedPrinter
          });
          alert('Impresión térmica enviada');
          break;

        case '4':
          // Método legacy exitoso - usando impresora configurada
          const configPrinter = this.configService.getCurrentConfig();
          const legacyPrinterName = configPrinter.printer.legacy.printerName;
          
          console.log('🪄 Ejecutando método exitoso con:', legacyPrinterName);
          
          await this.electronService.printThermalLegacy({
            ...printData,
            printerName: legacyPrinterName,
            companyConfig: {
              name: configPrinter.invoicing.companyName || 'DRT POS',
              nit: configPrinter.invoicing.companyNit || 'NIT: No configurado',
              address: configPrinter.invoicing.companyAddress || 'Dirección no configurada', 
              city: configPrinter.invoicing.companyCity || '',
              phone: configPrinter.invoicing.companyPhone || 'Teléfono no configurado',
              email: configPrinter.invoicing.companyEmail || ''
            }
          });
          
          alert(
            `✅ MÉTODO EXITOSO COMPLETADO\n\n` +
            `Impresora: ${legacyPrinterName}\n\n` +
            `✓ Ticket impreso\n` +
            `✓ Papel cortado\n` +
            `✓ Cajón abierto\n\n` +
            `¡Venta completada exitosamente!`
          );
          break;

        case '5':
          const availablePrinters = await this.electronService.getAvailablePrinters();
          const printerList = [
            'Impresoras Térmicas:',
            ...availablePrinters.thermal.map((p: any) => `- ${p.name}`),
            '',
            'Impresoras Normales:',
            ...availablePrinters.normal.map((p: any) => `- ${p.name}`)
          ];
          alert(printerList.join('\n'));
          break;

        case '6':
        default:
          // No hacer nada
          break;
      }
    } catch (error) {
      console.error('Error ejecutando acción post-pago:', error);
      alert('Error: ' + (error instanceof Error ? error.message : 'Error desconocido'));
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
    const cash = parseFloat(String(this.cashReceived)) || 0;
    const totalAmount = Number(this.total) || 0;
    
    if (cash >= totalAmount) {
      this.changeAmount = cash - totalAmount;
    } else {
      this.changeAmount = 0;
    }
    
    console.log('🔄 Cálculo de cambio:', {
      recibido: cash,
      total: totalAmount,
      cambio: this.changeAmount
    });
  }

  /**
   * Se ejecuta cuando cambia el monto recibido en efectivo
   */
  onCashReceivedChange(): void {
    // Asegurar que sea un número válido
    const numValue = parseFloat(this.cashReceived) || 0;
    this.cashReceived = numValue;
    this.calculateChange();
    
    console.log('💰 Dinero recibido actualizado:', this.cashReceived);
  }

  /**
   * Maneja cambios en el teléfono del cliente
   */
  onPhoneChange(): void {
    // Forzar que sea string y limpiar caracteres no numéricos opcionales
    this.newClient.phone_number = String(this.newClient.phone_number || '');
    console.log('📞 Teléfono actualizado:', this.newClient.phone_number);
  }

  /**
   * Maneja cambios en el número de documento
   */
  onDocumentChange(): void {
    this.documentNumber = String(this.documentNumber || '');
    console.log('📄 Documento actualizado:', this.documentNumber);
  }

  /**
   * Resetea los campos de cliente
   */
  private resetClientFields(): void {
    this.selectedDocumentType = 'CC';
    this.documentNumber = '';
    this.foundClient = null;
    this.isSearchingClient = false;
    this.clientNotFound = false;
    this.showClientForm = false;
    this.cashReceived = 0;
    this.changeAmount = 0;
    
    console.log('✅ Campos de cliente reseteados');
  }
}
