import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PaymentService, PurchaseData, PaymentMethod } from '../../services/payment.service';
import { CartService } from '../../services/cart.service';
import { ElectronService } from '../../services/electron.service';
import { ConfigService } from '../../services/config.service';
import { NotificationService } from '../../services/notification.service';

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

  // Propiedades para efectivo y vueltas
  cashReceived: number = 0;
  changeAmount: number = 0;

  // Propiedades para descuento
  discount: number = 0;
  discountError: string = '';

  // Propiedades para desglose de totales
  subtotal: number = 0;
  ivaAmount: number = 0;
  total: number = 0;
  originalTotal: number = 0;

  private subscriptions: Subscription[] = [];

  constructor(
    private paymentService: PaymentService,
    private cartService: CartService,
    private electronService: ElectronService,
    private configService: ConfigService,
    private notificationService: NotificationService
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
    this.discount = 0;
    this.discountError = '';
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
    this.discount = this.discount || 0;
    this.subtotal = this.subtotal || 0;
    this.ivaAmount = this.ivaAmount || 0;
    this.total = this.total || 0;
    this.originalTotal = this.originalTotal || 0;
    
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
   * Cierra el modal de forma suave después de un pago exitoso
   */
  softCloseModal(): void {
    console.log('🔄 Cerrando modal de pago suavemente...');
    
    // Usar setTimeout para permitir que el DOM se estabilice
    setTimeout(() => {
      // Resetear formulario antes de cerrar
      this.resetForm();
      
      // Cerrar el modal
      this.paymentService.closePaymentModal();
      
      console.log('✅ Modal cerrado suavemente');
    }, 100);
  }

  /**
   * Resetea el formulario a su estado inicial
   */
  private resetForm(): void {
    try {
      this.selectedPaymentMethod = '';
      this.discount = 0;
      this.discountError = '';
      this.cashReceived = 0;
      this.changeAmount = 0;
      this.requiresInvoice = false;
      this.foundClient = null;
      this.clientNotFound = false;
      this.documentNumber = '';
      this.isSearchingClient = false;
      this.showClientForm = false;
      
      // Resetear objeto de nuevo cliente
      this.newClient = {
        document_type: 'CC',
        document_number: '',
        name: '',
        phone_number: '',
        email: '',
        address: ''
      };
      
      console.log('🧹 Formulario reseteado');
    } catch (error) {
      console.error('Error reseteando formulario:', error);
    }
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
      this.notificationService.warning('Validación', 'Por favor seleccione un método de pago');
      return;
    }

    // Validar que si requiere factura, debe tener cliente
    if (this.requiresInvoice && !this.foundClient) {
      this.notificationService.warning('Validación', 'Para generar factura electrónica debe seleccionar un cliente');
      return;
    }

    // Validar descuento
    if (!this.validateDiscount()) {
      this.notificationService.warning('Error en Descuento', this.discountError);
      return;
    }

    // Validar efectivo si es el método seleccionado
    if (this.selectedPaymentMethod === 'cash') {
      if (this.cashReceived < this.total) {
        this.notificationService.warning('Validación', 'El monto recibido debe ser mayor o igual al total a pagar');
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
          changeAmount: this.changeAmount,
          discount: this.discount,
          originalTotal: this.originalTotal,
          finalTotal: this.total
        }
      );

      console.log('Pago procesado:', result);

      // Actualizar los datos de compra con el total final y campos de descuento para el recibo
      if (this.purchaseData) {
        // Actualizar totales y descuento
        this.purchaseData.total = this.total; // Total con descuento aplicado
        this.purchaseData.total_with_discount = this.total; // Total final cobrado
        this.purchaseData.original_total = this.originalTotal; // Total original sin descuento
        this.purchaseData.discount = this.discount; // Descuento aplicado
        
        // Actualizar cada item con el precio real cobrado (proporcional al descuento)
        if (this.discount > 0 && this.purchaseData.items) {
          const discountPercentage = this.discount / this.originalTotal;
          this.purchaseData.items = this.purchaseData.items.map(item => ({
            ...item,
            real_price: item.price * (1 - discountPercentage) // Precio con descuento proporcional aplicado
          }));
        }
        
        console.log('🔍 DEBUG - purchaseData actualizado para impresión:', {
          total: this.purchaseData.total,
          total_with_discount: this.purchaseData.total_with_discount,
          original_total: this.purchaseData.original_total,
          discount: this.purchaseData.discount,
          items_sample: this.purchaseData.items?.[0]
        });
      }

      // Mostrar opciones post-pago
      await this.showPostPaymentOptions(result);

      // Limpiar el carrito después del pago exitoso
      this.cartService.clearActiveCart();

      // Notificar actualización del inventario con delay para evitar conflictos
      setTimeout(() => {
        this.paymentService.notifyInventoryRefresh();
      }, 1000);

      // Cerrar modal de forma suave
      this.softCloseModal();

    } catch (error) {
      console.error('Error al procesar el pago:', error);
      this.notificationService.error('Error de Pago', 'Error al procesar el pago: ' + (error instanceof Error ? error.message : 'Error desconocido'));
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Muestra las opciones después del pago (impresión, WhatsApp, etc.)
   */
  async showPostPaymentOptions(paymentResult: any): Promise<void> {
    const paymentMethod = this.paymentService.getPaymentMethod(this.selectedPaymentMethod);
    const finalAmount = paymentResult.amount || this.total;
    const discountMessage = this.discount > 0 ? `\nDescuento aplicado: ${this.discount.toLocaleString('es-CO', {style: 'currency', currency: 'COP'})}` : '';
    const successMessage = `¡Pago procesado exitosamente!\n\nMétodo: ${paymentMethod?.name}\nTotal pagado: ${finalAmount.toLocaleString('es-CO', {style: 'currency', currency: 'COP'})}${discountMessage}`;
    
    if (this.requiresInvoice && paymentResult.invoice) {
      this.notificationService.success(
        'Pago Procesado Exitosamente',
        `${successMessage}\n\n✓ Factura electrónica generada: ${paymentResult.invoice.invoiceNumber}`,
        5000
      );

      // Ofrecer descarga inmediata del PDF si existe
      try {
        const pdfPath = paymentResult.invoice.pdfPath || (paymentResult.invoice && paymentResult.invoice.url ? paymentResult.invoice.url : null);
        if (pdfPath) {
          const wantsDownload = await this.notificationService.confirm(
            'Descargar Factura',
            '¿Desea descargar una copia del PDF de la factura ahora?',
            'Descargar',
            'Más tarde'
          );
          if (wantsDownload) {
            const saveRes = await this.electronService.saveFileCopy(pdfPath);
            if (saveRes && saveRes.success) {
              this.notificationService.success('Archivo Guardado', 'Copia guardada en: ' + saveRes.savedPath);
            } else {
              this.notificationService.error('Error de Guardado', 'No se pudo guardar la copia: ' + (saveRes?.error || 'error desconocido'));
            }
          }
        }
      } catch (err) {
        console.warn('Error tratando de ofrecer descarga del PDF:', err);
      }
    } else {
      this.notificationService.success(
        'Pago Procesado Exitosamente',
        successMessage,
        4000
      );
    }

    // Verificar configuración de impresión automática
    const config = this.configService.getCurrentConfig();
    const legacyPrinter = config.printer.legacy.printerName;
    
    if (config.postPayment.autoprint && config.printer.legacy.enabled) {
      // Impresión automática habilitada
      await this.executeAutomaticPrint(paymentResult);
    } else {
      // Preguntar si quiere impresión automática o manual usando notificación no bloqueante
      const autoChoice = await this.notificationService.confirm(
        'Pago Exitoso - Opciones de Impresión',
        `${successMessage}\n\n` +
        `🪄 ¿Desea IMPRIMIR AUTOMÁTICAMENTE con método exitoso?\n\n` +
        `✓ Impresora: ${legacyPrinter}\n` +
        `✓ Imprime + Corta + Abre cajón`,
        'Imprimir Ahora',
        'Más Opciones'
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
      
      this.notificationService.success(
        'Impresión Automática Completada',
        `Impresora: ${legacyPrinter}\n\n` +
        `✓ Ticket impreso\n` +
        `✓ Papel cortado\n` +
        `✓ Cajón abierto\n\n` +
        `¡Venta completada exitosamente!\n\n` +
        `🎯 SIGUIENTE VENTA LISTA`,
        6000
      );
      
    } catch (error) {
      console.error('Error en impresión automática:', error);
      this.notificationService.error(
        'Error en Impresión Automática',
        `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`,
        5000
      );
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
          this.notificationService.info('Impresión', 'Diálogo de impresión abierto');
          break;

        case '2':
          // Generar PDF y ofrecer opción de guardar (descargar) el archivo para enviar por otro medio
          try {
            if (this.requiresInvoice && paymentResult.invoice) {
              const invoiceGen = await this.electronService.generateElectronicInvoice({ saleData: this.purchaseData, clientData: this.foundClient });
              if (invoiceGen && invoiceGen.pdfPath) {
                // Preguntar al usuario si desea guardar una copia
                const save = await this.notificationService.confirm('PDF Generado', 'PDF generado en el sistema. ¿Desea guardar una copia en otra ubicación?', 'Guardar Copia', 'No Guardar');
                if (save) {
                  const saveRes = await this.electronService.saveFileCopy(invoiceGen.pdfPath);
                  if (saveRes && saveRes.success) {
                    this.notificationService.success('Copia Guardada', 'Copia guardada en: ' + saveRes.savedPath);
                  } else {
                    this.notificationService.error('Error Copia', 'No se guardó la copia: ' + (saveRes?.error || 'Error desconocido'));
                  }
                } else {
                  this.notificationService.success('PDF Generado', 'PDF generado en: ' + invoiceGen.pdfPath);
                }
              } else {
                this.notificationService.error('Error PDF', 'No se pudo generar el PDF de la factura');
              }
            } else {
              // Para comprobantes no electrónicos, abrir diálogo de impresión y el usuario puede escoger "Guardar como PDF"
              this.notificationService.info('Guardar PDF', 'Para exportar el comprobante a PDF, use la opción "Guardar como PDF" en el diálogo de impresión. Se abrirá el diálogo ahora.');
              await this.electronService.showPrintDialog(printData);
            }
          } catch (err) {
            console.error('Error generando/guardando PDF:', err);
            this.notificationService.error('Error PDF', 'Error generando/guardando PDF: ' + (err instanceof Error ? err.message : String(err)));
          }
          break;

        case '3':
          const printers = await this.electronService.getAvailablePrinters();
          if (printers.thermal.length === 0) {
            this.notificationService.warning('Sin Impresoras', 'No se encontraron impresoras térmicas');
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
          this.notificationService.success('Impresión Enviada', 'Impresión térmica enviada');
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
          
          this.notificationService.success('Venta Completada', `Método exitoso completado. Impresora: ${legacyPrinterName}. Ticket impreso, papel cortado, cajón abierto. ¡Venta completada exitosamente!`);
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
          this.notificationService.info('Impresoras Disponibles', printerList.join('\n'));
          break;

        case '6':
        default:
          // No hacer nada
          break;
      }
    } catch (error) {
      console.error('Error ejecutando acción post-pago:', error);
      this.notificationService.error('Error', 'Error: ' + (error instanceof Error ? error.message : 'Error desconocido'));
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
      this.notificationService.warning('Campo Requerido', 'Por favor ingrese el número de documento');
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
      this.notificationService.error('Error Búsqueda', 'Error al buscar el cliente');
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
      this.notificationService.warning('Campo Requerido', 'El nombre completo es obligatorio');
      return;
    }
    if (!this.newClient.phone_number.trim()) {
      this.notificationService.warning('Campo Requerido', 'El número de teléfono es obligatorio');
      return;
    }
    if (!this.newClient.email.trim()) {
      this.notificationService.warning('Campo Requerido', 'El correo electrónico es obligatorio');
      return;
    }

    try {
      const result = await this.electronService.addClient(this.newClient);
      if (result) {
        this.notificationService.success('Cliente Creado', 'Cliente creado exitosamente');
        this.foundClient = { ...this.newClient, id: result.lastInsertRowid };
        this.showClientForm = false;
        this.clientNotFound = false;
      }
    } catch (error) {
      console.error('Error al crear cliente:', error);
      this.notificationService.error('Error Cliente', 'Error al crear el cliente');
    }
  }

  /**
   * Calcula el desglose de totales con IVA
   */
  calculateTotals(): void {
    if (!this.purchaseData) return;
    
    this.originalTotal = this.purchaseData.total; // Guardar total original
    this.total = this.purchaseData.total;
    this.ivaAmount = this.total * 0.19; // 19% IVA
    this.subtotal = this.total - this.ivaAmount;
  }

  /**
   * Calcula las vueltas cuando se ingresa dinero en efectivo
   */
  calculateChange(): void {
    const cash = Number(this.cashReceived) || 0;
    const totalAmount = Number(this.total) || 0;
    
    if (cash > totalAmount) {
      this.changeAmount = cash - totalAmount;
    } else if (cash < totalAmount) {
      this.changeAmount = cash - totalAmount; // Negativo para mostrar faltante
    } else {
      this.changeAmount = 0; // Pago exacto
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
  onCashReceivedChange(event: any): void {
    const value = parseFloat(event.target.value) || 0;
    this.cashReceived = value;
    this.calculateChange();
    console.log('💰 Dinero recibido actualizado:', this.cashReceived);
  }



  /**
   * Maneja cambios en el descuento
   */
  onDiscountChange(event: any): void {
    const value = parseFloat(event.target.value) || 0;
    
    // Validar que el descuento no sea mayor al total original
    if (value > this.originalTotal) {
      this.discountError = 'El descuento no puede ser mayor al total';
      return;
    } else {
      this.discountError = '';
    }
    
    this.discount = value;
    this.calculateTotalWithDiscount();
    console.log('💸 Descuento actualizado:', this.discount);
  }

  /**
   * Calcula el total con descuento aplicado
   */
  calculateTotalWithDiscount(): void {
    this.total = Math.max(0, this.originalTotal - this.discount);
    // Recalcular cambio si hay efectivo ingresado
    this.calculateChange();
    
    console.log('🧮 Total recalculado:', {
      original: this.originalTotal,
      descuento: this.discount,
      nuevo_total: this.total
    });
  }

  /**
   * Valida el descuento antes de procesar el pago
   */
  validateDiscount(): boolean {
    if (this.discount > 0 && this.discount < 500) {
      this.discountError = 'El descuento mínimo es de $500';
      return false;
    }
    return true;
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
    this.discount = 0;
    this.discountError = '';
    
    console.log('✅ Campos de cliente reseteados');
  }
}
