import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronService } from '../../services/electron.service';
import { ConfigService, AppConfig } from '../../services/config.service';

interface CompanyConfig {
  name: string;
  nit: string;
  address: string;
  phone: string;
  email: string;
  website: string;
}

interface InvoicingConfig {
  enabled: boolean;
  environment: string;
  certificatePath: string;
  certificatePassword: string;
  resolutionNumber: string;
  resolutionDate: string;
  invoicePrefix: string;
  ivaRate: number;
}

interface WhatsAppConfig {
  enabled: boolean;
  companyPhone: string;
}

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="settings-container">
      <div class="settings-header">
        <h3>
          <i class="fas fa-cog me-2"></i>
          Configuración del Sistema
        </h3>
        <p class="text-muted">Configura los parámetros de tu sistema POS</p>
      </div>

      <div class="settings-tabs">
        <nav>
          <div class="nav nav-tabs" id="nav-tab" role="tablist">
            <button class="nav-link" 
                    [class.active]="activeTab === 'company'"
                    (click)="activeTab = 'company'" 
                    type="button">
              <i class="fas fa-building me-2"></i>
              Empresa
            </button>
            <button class="nav-link" 
                    [class.active]="activeTab === 'invoicing'"
                    (click)="activeTab = 'invoicing'" 
                    type="button">
              <i class="fas fa-file-invoice me-2"></i>
              Facturación
            </button>
            <button class="nav-link" 
                    [class.active]="activeTab === 'whatsapp'"
                    (click)="activeTab = 'whatsapp'" 
                    type="button">
              <i class="fab fa-whatsapp me-2"></i>
              WhatsApp
            </button>
            <button class="nav-link" 
                    [class.active]="activeTab === 'printing'"
                    (click)="activeTab = 'printing'" 
                    type="button">
              <i class="fas fa-print me-2"></i>
              Impresión
            </button>
          </div>
        </nav>

        <div class="tab-content">
          <!-- Configuración de Empresa -->
          <div class="tab-pane" [class.active]="activeTab === 'company'" *ngIf="activeTab === 'company'">
            <div class="config-section">
              <h5>Información de la Empresa</h5>
              
              <form (ngSubmit)="saveCompanyConfig()" #companyForm="ngForm">
                <div class="row">
                  <div class="col-md-6">
                    <label class="form-label">Nombre de la Empresa *</label>
                    <input type="text" 
                           class="form-control" 
                           [(ngModel)]="companyConfig.name" 
                           name="companyName"
                           required>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">NIT/RUT *</label>
                    <input type="text" 
                           class="form-control" 
                           [(ngModel)]="companyConfig.nit" 
                           name="companyNit"
                           required>
                  </div>
                </div>
                
                <div class="row mt-3">
                  <div class="col-md-12">
                    <label class="form-label">Dirección</label>
                    <textarea class="form-control" 
                              [(ngModel)]="companyConfig.address" 
                              name="companyAddress"
                              rows="2"></textarea>
                  </div>
                </div>
                
                <div class="row mt-3">
                  <div class="col-md-6">
                    <label class="form-label">Teléfono</label>
                    <input type="tel" 
                           class="form-control" 
                           [(ngModel)]="companyConfig.phone" 
                           name="companyPhone">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Email</label>
                    <input type="email" 
                           class="form-control" 
                           [(ngModel)]="companyConfig.email" 
                           name="companyEmail">
                  </div>
                </div>
                
                <div class="row mt-3">
                  <div class="col-md-6">
                    <label class="form-label">Sitio Web</label>
                    <input type="url" 
                           class="form-control" 
                           [(ngModel)]="companyConfig.website" 
                           name="companyWebsite">
                  </div>
                </div>
                
                <div class="form-actions mt-4">
                  <button type="submit" 
                          class="btn btn-primary"
                          [disabled]="!companyForm.form.valid">
                    <i class="fas fa-save me-2"></i>
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Configuración de Facturación -->
          <div class="tab-pane" [class.active]="activeTab === 'invoicing'" *ngIf="activeTab === 'invoicing'">
            <div class="config-section">
              <h5>Facturación Electrónica</h5>
              
              <form (ngSubmit)="saveInvoicingConfig()" #invoicingForm="ngForm">
                <div class="form-check mb-3">
                  <input class="form-check-input" 
                         type="checkbox" 
                         id="invoicingEnabled"
                         [(ngModel)]="invoicingConfig.enabled"
                         name="invoicingEnabled">
                  <label class="form-check-label" for="invoicingEnabled">
                    Habilitar facturación electrónica
                  </label>
                </div>
                
                <div class="row">
                  <div class="col-md-6">
                    <label class="form-label">Ambiente</label>
                    <select class="form-select" 
                            [(ngModel)]="invoicingConfig.environment"
                            name="environment">
                      <option value="test">Pruebas</option>
                      <option value="production">Producción</option>
                    </select>
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Prefijo de Factura</label>
                    <input type="text" 
                           class="form-control" 
                           [(ngModel)]="invoicingConfig.invoicePrefix" 
                           name="invoicePrefix">
                  </div>
                </div>
                
                <div class="row mt-3">
                  <div class="col-md-6">
                    <label class="form-label">Número de Resolución DIAN</label>
                    <input type="text" 
                           class="form-control" 
                           [(ngModel)]="invoicingConfig.resolutionNumber" 
                           name="resolutionNumber">
                  </div>
                  <div class="col-md-6">
                    <label class="form-label">Fecha de Resolución</label>
                    <input type="date" 
                           class="form-control" 
                           [(ngModel)]="invoicingConfig.resolutionDate" 
                           name="resolutionDate">
                  </div>
                </div>
                
                <div class="row mt-3">
                  <div class="col-md-6">
                    <label class="form-label">Tasa de IVA</label>
                    <div class="input-group">
                      <input type="number" 
                             class="form-control" 
                             [(ngModel)]="invoicingConfig.ivaRate" 
                             name="ivaRate"
                             min="0" 
                             max="1" 
                             step="0.01">
                      <span class="input-group-text">%</span>
                    </div>
                  </div>
                </div>
                
                <div class="alert alert-info mt-3">
                  <i class="fas fa-info-circle me-2"></i>
                  Para habilitar completamente la facturación electrónica, debe configurar 
                  el certificado digital y endpoint de la DIAN.
                </div>
                
                <div class="form-actions mt-4">
                  <button type="submit" 
                          class="btn btn-primary">
                    <i class="fas fa-save me-2"></i>
                    Guardar Cambios
                  </button>
                </div>
              </form>

              
            </div>
          </div>

          <!-- Configuración de WhatsApp -->
          <div class="tab-pane" [class.active]="activeTab === 'whatsapp'" *ngIf="activeTab === 'whatsapp'">
            <div class="config-section">
              <h5>Integración WhatsApp</h5>
              
              <form (ngSubmit)="saveWhatsAppConfig()" #whatsappForm="ngForm">
                <div class="form-check mb-3">
                  <input class="form-check-input" 
                         type="checkbox" 
                         id="whatsappEnabled"
                         [(ngModel)]="whatsAppConfig.enabled"
                         name="whatsappEnabled">
                  <label class="form-check-label" for="whatsappEnabled">
                    Habilitar envío por WhatsApp
                  </label>
                </div>
                
                <div class="row">
                  <div class="col-md-6">
                    <label class="form-label">Número de WhatsApp de la Empresa</label>
                    <input type="tel" 
                           class="form-control" 
                           [(ngModel)]="whatsAppConfig.companyPhone" 
                           name="whatsappPhone"
                           placeholder="+57 300 123 4567">
                    <small class="form-text text-muted">
                      Incluya el código de país (+57 para Colombia)
                    </small>
                  </div>
                </div>
                
                <div class="alert alert-info mt-3">
                  <i class="fab fa-whatsapp me-2"></i>
                  El envío por WhatsApp abrirá WhatsApp Web con un mensaje preformateado. 
                  Asegúrese de tener WhatsApp Web configurado en su navegador.
                </div>
                
                <div class="form-actions mt-4">
                  <button type="submit" 
                          class="btn btn-primary">
                    <i class="fas fa-save me-2"></i>
                    Guardar Cambios
                  </button>
                </div>
              </form>
            </div>
          </div>

          <!-- Configuración de Impresión -->
          <div class="tab-pane" [class.active]="activeTab === 'printing'" *ngIf="activeTab === 'printing'">
            <div class="config-section">
              <h5>Configuración de Impresión</h5>
              
              <div class="row">
                <div class="col-md-6">
                  <div class="card">
                    <div class="card-header">
                      <i class="fas fa-receipt me-2"></i>
                      Impresión Térmica
                    </div>
                    <div class="card-body">
                      <p>Configure las opciones para impresoras térmicas de tickets.</p>
                      <div class="d-flex gap-2 flex-wrap">
                        <button type="button" 
                                class="btn btn-outline-primary btn-sm"
                                (click)="testThermalPrint()">
                          <i class="fas fa-print me-2"></i>
                          Prueba Avanzada
                        </button>
                        <button type="button" 
                                class="btn btn-outline-success btn-sm"
                                (click)="testBasicPrint()">
                          <i class="fas fa-vial me-2"></i>
                          Prueba Básica
                        </button>
                        <button type="button" 
                                class="btn btn-outline-warning btn-sm"
                                (click)="testLegacyPrint()">
                          <i class="fas fa-magic me-2"></i>
                          Método Exitoso
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="col-md-6">
                  <div class="card">
                    <div class="card-header">
                      <i class="fas fa-print me-2"></i>
                      Impresión Normal
                    </div>
                    <div class="card-body">
                      <p>Configure las opciones para impresoras normales (A4).</p>
                      <button type="button" 
                              class="btn btn-outline-primary btn-sm"
                              (click)="showAvailablePrinters()">
                        <i class="fas fa-list me-2"></i>
                        Ver Impresoras
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- Acciones Generales -->
      <div class="general-actions mt-4">
        <div class="row">
          <div class="col-md-6">
            <button type="button" 
                    class="btn btn-outline-warning me-2"
                    (click)="resetAllConfig()">
              <i class="fas fa-undo me-2"></i>
              Restaurar Valores por Defecto
            </button>
          </div>
          <div class="col-md-6 text-end">
            <button type="button" 
                    class="btn btn-outline-secondary me-2"
                    (click)="exportConfig()">
              <i class="fas fa-download me-2"></i>
              Exportar Configuración
            </button>
            <button type="button" 
                    class="btn btn-outline-secondary"
                    (click)="importConfig()">
              <i class="fas fa-upload me-2"></i>
              Importar Configuración
            </button>
          </div>
        </div>
      </div>
    </div>
  `,
  styleUrls: ['./settings.component.scss']
})
export class SettingsComponent implements OnInit {
  activeTab: string = 'company';
  
  // Para el diálogo de impresora
  showPrinterDialog: boolean = false;
  printerName: string = '';
  printerDialogType: 'legacy' | 'basic' | 'thermal' = 'legacy';
  
  companyConfig: CompanyConfig = {
    name: '',
    nit: '',
    address: '',
    phone: '',
    email: '',
    website: ''
  };

  invoicingConfig: InvoicingConfig = {
    enabled: false,
    environment: 'test',
    certificatePath: '',
    certificatePassword: '',
    resolutionNumber: '',
    resolutionDate: '',
    invoicePrefix: 'FE',
    ivaRate: 0.19
  };

  whatsAppConfig: WhatsAppConfig = {
    enabled: false,
    companyPhone: ''
  };

  // Configuración de impresora legacy
  legacyPrinterName: string = 'DigitalPOS';
  autoprintEnabled: boolean = true;
  thermalPrinterName: string = '';
  thermalPaperWidth: number = 48;

  // Configuración completa del sistema
  config = {
    normal: {
      paperWidth: 80,
      printerName: ''
    },
    invoicing: {
      companyNit: '',
      companyName: 'DRT POS',
      companyAddress: '',
      companyCity: '',
      companyPhone: '',
      companyEmail: ''
    },
    whatsapp: {
      enabled: true,
      defaultMessage: 'Hola! Te enviamos tu comprobante de compra. Gracias por elegirnos.'
    }
  };

  constructor(
    private electronService: ElectronService,
    private configService: ConfigService
  ) {}

  async ngOnInit(): Promise<void> {
    // Inicializar propiedades primero
    this.initializeDefaults();
    
    // Luego cargar configuración guardada
    await this.loadAllConfigs();
    this.loadLegacyConfig();
  }

  /**
   * Inicializa valores por defecto para evitar problemas con inputs
   */
  private initializeDefaults(): void {
    this.legacyPrinterName = this.legacyPrinterName || 'DigitalPOS';
    this.autoprintEnabled = this.autoprintEnabled ?? true;
    this.thermalPrinterName = this.thermalPrinterName || '';
    this.thermalPaperWidth = this.thermalPaperWidth || 48;
    this.printerName = this.printerName || '';
    
    // Asegurar que config existe
    if (!this.config) {
      this.config = {
        normal: {
          paperWidth: 80,
          printerName: ''
        },
        invoicing: {
          companyNit: '',
          companyName: 'DRT POS',
          companyAddress: '',
          companyCity: '',
          companyPhone: '',
          companyEmail: ''
        },
        whatsapp: {
          enabled: true,
          defaultMessage: 'Hola! Te enviamos tu comprobante de compra. Gracias por elegirnos.'
        }
      };
    }
    
    console.log('✅ Propiedades inicializadas:', {
      legacyPrinterName: this.legacyPrinterName,
      autoprintEnabled: this.autoprintEnabled,
      config: this.config
    });
  }

  /**
   * Carga la configuración de impresora legacy
   */
  private loadLegacyConfig(): void {
    try {
      const appConfig = this.configService.getCurrentConfig();
      
      // Configuración legacy (con fallbacks)
      this.legacyPrinterName = appConfig.printer?.legacy?.printerName || this.legacyPrinterName || 'DigitalPOS';
      this.autoprintEnabled = appConfig.postPayment?.autoprint ?? this.autoprintEnabled ?? true;
      this.thermalPrinterName = appConfig.printer?.thermal?.printerName || this.thermalPrinterName || '';
      this.thermalPaperWidth = appConfig.printer?.thermal?.paperWidth || this.thermalPaperWidth || 48;
      
      // Configuración general (con fallbacks)
      if (appConfig.printer?.normal) {
        this.config.normal.paperWidth = appConfig.printer.normal.paperWidth || 80;
        this.config.normal.printerName = appConfig.printer.normal.printerName || '';
      }
      
      if (appConfig.invoicing) {
        this.config.invoicing = { 
          companyNit: appConfig.invoicing.companyNit || this.companyConfig.nit || '',
          companyName: appConfig.invoicing.companyName || this.companyConfig.name || 'DRT POS',
          companyAddress: appConfig.invoicing.companyAddress || this.companyConfig.address || '',
          companyCity: appConfig.invoicing.companyCity || '',
          companyPhone: appConfig.invoicing.companyPhone || this.companyConfig.phone || '',
          companyEmail: appConfig.invoicing.companyEmail || this.companyConfig.email || ''
        };
      } else {
        // Si no hay configuración legacy, usar la del sistema nuevo
        this.config.invoicing = { 
          companyNit: this.companyConfig.nit || '',
          companyName: this.companyConfig.name || 'DRT POS',
          companyAddress: this.companyConfig.address || '',
          companyCity: '',
          companyPhone: this.companyConfig.phone || '',
          companyEmail: this.companyConfig.email || ''
        };
      }
      
      if (appConfig.whatsapp) {
        this.config.whatsapp = {
          enabled: appConfig.whatsapp.enabled ?? true,
          defaultMessage: appConfig.whatsapp.defaultMessage || 'Hola! Te enviamos tu comprobante de compra. Gracias por elegirnos.'
        };
      }
      
      console.log('✅ Configuración cargada:', {
        legacyPrinter: this.legacyPrinterName,
        autoprint: this.autoprintEnabled,
        config: this.config
      });
      
    } catch (error) {
      console.error('❌ Error cargando configuración:', error);
      console.log('🔧 Usando valores por defecto');
    }
  }

  /**
   * Guarda la configuración de impresora legacy
   */
  saveLegacyConfig(): void {
    try {
      // Actualizar configuración de impresora
      this.configService.updatePrinterConfig({
        legacy: {
          printerName: this.legacyPrinterName.trim(),
          enabled: true
        },
        thermal: {
          printerName: this.thermalPrinterName.trim(),
          paperWidth: this.thermalPaperWidth,
          enabled: false
        }
      });

      // Actualizar configuración de impresión automática
      this.configService.setAutoprint(this.autoprintEnabled);

      alert(
        `✅ CONFIGURACIÓN GUARDADA\n\n` +
        `Impresora Legacy: ${this.legacyPrinterName.trim()}\n` +
        `Impresión automática: ${this.autoprintEnabled ? 'Habilitada' : 'Deshabilitada'}\n\n` +
        `¡La configuración se aplicará en el próximo pago!`
      );

      console.log('✅ Configuración legacy guardada:', {
        legacyPrinter: this.legacyPrinterName.trim(),
        autoprint: this.autoprintEnabled
      });

    } catch (error) {
      console.error('❌ Error guardando configuración:', error);
      alert('❌ Error al guardar la configuración');
    }
  }

  /**
   * Guarda toda la configuración del sistema
   */
  saveConfig(): void {
    try {
      // Crear configuración completa
      const fullConfig: AppConfig = {
        printer: {
          legacy: {
            printerName: this.legacyPrinterName.trim(),
            enabled: true
          },
          thermal: {
            printerName: this.thermalPrinterName.trim(),
            paperWidth: this.thermalPaperWidth,
            enabled: false
          },
          normal: {
            printerName: this.config.normal.printerName.trim(),
            paperWidth: this.config.normal.paperWidth,
            enabled: false
          }
        },
        invoicing: { ...this.config.invoicing },
        whatsapp: { ...this.config.whatsapp },
        postPayment: {
          autoprint: this.autoprintEnabled,
          showOptions: !this.autoprintEnabled
        }
      };

      this.configService.saveConfig(fullConfig);

      alert(
        `✅ CONFIGURACIÓN COMPLETA GUARDADA\n\n` +
        `✓ Impresora Legacy: ${this.legacyPrinterName.trim()}\n` +
        `✓ Impresión automática: ${this.autoprintEnabled ? 'Sí' : 'No'}\n` +
        `✓ Empresa: ${this.config.invoicing.companyName}\n` +
        `✓ WhatsApp: ${this.config.whatsapp.enabled ? 'Habilitado' : 'Deshabilitado'}\n\n` +
        `¡Configuración aplicada exitosamente!`
      );

    } catch (error) {
      console.error('❌ Error guardando configuración completa:', error);
      alert('❌ Error al guardar la configuración completa');
    }
  }

  /**
   * Recarga la configuración desde el servicio
   */
  loadConfig(): void {
    this.loadLegacyConfig();
    alert('✅ Configuración recargada desde localStorage');
  }

  /**
   * Restaura la configuración por defecto
   */
  resetConfig(): void {
    const confirm = window.confirm(
      '⚠️ RESTAURAR CONFIGURACIÓN\n\n' +
      'Esto eliminará toda la configuración actual y restaurará los valores por defecto.\n\n' +
      '¿Estás seguro de continuar?'
    );

    if (confirm) {
      this.configService.resetToDefault();
      this.loadLegacyConfig();
      alert('✅ Configuración restaurada a valores por defecto');
    }
  }

  private async loadAllConfigs(): Promise<void> {
    try {
      this.companyConfig = await this.electronService.getCompanyConfig();
      this.invoicingConfig = await this.electronService.getInvoicingConfig();
      this.whatsAppConfig = await this.electronService.getWhatsAppConfig();
      
    } catch (error) {
      console.error('Error cargando configuraciones:', error);
      alert('Error cargando configuraciones');
    }
  }

  async saveCompanyConfig(): Promise<void> {
    try {
      // Guardar en el sistema nuevo (base de datos)
      const result = await this.electronService.updateCompanyConfig(this.companyConfig);
      
      // También guardar en el sistema legacy (localStorage) para mantener compatibilidad
      const currentConfig = this.configService.getCurrentConfig();
      const updatedConfig = {
        ...currentConfig,
        invoicing: {
          ...currentConfig.invoicing,
          companyName: this.companyConfig.name,
          companyNit: this.companyConfig.nit,
          companyAddress: this.companyConfig.address,
          companyCity: '', // Se puede agregar si es necesario
          companyPhone: this.companyConfig.phone,
          companyEmail: this.companyConfig.email
        }
      };
      
      this.configService.saveConfig(updatedConfig);
      
      if (result) {
        console.log('✅ Configuración de empresa guardada en ambos sistemas:', {
          nuevo: this.companyConfig,
          legacy: updatedConfig.invoicing
        });
        alert('Configuración de empresa guardada exitosamente');
      } else {
        alert('Error guardando configuración de empresa');
      }
    } catch (error) {
      console.error('Error guardando configuración de empresa:', error);
      alert('Error guardando configuración de empresa');
    }
  }

  // Nota: la funcionalidad de WhatsApp automatizado fue removida de la UI.

  // Funciones relacionadas con WhatsApp automatizado fueron eliminadas.

  async saveInvoicingConfig(): Promise<void> {
    try {
      const result = await this.electronService.updateInvoicingConfig(this.invoicingConfig);
      if (result) {
        alert('Configuración de facturación guardada exitosamente');
      } else {
        alert('Error guardando configuración de facturación');
      }
    } catch (error) {
      console.error('Error guardando configuración de facturación:', error);
      alert('Error guardando configuración de facturación');
    }
  }

  async saveWhatsAppConfig(): Promise<void> {
    try {
      const result = await this.electronService.updateWhatsAppConfig(this.whatsAppConfig);
      if (result) {
        alert('Configuración de WhatsApp guardada exitosamente');
      } else {
        alert('Error guardando configuración de WhatsApp');
      }
    } catch (error) {
      console.error('Error guardando configuración de WhatsApp:', error);
      alert('Error guardando configuración de WhatsApp');
    }
  }

  async testThermalPrint(): Promise<void> {
    try {
      console.log('Iniciando prueba de impresión térmica...');
      const printers = await this.electronService.getAvailablePrinters();
      
      console.log('Impresoras detectadas:', printers);
      
      if (printers.thermal.length === 0) {
        // Mostrar todas las impresoras para ayudar con el diagnóstico
        const allPrinters = printers.all.map((p: any) => `- ${p.name} (${p.status || 'estado desconocido'})`).join('\n');
        alert(`No se encontraron impresoras térmicas automáticamente.\n\nTodas las impresoras detectadas:\n${allPrinters}\n\n¿Cuál es tu impresora térmica? Puedes seleccionarla manualmente.`);
        
        // Permitir selección manual
        const printerNames = printers.all.map((p: any, i: number) => `${i + 1}. ${p.name}`);
        const choice = prompt(`Selecciona tu impresora térmica:\n\n${printerNames.join('\n')}\n\nIngresa el número:`);
        
        if (!choice || isNaN(parseInt(choice))) {
          return;
        }
        
        const selectedIndex = parseInt(choice) - 1;
        if (selectedIndex < 0 || selectedIndex >= printers.all.length) {
          alert('Selección inválida');
          return;
        }
        
        const selectedPrinter = printers.all[selectedIndex];
        console.log('Impresora seleccionada manualmente:', selectedPrinter);
        
        const testData = {
          saleData: {
            items: [
              { name: 'Producto de Prueba', quantity: 1, price: 1000 }
            ],
            total: 1000
          },
          clientData: null,
          invoiceData: null,
          paymentMethod: 'Efectivo',
          printerName: selectedPrinter.name
        };

        console.log('Enviando datos de prueba:', testData);
        await this.electronService.printThermal(testData);
        alert(`Impresión de prueba enviada a: ${selectedPrinter.name}`);
        return;
      }

      // Si hay impresoras térmicas detectadas automáticamente
      const thermalPrinter = printers.thermal[0];
      console.log('Usando impresora térmica detectada:', thermalPrinter);

      const testData = {
        saleData: {
          items: [
            { name: 'Producto de Prueba', quantity: 1, price: 1000 }
          ],
          total: 1000
        },
        clientData: null,
        invoiceData: null,
        paymentMethod: 'Efectivo',
        printerName: thermalPrinter.name
      };

      console.log('Enviando datos de prueba a impresora térmica:', testData);
      await this.electronService.printThermal(testData);
      alert(`Impresión de prueba enviada a impresora térmica: ${thermalPrinter.name}`);
      
    } catch (error) {
      console.error('Error en impresión de prueba:', error);
      alert(`Error en impresión de prueba: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  async testBasicPrint(): Promise<void> {
    try {
      console.log('Iniciando prueba básica de impresión...');
      const printers = await this.electronService.getAvailablePrinters();
      
      if (printers.all.length === 0) {
        alert('No se detectaron impresoras en el sistema');
        return;
      }

      // Mostrar todas las impresoras para selección
      const printerNames = printers.all.map((p: any, i: number) => 
        `${i + 1}. ${p.name}${p.isDefault ? ' (Predeterminada)' : ''} - ${p.status || 'Estado desconocido'}`
      );
      
      const choice = prompt(
        `🖨️ PRUEBA BÁSICA DE IMPRESIÓN\n\nSelecciona la impresora para probar:\n\n${printerNames.join('\n')}\n\nIngresa el número:`
      );
      
      if (!choice || isNaN(parseInt(choice))) {
        return;
      }
      
      const selectedIndex = parseInt(choice) - 1;
      if (selectedIndex < 0 || selectedIndex >= printers.all.length) {
        alert('Selección inválida');
        return;
      }
      
      const selectedPrinter = printers.all[selectedIndex];
      console.log('Ejecutando prueba básica en:', selectedPrinter.name);
      
      const result = await this.electronService.testBasicPrint(selectedPrinter.name);
      console.log('Resultado de prueba básica:', result);
      
      alert(
        `✅ Prueba básica enviada a: ${selectedPrinter.name}\n\n` +
        `Si no imprimió, revisa:\n` +
        `• Que la impresora esté encendida\n` +
        `• Que tenga papel\n` +
        `• Los drivers estén instalados\n` +
        `• No haya trabajos de impresión pendientes\n\n` +
        `Revisa también la consola de desarrollo (F12) para más detalles.`
      );
      
    } catch (error) {
      console.error('Error en prueba básica:', error);
      alert(`Error en prueba básica: ${error instanceof Error ? error.message : 'Error desconocido'}\n\nRevisa la consola de desarrollo (F12) para más detalles.`);
    }
  }

  async testLegacyPrint(): Promise<void> {
    try {
      console.log('🪄 Iniciando prueba con método exitoso (Legacy)...');
      
      // Usar nombre de impresora por defecto (los más comunes)
      const defaultPrinters = [
        'POS-80C',
        'EPSON TM-T20II Receipt',
        'Generic / Text Only',
        'Thermal Printer',
        'POS Printer',
        'Receipt Printer',
        'DigitalPOS'
      ];
      
      // Usar la impresora configurada o por defecto
      const defaultPrinter = this.legacyPrinterName.trim() || defaultPrinters[6];
      
      console.log('✅ Usando impresora configurada:', defaultPrinter);
      console.log('🏢 Datos de empresa configurados:', this.config.invoicing);
      
      // Ejecutar directamente con el nombre y configuración
      await this.executeLegacyPrintWithConfig(defaultPrinter);
      
    } catch (error) {
      console.error('❌ Error iniciando método legacy:', error);
      alert(`❌ Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  async executeLegacyPrintWithConfig(printerName: string): Promise<void> {
    try {
      console.log('🔧 Debug - executeLegacyPrint iniciado con:', printerName);
      
      if (!printerName || !printerName.trim()) {
        alert('Debe ingresar el nombre de la impresora');
        return;
      }

      // Datos de prueba con configuración de empresa
      const testData = {
        saleData: {
          items: [
            { name: 'Producto de Prueba 1', quantity: 2, price: 1500 },
            { name: 'Producto de Prueba 2', quantity: 1, price: 2500 },
            { name: 'Producto muy largo para probar como se ve', quantity: 1, price: 3000 }
          ],
          total: 8500
        },
        clientData: {
          name: 'Cliente de Prueba',
          document_type: 'CC',
          document_number: '12345678'
        },
        invoiceData: {
          requiresInvoice: true,
          invoiceNumber: 'FE000123'
        },
        paymentMethod: 'Efectivo',
        printerName: printerName.trim(),
        // Agregar configuración de empresa
        companyConfig: {
          name: this.config.invoicing.companyName || 'DRT POS',
          nit: this.config.invoicing.companyNit || 'NIT: No configurado',
          address: this.config.invoicing.companyAddress || 'Dirección no configurada',
          city: this.config.invoicing.companyCity || '',
          phone: this.config.invoicing.companyPhone || 'Teléfono no configurado',
          email: this.config.invoicing.companyEmail || ''
        }
      };

      console.log('📋 Enviando datos de prueba con método legacy:', testData);
      
      console.log(`🪄 INICIANDO MÉTODO EXITOSO - Impresora: ${printerName.trim()}`);

      const result = await this.electronService.printThermalLegacy(testData);
      console.log('✅ Resultado del método legacy:', result);

      alert(
        `✅ MÉTODO EXITOSO COMPLETADO\n\n` +
        `Impresora: ${printerName.trim()}\n` +
        `Resultado: ${result.message}\n\n` +
        `✅ DATOS DE EMPRESA INCLUIDOS:\n` +
        `• Nombre: ${this.config.invoicing.companyName || 'No configurado'}\n` +
        `• NIT: ${this.config.invoicing.companyNit || 'No configurado'}\n` +
        `• Dirección: ${this.config.invoicing.companyAddress || 'No configurado'}\n` +
        `• Teléfono: ${this.config.invoicing.companyPhone || 'No configurado'}\n\n` +
        `Si funcionó correctamente:\n` +
        `• Se imprimió el ticket con datos de empresa\n` +
        `• Se cortó el papel\n` +
        `• Se abrió el cajón\n\n` +
        `💡 NOTA: Configura los datos de empresa\n` +
        `en la sección "Facturación Electrónica"\n` +
        `para personalizar el recibo.\n\n` +
        `¡Este es el método que usaremos en el sistema!`
      );
      
    } catch (error) {
      console.error('❌ Error en método legacy:', error);
      alert(
        `❌ ERROR EN MÉTODO EXITOSO\n\n` +
        `Impresora que se intentó usar: ${printerName.trim()}\n` +
        `Error: ${error instanceof Error ? error.message : 'Error desconocido'}\n\n` +
        `Posibles causas:\n` +
        `• El nombre "${printerName.trim()}" no existe en Windows\n` +
        `• La impresora está apagada o desconectada\n` +
        `• No tiene papel o está en error\n` +
        `• Faltan drivers de impresora\n\n` +
        `💡 SOLUCIÓN: Necesitamos configurar el nombre\n` +
        `exacto de tu impresora como aparece en:\n` +
        `Panel de Control → Dispositivos e impresoras\n\n` +
        `Revisa la consola de desarrollo (F12) para más detalles.`
      );
    }
  }

  async executeLegacyPrint(printerName: string): Promise<void> {
    // Mantener método original para compatibilidad
    return this.executeLegacyPrintWithConfig(printerName);
  }

  // Funciones para manejar el diálogo de impresora
  onPrinterDialogConfirm(): void {
    console.log('🔧 Debug - onPrinterDialogConfirm llamado:', {
      printerName: this.printerName,
      printerDialogType: this.printerDialogType
    });

    if (!this.printerName.trim()) {
      alert('Por favor ingresa el nombre de la impresora');
      return;
    }

    this.showPrinterDialog = false;
    
    switch (this.printerDialogType) {
      case 'legacy':
        console.log('🔧 Debug - Ejecutando legacy print...');
        this.executeLegacyPrint(this.printerName.trim());
        break;
      case 'basic':
        console.log('Impresión básica con impresora:', this.printerName.trim());
        // Aquí iría la lógica de impresión básica si es necesaria
        break;
      case 'thermal':
        // Lógica para impresión térmica normal si es necesario
        break;
    }
  }

  onPrinterDialogCancel(): void {
    console.log('🔧 Debug - Modal cancelado');
    this.showPrinterDialog = false;
    this.printerName = '';
  }

  async showAvailablePrinters(): Promise<void> {
    try {
      console.log('Obteniendo lista de impresoras...');
      const printers = await this.electronService.getAvailablePrinters();
      console.log('Respuesta completa de impresoras:', printers);
      
      const message = [
        '🖨️ IMPRESORAS DISPONIBLES:',
        '',
        '🎫 Térmicas (detectadas automáticamente):',
        ...(printers.thermal.length > 0 
          ? printers.thermal.map((p: any) => `  ✓ ${p.name} - Estado: ${p.status || 'Desconocido'}`)
          : ['  ❌ Ninguna detectada automáticamente']),
        '',
        '🖨️ Normales:',
        ...(printers.normal.length > 0 
          ? printers.normal.map((p: any) => `  ✓ ${p.name} - Estado: ${p.status || 'Desconocido'}`)
          : ['  ❌ Ninguna detectada']),
        '',
        '📋 TODAS LAS IMPRESORAS:',
        ...(printers.all.length > 0 
          ? printers.all.map((p: any, index: number) => 
              `  ${index + 1}. ${p.name}\n     Estado: ${p.status || 'Desconocido'}\n     Descripción: ${p.description || 'N/A'}\n     ¿Es la impresora por defecto? ${p.isDefault ? 'Sí' : 'No'}`)
          : ['  ❌ No se detectaron impresoras']),
        '',
        '💡 DIAGNÓSTICO:',
        `  • Total impresoras: ${printers.all.length}`,
        `  • Térmicas detectadas: ${printers.thermal.length}`,
        `  • Normales detectadas: ${printers.normal.length}`,
        '',
        '❓ Si tu impresora térmica no aparece en "Térmicas",',
        '   puedes seleccionarla manualmente en "Probar Impresión"'
      ];
      
      alert(message.join('\n'));
    } catch (error) {
      console.error('Error obteniendo impresoras:', error);
      alert(`Error obteniendo lista de impresoras: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  async resetAllConfig(): Promise<void> {
    if (confirm('¿Está seguro de que desea restaurar toda la configuración a los valores por defecto?')) {
      try {
        const result = await this.electronService.resetConfig();
        if (result) {
          await this.loadAllConfigs();
          alert('Configuración restaurada exitosamente');
        } else {
          alert('Error restaurando configuración');
        }
      } catch (error) {
        console.error('Error restaurando configuración:', error);
        alert('Error restaurando configuración');
      }
    }
  }

  async exportConfig(): Promise<void> {
    try {
      const configJson = await this.electronService.exportConfig();
      const blob = new Blob([configJson], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = 'drtpos-config.json';
      a.click();
      
      URL.revokeObjectURL(url);
      alert('Configuración exportada exitosamente');
    } catch (error) {
      console.error('Error exportando configuración:', error);
      alert('Error exportando configuración');
    }
  }

  async importConfig(): Promise<void> {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async (event: any) => {
      const file = event.target.files[0];
      if (!file) return;
      
      try {
        const text = await file.text();
        const result = await this.electronService.importConfig(text);
        
        if (result) {
          await this.loadAllConfigs();
          alert('Configuración importada exitosamente');
        } else {
          alert('Error importando configuración');
        }
      } catch (error) {
        console.error('Error importando configuración:', error);
        alert('Error importando configuración');
      }
    };
    
    input.click();
  }
}