import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronService } from '../../services/electron.service';

interface LicenseStatus {
  isValid: boolean;
  customerName?: string;
  expirationDate?: string;
  hardwareId?: string;
  daysRemaining?: number;
  isExpired?: boolean;
}

@Component({
  selector: 'app-license-manager',
  standalone: true,
  imports: [CommonModule, FormsModule],
  template: `
    <div class="container-fluid p-4">
      <div class="row justify-content-center">
        <div class="col-md-8">
          <div class="card">
            <div class="card-header">
              <h4 class="mb-0">
                <i class="fas fa-certificate me-2"></i>Gestión de Licencias
              </h4>
            </div>
            <div class="card-body">
              
              <!-- Estado de Licencia -->
              <div class="row mb-4">
                <div class="col-12">
                  <h5 class="mb-3">Estado de la Licencia</h5>
                  
                  <div *ngIf="loading" class="text-center">
                    <div class="spinner-border text-primary" role="status">
                      <span class="visually-hidden">Cargando...</span>
                    </div>
                  </div>
                  
                  <div *ngIf="!loading && licenseStatus" class="alert" 
                       [ngClass]="{
                         'alert-success': licenseStatus.isValid && !licenseStatus.isExpired,
                         'alert-warning': licenseStatus.isValid && licenseStatus.isExpired,
                         'alert-danger': !licenseStatus.isValid
                       }">
                    
                    <div class="row">
                      <div class="col-md-6">
                        <strong>Estado:</strong> 
                        <span *ngIf="licenseStatus.isValid && !licenseStatus.isExpired" class="text-success">
                          <i class="fas fa-check-circle me-1"></i>Válida
                        </span>
                        <span *ngIf="licenseStatus.isValid && licenseStatus.isExpired" class="text-warning">
                          <i class="fas fa-exclamation-triangle me-1"></i>Expirada
                        </span>
                        <span *ngIf="!licenseStatus.isValid" class="text-danger">
                          <i class="fas fa-times-circle me-1"></i>Inválida
                        </span>
                      </div>
                      
                      <div class="col-md-6" *ngIf="licenseStatus.customerName">
                        <strong>Cliente:</strong> {{licenseStatus.customerName}}
                      </div>
                    </div>
                    
                    <div class="row mt-2" *ngIf="licenseStatus.expirationDate">
                      <div class="col-md-6">
                        <strong>Fecha de Expiración:</strong> {{licenseStatus.expirationDate}}
                      </div>
                      <div class="col-md-6" *ngIf="licenseStatus.daysRemaining !== undefined">
                        <strong>Días Restantes:</strong> 
                        <span [ngClass]="{
                          'text-success': licenseStatus.daysRemaining > 30,
                          'text-warning': licenseStatus.daysRemaining <= 30 && licenseStatus.daysRemaining > 7,
                          'text-danger': licenseStatus.daysRemaining <= 7
                        }">
                          {{licenseStatus.daysRemaining}}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- ID de Hardware -->
              <div class="row mb-4">
                <div class="col-12">
                  <h5 class="mb-3">Información del Hardware</h5>
                  <div class="form-group">
                    <label for="hardwareId" class="form-label">ID de Hardware (para solicitar licencia):</label>
                    <div class="input-group">
                      <input 
                        id="hardwareId"
                        type="text" 
                        class="form-control font-monospace" 
                        [value]="hardwareId" 
                        readonly>
                      <button 
                        class="btn btn-outline-secondary" 
                        type="button"
                        (click)="copyHardwareId()"
                        title="Copiar al portapapeles">
                        <i class="fas fa-copy"></i>
                      </button>
                    </div>
                    <div class="form-text">
                      Proporcione este ID al proveedor del software para generar una licencia específica para este equipo.
                    </div>
                  </div>
                </div>
              </div>
              
              <!-- Instalar Nueva Licencia -->
              <div class="row">
                <div class="col-12">
                  <h5 class="mb-3">Instalar Nueva Licencia</h5>
                  <div class="form-group mb-3">
                    <label for="licenseText" class="form-label">Código de Licencia:</label>
                    <textarea 
                      id="licenseText"
                      class="form-control font-monospace" 
                      rows="6" 
                      [(ngModel)]="newLicenseText"
                      placeholder="Pegue aquí el código de licencia proporcionado...">
                    </textarea>
                  </div>
                  
                  <div class="d-grid gap-2 d-md-flex justify-content-md-end">
                    <button 
                      class="btn btn-primary"
                      [disabled]="!newLicenseText || installing"
                      (click)="installLicense()">
                      <span *ngIf="installing" class="spinner-border spinner-border-sm me-2"></span>
                      <i *ngIf="!installing" class="fas fa-download me-2"></i>
                      Instalar Licencia
                    </button>
                  </div>
                </div>
              </div>
              
              <!-- Mensajes -->
              <div *ngIf="message" class="alert mt-3" 
                   [ngClass]="{
                     'alert-success': messageType === 'success',
                     'alert-danger': messageType === 'error',
                     'alert-info': messageType === 'info'
                   }">
                {{message}}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .font-monospace {
      font-family: 'Courier New', monospace;
      font-size: 0.9rem;
    }
    
    .alert {
      border-radius: 8px;
    }
    
    .card {
      border-radius: 12px;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    
    .card-header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      border-radius: 12px 12px 0 0;
    }
    
    .btn {
      border-radius: 6px;
    }
    
    .input-group .form-control {
      border-right: 0;
    }
    
    .input-group .btn-outline-secondary {
      border-left: 0;
    }
    
    .text-success { color: #198754 !important; }
    .text-warning { color: #fd7e14 !important; }
    .text-danger { color: #dc3545 !important; }
  `]
})
export class LicenseManagerComponent implements OnInit {
  licenseStatus: LicenseStatus | null = null;
  hardwareId: string = '';
  newLicenseText: string = '';
  loading: boolean = true;
  installing: boolean = false;
  message: string = '';
  messageType: 'success' | 'error' | 'info' = 'info';

  constructor(private electronService: ElectronService) {}

  async ngOnInit() {
    await this.loadLicenseInfo();
  }

  async loadLicenseInfo() {
    this.loading = true;
    this.message = '';
    
    try {
      // Obtener información del hardware
      const hwInfo = await this.electronService.getHardwareInfo();
      this.hardwareId = hwInfo.hardwareId;
      
      // Obtener estado de la licencia
      const status = await this.electronService.checkLicenseStatus();
      this.licenseStatus = status;
      
    } catch (error) {
      console.error('Error cargando información de licencia:', error);
      this.showMessage('Error al cargar la información de licencia', 'error');
    } finally {
      this.loading = false;
    }
  }

  copyHardwareId() {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(this.hardwareId).then(() => {
        this.showMessage('ID de hardware copiado al portapapeles', 'success');
      }).catch(() => {
        this.showMessage('Error al copiar al portapapeles', 'error');
      });
    } else {
      // Fallback para navegadores más antiguos
      const textArea = document.createElement('textarea');
      textArea.value = this.hardwareId;
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand('copy');
        this.showMessage('ID de hardware copiado al portapapeles', 'success');
      } catch {
        this.showMessage('Error al copiar al portapapeles', 'error');
      }
      document.body.removeChild(textArea);
    }
  }

  async installLicense() {
    if (!this.newLicenseText.trim()) {
      this.showMessage('Por favor ingrese el código de licencia', 'error');
      return;
    }

    this.installing = true;
    this.message = '';

    try {
      const result = await this.electronService.installLicense(this.newLicenseText.trim());
      
      if (result.success) {
        this.showMessage('Licencia instalada correctamente', 'success');
        this.newLicenseText = '';
        await this.loadLicenseInfo(); // Recargar información
      } else {
        this.showMessage(result.message || 'Error al instalar la licencia', 'error');
      }
      
    } catch (error) {
      console.error('Error instalando licencia:', error);
      this.showMessage('Error al instalar la licencia', 'error');
    } finally {
      this.installing = false;
    }
  }

  private showMessage(text: string, type: 'success' | 'error' | 'info') {
    this.message = text;
    this.messageType = type;
    
    // Auto-ocultar mensaje después de 5 segundos
    setTimeout(() => {
      this.message = '';
    }, 5000);
  }
}