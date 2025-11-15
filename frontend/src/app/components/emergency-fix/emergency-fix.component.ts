import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ElectronService } from '../../services/electron.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-emergency-fix',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="emergency-fix-container">
      <button 
        class="emergency-btn fix-btn" 
        (click)="fixInputs()"
        [disabled]="isWorking"
        title="Si los inputs están bloqueados, usa este botón para solucionarlo">
        🔧 {{ isWorking ? 'Aplicando...' : 'Fix Inputs' }}
      </button>
      

      
      <button 
        class="emergency-btn reload-btn" 
        (click)="forceReload()"
        [disabled]="isWorking"
        title="Reinicia la aplicación completamente">
        🔄 {{ isWorking ? 'Reiniciando...' : 'Reload' }}
      </button>
    </div>
  `,
  styles: [`
    .emergency-fix-container {
      position: fixed;
      bottom: 10px;
      right: 10px;
      z-index: 9999;
      display: flex;
      gap: 5px;
      opacity: 0.7;
    }
    
    .emergency-fix-container:hover {
      opacity: 1;
    }
    
    .emergency-btn {
      padding: 8px 12px;
      border: none;
      border-radius: 4px;
      font-size: 12px;
      font-weight: bold;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    }
    
    .fix-btn {
      background: linear-gradient(45deg, #ff6b35, #f7931e);
      color: white;
    }
    
    .fix-btn:hover:not(:disabled) {
      background: linear-gradient(45deg, #ff5722, #ff9800);
      transform: translateY(-1px);
    }
    
    .reload-btn {
      background: linear-gradient(45deg, #2196f3, #21cbf3);
      color: white;
    }
    
    .reload-btn:hover:not(:disabled) {
      background: linear-gradient(45deg, #1976d2, #00bcd4);
      transform: translateY(-1px);
    }
    
    .angular-btn {
      background: linear-gradient(45deg, #9c27b0, #e91e63);
      color: white;
    }
    
    .angular-btn:hover:not(:disabled) {
      background: linear-gradient(45deg, #7b1fa2, #c2185b);
      transform: translateY(-1px);
    }
    
    .emergency-btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
      transform: none !important;
    }
    
    .emergency-btn:active:not(:disabled) {
      transform: translateY(1px);
    }
  `]
})
export class EmergencyFixComponent {
  isWorking = false;

  constructor(private electronService: ElectronService, private notificationService: NotificationService) {}

  async fixInputs() {
    if (this.isWorking) return;
    
    this.isWorking = true;
    try {
      console.log('🔧 Usuario activó fix de emergencia para inputs...');
      const result = await this.electronService.fixInputs();
      
      if (result.success) {
        this.showNotification('✅ Fix aplicado correctamente. Los inputs deberían funcionar ahora.', 'success');
      } else {
        this.showNotification('❌ Error aplicando fix: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Error en fix de emergencia:', error);
      this.showNotification('❌ Error inesperado aplicando fix', 'error');
    } finally {
      this.isWorking = false;
    }
  }

  async resetAngular() {
    if (this.isWorking) return;
    
    const confirmed = await this.notificationService.confirm('Reset Angular', '¿Deseas hacer un reset completo de Angular? Esto puede solucionar problemas de inputs bloqueados de forma más agresiva.');
    if (!confirmed) return;
    
    this.isWorking = true;
    try {
      console.log('🅰️ Usuario activó reset de Angular...');
      const result = await this.electronService.resetAngular();
      
      if (result.success) {
        this.showNotification('✅ Reset de Angular completado. Los inputs deberían funcionar ahora.', 'success');
      } else {
        this.showNotification('❌ Error en reset de Angular: ' + result.error, 'error');
      }
    } catch (error) {
      console.error('Error en reset de Angular:', error);
      this.showNotification('❌ Error inesperado en reset de Angular', 'error');
    } finally {
      this.isWorking = false;
    }
  }

  async forceReload() {
    if (this.isWorking) return;
    
    const confirmed = await this.notificationService.confirm('Reiniciar App', '¿Estás seguro que deseas reiniciar la aplicación? Se perderán los cambios no guardados.');
    if (!confirmed) return;
    
    this.isWorking = true;
    try {
      console.log('🔄 Usuario activó recarga forzada...');
      await this.electronService.forceReload();
    } catch (error) {
      console.error('Error en recarga forzada:', error);
      this.showNotification('❌ Error reiniciando aplicación', 'error');
      this.isWorking = false;
    }
  }

  private showNotification(message: string, type: 'success' | 'error') {
    // Crear notificación temporal
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 12px 20px;
      border-radius: 4px;
      color: white;
      font-weight: bold;
      z-index: 10000;
      max-width: 300px;
      box-shadow: 0 4px 8px rgba(0,0,0,0.2);
      background: ${type === 'success' ? 'linear-gradient(45deg, #4caf50, #81c784)' : 'linear-gradient(45deg, #f44336, #ef5350)'};
    `;
    
    document.body.appendChild(notification);
    
    // Remover después de 3 segundos
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
  }
}