import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronService } from '../../services/electron.service';
import { ConfigService, AppConfig } from '../../services/config.service';
import { NotificationService } from '../../services/notification.service';
import { AuthService } from '../../services/auth.service';

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
            <!-- Solo administradores pueden acceder a configuración de empresa -->
            <button *ngIf="authService.isAdmin()" 
                    class="nav-link" 
                    [class.active]="activeTab === 'company'"
                    (click)="activeTab = 'company'" 
                    type="button">
              <i class="fas fa-building me-2"></i>
              Empresa
            </button>
            <!-- <button class="nav-link" 
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
            </button> -->
            <!-- Solo administradores pueden acceder a configuración de impresión -->
            <button *ngIf="authService.isAdmin()" 
                    class="nav-link" 
                    [class.active]="activeTab === 'printing'"
                    (click)="activeTab = 'printing'" 
                    type="button">
              <i class="fas fa-print me-2"></i>
              Impresión
            </button>
            <!-- Backup disponible para todos los usuarios -->
            <button class="nav-link" 
                    [class.active]="activeTab === 'backup'"
                    (click)="activeTab = 'backup'" 
                    type="button">
              <i class="fas fa-database me-2"></i>
              Backup
            </button>
          </div>
        </nav>

        <div class="tab-content">
          <!-- Configuración de Empresa - Solo administradores -->
          <div class="tab-pane" [class.active]="activeTab === 'company'" *ngIf="activeTab === 'company' && authService.isAdmin()">
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
          <!-- <div class="tab-pane" [class.active]="activeTab === 'invoicing'" *ngIf="activeTab === 'invoicing'">
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
          </div> -->

          <!-- Configuración de WhatsApp -->
          <!-- <div class="tab-pane" [class.active]="activeTab === 'whatsapp'" *ngIf="activeTab === 'whatsapp'">
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
          </div> -->

          <!-- Configuración de Impresión -->
          <div class="tab-pane" [class.active]="activeTab === 'printing'" *ngIf="activeTab === 'printing' && authService.isAdmin()">
            <div class="config-section">
              <h5>Configuración de Impresión</h5>
              
              <!-- Selección de Impresora -->
              <div class="card mb-3">
                <div class="card-header">
                  <i class="fas fa-cog me-2"></i>
                  Configuración de Impresora
                </div>
                <div class="card-body">
                  <form (ngSubmit)="savePrinterConfig()" #printerForm="ngForm">
                    <div class="row">
                      <div class="col-md-6">
                        <label class="form-label">Seleccionar Impresora *</label>
                        <select class="form-select" 
                                [(ngModel)]="selectedPrinter" 
                                name="selectedPrinter"
                                required>
                          <option *ngFor="let printer of availablePrinters" 
                                  [value]="printer">
                            {{ printer }}
                          </option>
                        </select>
                        <small class="form-text text-muted">
                          Selecciona la impresora que usarás para imprimir tickets
                        </small>
                      </div>
                      <div class="col-md-6">
                        <label class="form-label">Impresión Automática</label>
                        <div class="form-check">
                          <input class="form-check-input" 
                                 type="checkbox" 
                                 [(ngModel)]="autoprintEnabled"
                                 name="autoprintEnabled"
                                 id="autoprintEnabled">
                          <label class="form-check-label" for="autoprintEnabled">
                            Imprimir automáticamente después del pago
                          </label>
                        </div>
                      </div>
                    </div>
                    
                    <div class="form-actions mt-3">
                      <button type="submit" 
                              class="btn btn-primary"
                              [disabled]="!printerForm.form.valid">
                        <i class="fas fa-save me-2"></i>
                        Guardar Configuración
                      </button>
                    </div>
                  </form>
                </div>
              </div>
              
              <!-- Pruebas de Impresión -->
              <div class="row">
                <div class="col-md-6">
                  <div class="card">
                    <div class="card-header">
                      <i class="fas fa-receipt me-2"></i>
                      Pruebas de Impresión Térmica
                    </div>
                    <div class="card-body">
                      <p class="mb-3">
                        <strong>Impresora configurada:</strong> 
                        <span class="badge bg-primary">{{ selectedPrinter }}</span>
                      </p>
                      <p>Prueba tu impresora térmica con diferentes métodos:</p>
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
                        <!-- <button type="button" 
                                class="btn btn-info btn-sm"
                                (click)="testESCPOSCommands('POS-80')"
                                title="Probar comandos ESC/POS específicos para POS-80">
                          <i class="fas fa-wrench me-2"></i>
                          Prueba ESC/POS (POS-80)
                        </button> -->
                      </div>
                    </div>
                  </div>
                </div>
                
                <div class="col-md-6">
                  <div class="card">
                    <div class="card-header">
                      <i class="fas fa-print me-2"></i>
                      Diagnóstico de Impresoras
                    </div>
                    <div class="card-body">
                      <p>Herramientas para diagnosticar problemas de impresión:</p>
                      <div class="d-flex gap-2 flex-wrap">
                        <button type="button" 
                                class="btn btn-outline-info btn-sm"
                                (click)="showAvailablePrinters()">
                          <i class="fas fa-list me-2"></i>
                          Ver Impresoras Detectadas
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Configuración de Backup -->
          <div class="tab-pane" [class.active]="activeTab === 'backup'" *ngIf="activeTab === 'backup'">
            <div class="config-section">
              <h5>Backup y Restauración de Datos</h5>
              <p class="text-muted">Administra los backups de tu base de datos para proteger tu información.</p>
              
              <!-- Estadísticas de la Base de Datos -->
              <div class="card mb-3">
                <div class="card-header">
                  <i class="fas fa-chart-bar me-2"></i>
                  Estado Actual de la Base de Datos
                </div>
                <div class="card-body">
                  <div class="row" *ngIf="dbStats">
                    <div class="col-md-3">
                      <div class="stat-item">
                        <div class="stat-value">{{ dbStats.sizeFormatted }}</div>
                        <div class="stat-label">Tamaño Total</div>
                      </div>
                    </div>
                    <div class="col-md-3">
                      <div class="stat-item">
                        <div class="stat-value">{{ dbStats.totalRecords }}</div>
                        <div class="stat-label">Registros Totales</div>
                      </div>
                    </div>
                    <div class="col-md-6">
                      <div class="stat-item">
                        <div class="stat-value">{{ dbStats.lastModified | date:'dd/MM/yyyy HH:mm' }}</div>
                        <div class="stat-label">Última Modificación</div>
                      </div>
                    </div>
                  </div>
                  <div class="mt-3">
                    <h6>Detalle por Tablas:</h6>
                    <div class="row" *ngIf="dbStats && dbStats.tables">
                      <div class="col-md-6" *ngFor="let table of objectKeys(dbStats.tables)">
                        <small class="text-muted">{{ table }}: {{ dbStats.tables[table] }} registros</small>
                      </div>
                    </div>
                  </div>
                  <div class="mt-3">
                    <button type="button" 
                            class="btn btn-outline-primary btn-sm"
                            (click)="refreshDbStats()">
                      <i class="fas fa-sync-alt me-2"></i>
                      Actualizar Estadísticas
                    </button>
                  </div>
                </div>
              </div>

              <!-- Crear Backup -->
              <div class="card mb-3">
                <div class="card-header">
                  <i class="fas fa-download me-2"></i>
                  Crear Backup
                </div>
                <div class="card-body">
                  <div class="alert alert-info">
                    <i class="fas fa-info-circle me-2"></i>
                    <strong>¿Qué incluye el backup?</strong><br>
                    El backup incluye todos tus productos, ventas, clientes, facturas y configuraciones.
                    Se guardará como un archivo .db que podrás usar para restaurar en caso de emergencia.
                  </div>
                  
                  <div class="d-grid gap-2">
                    <button type="button" 
                            class="btn btn-success"
                            (click)="createBackup()"
                            [disabled]="backupInProgress">
                      <i class="fas fa-download me-2" *ngIf="!backupInProgress"></i>
                      <i class="fas fa-spinner fa-spin me-2" *ngIf="backupInProgress"></i>
                      {{ backupInProgress ? 'Creando backup...' : 'Crear Backup Ahora' }}
                    </button>
                  </div>
                  
                  <div class="mt-3" *ngIf="lastBackupResult">
                    <div class="alert" [class.alert-success]="lastBackupResult.success" 
                         [class.alert-danger]="!lastBackupResult.success">
                      <i class="fas fa-check-circle me-2" *ngIf="lastBackupResult.success"></i>
                      <i class="fas fa-exclamation-triangle me-2" *ngIf="!lastBackupResult.success"></i>
                      {{ lastBackupResult.message }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Restaurar Backup -->
              <div class="card mb-3">
                <div class="card-header">
                  <i class="fas fa-upload me-2"></i>
                  Restaurar Backup
                </div>
                <div class="card-body">
                  <div class="alert alert-warning">
                    <i class="fas fa-exclamation-triangle me-2"></i>
                    <strong>¡Importante!</strong><br>
                    Restaurar un backup reemplazará completamente todos los datos actuales.
                    Se creará automáticamente un backup de seguridad antes de la restauración.
                  </div>
                  
                  <div class="d-grid gap-2">
                    <button type="button" 
                            class="btn btn-outline-danger"
                            (click)="restoreBackup()"
                            [disabled]="restoreInProgress">
                      <i class="fas fa-upload me-2" *ngIf="!restoreInProgress"></i>
                      <i class="fas fa-spinner fa-spin me-2" *ngIf="restoreInProgress"></i>
                      {{ restoreInProgress ? 'Restaurando...' : 'Seleccionar y Restaurar Backup' }}
                    </button>
                  </div>
                  
                  <div class="mt-3" *ngIf="lastRestoreResult">
                    <div class="alert" [class.alert-success]="lastRestoreResult.success" 
                         [class.alert-danger]="!lastRestoreResult.success">
                      <i class="fas fa-check-circle me-2" *ngIf="lastRestoreResult.success"></i>
                      <i class="fas fa-exclamation-triangle me-2" *ngIf="!lastRestoreResult.success"></i>
                      {{ lastRestoreResult.message }}
                    </div>
                  </div>
                </div>
              </div>

              <!-- Recomendaciones -->
              <div class="card">
                <div class="card-header">
                  <i class="fas fa-lightbulb me-2"></i>
                  Recomendaciones de Backup
                </div>
                <div class="card-body">
                  <ul class="mb-0">
                    <li class="mb-2">
                      <strong>Frecuencia:</strong> Crea backups regularmente, especialmente antes de cambios importantes.
                    </li>
                    <li class="mb-2">
                      <strong>Almacenamiento:</strong> Guarda los backups en dispositivos externos (USB, nube, etc.).
                    </li>
                    <li class="mb-2">
                      <strong>Verificación:</strong> Prueba ocasionalmente la restauración en un sistema de prueba.
                    </li>
                    <li class="mb-2">
                      <strong>Seguridad:</strong> Mantén múltiples copias en ubicaciones diferentes.
                    </li>
                  </ul>
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
  // legacyPrinterName: string = 'POS-80';
  autoprintEnabled: boolean = true;
  thermalPrinterName: string = '';
  thermalPaperWidth: number = 48;

  // Lista de impresoras disponibles
  availablePrinters: string[] = [
    'POS-80C',
    'EPSON TM-T20II Receipt',
    'Generic / Text Only',
    'Thermal Printer',
    'POS Printer',
    'Receipt Printer',
    'DigitalPOS',
    'POS-80'
  ];

  // Impresora seleccionada
  selectedPrinter: string = 'DigitalPOS';

  // Propiedades de backup
  dbStats: any = null;
  backupInProgress: boolean = false;
  restoreInProgress: boolean = false;
  lastBackupResult: any = null;
  lastRestoreResult: any = null;

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
    private configService: ConfigService,
    private notificationService: NotificationService,
    public authService: AuthService
  ) {}

  async ngOnInit(): Promise<void> {
    // Inicializar propiedades primero
    this.initializeDefaults();
    
    // Configurar pestaña inicial según el tipo de usuario
    if (this.authService.isGeneral()) {
      this.activeTab = 'backup';
    } else {
      this.activeTab = 'company';
    }
    
    // Luego cargar configuración guardada
    await this.loadAllConfigs();
    this.loadLegacyConfig();
    
    // Cargar estadísticas de backup
    await this.refreshDbStats();
  }

  /**
   * Inicializa valores por defecto para evitar problemas con inputs
   */
  private initializeDefaults(): void {
    this.legacyPrinterName = this.legacyPrinterName || 'DigitalPOS';
    this.selectedPrinter = this.selectedPrinter || 'DigitalPOS';
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
      selectedPrinter: this.selectedPrinter,
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
      this.selectedPrinter = appConfig.printer?.legacy?.printerName || this.selectedPrinter || 'DigitalPOS';
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
      // Sincronizar la impresora seleccionada con el nombre legacy
      this.legacyPrinterName = this.selectedPrinter.trim();
      
      // Actualizar configuración de impresora
      this.configService.updatePrinterConfig({
        legacy: {
          printerName: this.selectedPrinter.trim(),
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

      this.notificationService.success('Configuración Guardada', `Impresora: ${this.selectedPrinter.trim()}. Impresión automática: ${this.autoprintEnabled ? 'Habilitada' : 'Deshabilitada'}. ¡La configuración se aplicará en el próximo pago!`);

      console.log('✅ Configuración legacy guardada:', {
        selectedPrinter: this.selectedPrinter.trim(),
        legacyPrinter: this.legacyPrinterName.trim(),
        autoprint: this.autoprintEnabled
      });

    } catch (error) {
      console.error('❌ Error guardando configuración:', error);
      this.notificationService.error('Error Configuración', 'Error al guardar la configuración');
    }
  }

  /**
   * Guarda la configuración de impresora seleccionada
   */
  savePrinterConfig(): void {
    this.saveLegacyConfig();
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
            printerName: this.selectedPrinter.trim(),
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

      this.notificationService.success('Configuración Completa', `Configuración completa guardada: Impresora ${this.selectedPrinter.trim()}, Impresión automática ${this.autoprintEnabled ? 'Sí' : 'No'}, Empresa ${this.config.invoicing.companyName}, WhatsApp ${this.config.whatsapp.enabled ? 'Habilitado' : 'Deshabilitado'}. ¡Configuración aplicada exitosamente!`);

    } catch (error) {
      console.error('❌ Error guardando configuración completa:', error);
      this.notificationService.error('Error Completo', 'Error al guardar la configuración completa');
    }
  }

  /**
   * Recarga la configuración desde el servicio
   */
  loadConfig(): void {
    this.loadLegacyConfig();
    this.notificationService.success('Configuración Recargada', 'Configuración recargada desde localStorage');
  }

  /**
   * Restaura la configuración por defecto
   */
  async resetConfig(): Promise<void> {
    const confirm = await this.notificationService.confirm(
      'Restaurar Configuración',
      'Esto eliminará toda la configuración actual y restaurará los valores por defecto. ¿Estás seguro de continuar?'
    );

    if (confirm) {
      this.configService.resetToDefault();
      this.loadLegacyConfig();
      this.notificationService.success('Configuración Restaurada', 'Configuración restaurada a valores por defecto');
    }
  }

  private async loadAllConfigs(): Promise<void> {
    try {
      this.companyConfig = await this.electronService.getCompanyConfig();
      this.invoicingConfig = await this.electronService.getInvoicingConfig();
      this.whatsAppConfig = await this.electronService.getWhatsAppConfig();
      
    } catch (error) {
      console.error('Error cargando configuraciones:', error);
      this.notificationService.error('Error Carga', 'Error cargando configuraciones');
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
        this.notificationService.success('Empresa Guardada', 'Configuración de empresa guardada exitosamente');
      } else {
        this.notificationService.error('Error Empresa', 'Error guardando configuración de empresa');
      }
    } catch (error) {
      console.error('Error guardando configuración de empresa:', error);
      this.notificationService.error('Error Empresa', 'Error guardando configuración de empresa');
    }
  }

  // Nota: la funcionalidad de WhatsApp automatizado fue removida de la UI.

  // Funciones relacionadas con WhatsApp automatizado fueron eliminadas.

  async saveInvoicingConfig(): Promise<void> {
    try {
      const result = await this.electronService.updateInvoicingConfig(this.invoicingConfig);
      if (result) {
        this.notificationService.success('Facturación Guardada', 'Configuración de facturación guardada exitosamente');
      } else {
        this.notificationService.error('Error Facturación', 'Error guardando configuración de facturación');
      }
    } catch (error) {
      console.error('Error guardando configuración de facturación:', error);
      this.notificationService.error('Error Facturación', 'Error guardando configuración de facturación');
    }
  }

  async saveWhatsAppConfig(): Promise<void> {
    try {
      const result = await this.electronService.updateWhatsAppConfig(this.whatsAppConfig);
      if (result) {
        this.notificationService.success('WhatsApp Guardado', 'Configuración de WhatsApp guardada exitosamente');
      } else {
        this.notificationService.error('Error WhatsApp', 'Error guardando configuración de WhatsApp');
      }
    } catch (error) {
      console.error('Error guardando configuración de WhatsApp:', error);
      this.notificationService.error('Error WhatsApp', 'Error guardando configuración de WhatsApp');
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
        this.notificationService.warning('Sin Impresoras Térmicas', `No se encontraron impresoras térmicas automáticamente. Impresoras detectadas: ${allPrinters}. Puedes seleccionarla manualmente.`);
        
        // Permitir selección manual
        const printerNames = printers.all.map((p: any, i: number) => `${i + 1}. ${p.name}`);
        const choice = prompt(`Selecciona tu impresora térmica:\n\n${printerNames.join('\n')}\n\nIngresa el número:`);
        
        if (!choice || isNaN(parseInt(choice))) {
          return;
        }
        
        const selectedIndex = parseInt(choice) - 1;
        if (selectedIndex < 0 || selectedIndex >= printers.all.length) {
          this.notificationService.error('Selección Inválida', 'Selección inválida');
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
        this.notificationService.success('Impresión Enviada', `Impresión de prueba enviada a: ${selectedPrinter.name}`);
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
      this.notificationService.success('Impresión Térmica', `Impresión de prueba enviada a impresora térmica: ${thermalPrinter.name}`);
      
    } catch (error) {
      console.error('Error en impresión de prueba:', error);
      this.notificationService.error('Error Impresión', `Error en impresión de prueba: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  async testBasicPrint(): Promise<void> {
    try {
      console.log('Iniciando prueba básica de impresión...');
      const printers = await this.electronService.getAvailablePrinters();
      
      if (printers.all.length === 0) {
        this.notificationService.warning('Sin Impresoras', 'No se detectaron impresoras en el sistema');
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
        this.notificationService.error('Selección Inválida', 'Selección inválida');
        return;
      }
      
      const selectedPrinter = printers.all[selectedIndex];
      console.log('Ejecutando prueba básica en:', selectedPrinter.name);
      
      const result = await this.electronService.testBasicPrint(selectedPrinter.name);
      console.log('Resultado de prueba básica:', result);
      
      this.notificationService.success('Prueba Enviada', `Prueba básica enviada a: ${selectedPrinter.name}. Si no imprimió, revisa que la impresora esté encendida, tenga papel, los drivers estén instalados y no haya trabajos pendientes. Revisa también la consola (F12) para más detalles.`);
      
    } catch (error) {
      console.error('Error en prueba básica:', error);
      this.notificationService.error('Error Prueba', `Error en prueba básica: ${error instanceof Error ? error.message : 'Error desconocido'}. Revisa la consola de desarrollo (F12) para más detalles.`);
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
        'DigitalPOS',
        'POS-80'
      ];
      
      // Usar la impresora configurada o por defecto
      const defaultPrinter = this.selectedPrinter.trim() || this.legacyPrinterName.trim() || defaultPrinters[6];
      
      console.log('✅ Usando impresora configurada:', defaultPrinter);
      console.log('🏢 Datos de empresa configurados:', this.config.invoicing);
      
      // Ejecutar directamente con el nombre y configuración
      await this.executeLegacyPrintWithConfig(defaultPrinter);
      
    } catch (error) {
      console.error('❌ Error iniciando método legacy:', error);
      this.notificationService.error('Error', `Error: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  async executeLegacyPrintWithConfig(printerName: string): Promise<void> {
    try {
      console.log('🔧 Debug - executeLegacyPrint iniciado con:', printerName);
      
      if (!printerName || !printerName.trim()) {
        this.notificationService.warning('Campo Requerido', 'Debe ingresar el nombre de la impresora');
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

      this.notificationService.success('Método Exitoso', `Método exitoso completado en impresora: ${printerName.trim()}. Resultado: ${result.message}. Se imprimió el ticket con datos de empresa, se cortó el papel y se abrió el cajón. Configura los datos de empresa en "Facturación Electrónica" para personalizar el recibo. ¡Este es el método que usaremos en el sistema!`);
      
    } catch (error) {
      console.error('❌ Error en método legacy:', error);
      this.notificationService.error('Error Método', `Error en método exitoso. Impresora: ${printerName.trim()}. Error: ${error instanceof Error ? error.message : 'Error desconocido'}. Posibles causas: nombre no existe en Windows, impresora apagada, sin papel o faltan drivers. Solución: configura el nombre exacto como aparece en Panel de Control → Dispositivos e impresoras. Revisa la consola (F12).`);
    }
  }

  async executeLegacyPrint(printerName: string): Promise<void> {
    // Mantener método original para compatibilidad
    return this.executeLegacyPrintWithConfig(printerName);
  }

  // async testESCPOSCommands(printerName: string): Promise<void> {
  //   try {
  //     console.log('🧪 Iniciando prueba de comandos ESC/POS...');
      
  //     if (!printerName || !printerName.trim()) {
  //       this.notificationService.warning('Campo Requerido', 'Debe ingresar el nombre de la impresora');
  //       return;
  //     }

  //     this.notificationService.info('Prueba Iniciada', `Iniciando prueba de comandos ESC/POS en: ${printerName.trim()}. Observa la impresora para ver qué comandos funcionan.`);

  //     const result = await this.electronService.testESCPOSCommands(printerName.trim());
      
  //     console.log('📊 Resultados de la prueba:', result);

  //     // Crear resumen de resultados
  //     const successfulCommands = result.results.filter((r: any) => r.status === 'SUCCESS');
  //     const failedCommands = result.results.filter((r: any) => r.status === 'ERROR');
      
  //     let message = `Prueba completada en ${printerName.trim()}.\n\n`;
  //     message += `✅ Comandos exitosos (${successfulCommands.length}):\n`;
  //     successfulCommands.forEach((cmd: any) => {
  //       message += `• ${cmd.command}\n`;
  //     });
      
  //     if (failedCommands.length > 0) {
  //       message += `\n❌ Comandos fallidos (${failedCommands.length}):\n`;
  //       failedCommands.forEach((cmd: any) => {
  //         message += `• ${cmd.command}\n`;
  //       });
  //     }

  //     message += '\n🔧 Los comandos exitosos se usarán automáticamente con tu impresora.';

  //     this.notificationService.success('Prueba Completada', message);
      
  //   } catch (error) {
  //     console.error('❌ Error en prueba de comandos ESC/POS:', error);
  //     this.notificationService.error('Error Prueba', `Error probando comandos ESC/POS en ${printerName.trim()}: ${error instanceof Error ? error.message : 'Error desconocido'}`);
  //   }
  // }

  // Funciones para manejar el diálogo de impresora
  onPrinterDialogConfirm(): void {
    console.log('🔧 Debug - onPrinterDialogConfirm llamado:', {
      printerName: this.printerName,
      printerDialogType: this.printerDialogType
    });

    if (!this.printerName.trim()) {
      this.notificationService.warning('Campo Requerido', 'Por favor ingresa el nombre de la impresora');
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
      
      this.notificationService.info('Lista de Impresoras', message.join('\n'));
    } catch (error) {
      console.error('Error obteniendo impresoras:', error);
      this.notificationService.error('Error Impresoras', `Error obteniendo lista de impresoras: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
  }

  async resetAllConfig(): Promise<void> {
    const confirmed = await this.notificationService.confirm('Restaurar Configuración', '¿Está seguro de que desea restaurar toda la configuración a los valores por defecto?');
    if (confirmed) {
      try {
        const result = await this.electronService.resetConfig();
        if (result) {
          await this.loadAllConfigs();
          this.notificationService.success('Configuración Restaurada', 'Configuración restaurada exitosamente');
        } else {
          this.notificationService.error('Error Restaurar', 'Error restaurando configuración');
        }
      } catch (error) {
        console.error('Error restaurando configuración:', error);
        this.notificationService.error('Error Restaurar', 'Error restaurando configuración');
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
      this.notificationService.success('Configuración Exportada', 'Configuración exportada exitosamente');
    } catch (error) {
      console.error('Error exportando configuración:', error);
      this.notificationService.error('Error Exportar', 'Error exportando configuración');
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
          this.notificationService.success('Configuración Importada', 'Configuración importada exitosamente');
        } else {
          this.notificationService.error('Error Importar', 'Error importando configuración');
        }
      } catch (error) {
        console.error('Error importando configuración:', error);
        this.notificationService.error('Error Importar', 'Error importando configuración');
      }
    };
    
    input.click();
  }

  // Métodos para backup y restauración
  async refreshDbStats(): Promise<void> {
    try {
      this.dbStats = await this.electronService.getBackupStats();
    } catch (error) {
      console.error('Error obteniendo estadísticas de BD:', error);
    }
  }

  async createBackup(): Promise<void> {
    if (this.backupInProgress) return;

    this.backupInProgress = true;
    this.lastBackupResult = null;

    try {
      this.lastBackupResult = await this.electronService.createBackup();
    } catch (error) {
      console.error('Error creando backup:', error);
      this.lastBackupResult = {
        success: false,
        message: 'Error interno creando backup'
      };
    } finally {
      this.backupInProgress = false;
    }
  }

  async restoreBackup(): Promise<void> {
    if (this.restoreInProgress) return;

    // Confirmación adicional
    const confirm = await this.notificationService.confirm(
      'Restaurar Backup',
      '¿Está COMPLETAMENTE SEGURO de restaurar un backup? Esta acción reemplazará todos los datos actuales, no se puede deshacer y se creará un backup automático antes de continuar.'
    );

    if (!confirm) return;

    this.restoreInProgress = true;
    this.lastRestoreResult = null;

    try {
      this.lastRestoreResult = await this.electronService.restoreBackup();
      
      if (this.lastRestoreResult.success) {
        // Refrescar estadísticas después de restaurar
        await this.refreshDbStats();
      }
    } catch (error) {
      console.error('Error restaurando backup:', error);
      this.lastRestoreResult = {
        success: false,
        message: 'Error interno restaurando backup'
      };
    } finally {
      this.restoreInProgress = false;
    }
  }

  // Método helper para usar Object.keys en el template
  objectKeys(obj: any): string[] {
    return Object.keys(obj || {});
  }
}