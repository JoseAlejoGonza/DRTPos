import { Injectable } from '@angular/core';

export interface NotificationOptions {
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number; // en millisegundos, 0 = no auto close
  showConfirm?: boolean; // para confirmaciones
  confirmText?: string;
  cancelText?: string;
}

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private container: HTMLElement | null = null;
  private activeNotifications: Set<HTMLElement> = new Set();

  constructor() {
    this.createContainer();
  }

  private createContainer(): void {
    if (this.container) return;

    this.container = document.createElement('div');
    this.container.id = 'notification-container';
    this.container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
    `;
    document.body.appendChild(this.container);
  }

  show(options: NotificationOptions): Promise<boolean> {
    return new Promise((resolve) => {
      const notification = this.createNotification(options, resolve);
      
      if (this.container) {
        this.container.appendChild(notification);
        this.activeNotifications.add(notification);

        // Animar entrada
        setTimeout(() => {
          notification.style.transform = 'translateX(0)';
          notification.style.opacity = '1';
        }, 10);

        // Auto cerrar si no es confirmación
        if (!options.showConfirm && options.duration !== 0) {
          const duration = options.duration || 3000;
          setTimeout(() => {
            this.removeNotification(notification);
            resolve(true);
          }, duration);
        }
      }
    });
  }

  private createNotification(options: NotificationOptions, resolve: (value: boolean) => void): HTMLElement {
    const notification = document.createElement('div');
    notification.style.cssText = `
      background: white;
      border-radius: 8px;
      padding: 16px 20px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      max-width: 400px;
      min-width: 300px;
      border-left: 4px solid ${this.getColor(options.type)};
      transform: translateX(100%);
      opacity: 0;
      transition: all 0.3s ease;
      pointer-events: auto;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    `;

    const icon = this.getIcon(options.type);
    const color = this.getColor(options.type);

    notification.innerHTML = `
      <div style="display: flex; align-items: flex-start; gap: 12px;">
        <div style="color: ${color}; font-size: 20px; flex-shrink: 0; margin-top: 2px;">
          ${icon}
        </div>
        <div style="flex: 1;">
          <div style="font-weight: bold; color: #333; margin-bottom: 4px; font-size: 14px;">
            ${options.title}
          </div>
          <div style="color: #666; font-size: 13px; line-height: 1.4;">
            ${options.message}
          </div>
          ${options.showConfirm ? this.createConfirmButtons(options, resolve, notification) : ''}
        </div>
        ${!options.showConfirm ? `
          <button onclick="this.parentElement.parentElement.remove()" 
                  style="background: none; border: none; color: #999; cursor: pointer; font-size: 16px; padding: 0; margin-left: 8px;">
            ✕
          </button>
        ` : ''}
      </div>
    `;

    return notification;
  }

  private createConfirmButtons(options: NotificationOptions, resolve: (value: boolean) => void, notification: HTMLElement): string {
    const confirmText = options.confirmText || 'Aceptar';
    const cancelText = options.cancelText || 'Cancelar';

    setTimeout(() => {
      const confirmBtn = notification.querySelector('[data-action="confirm"]') as HTMLElement;
      const cancelBtn = notification.querySelector('[data-action="cancel"]') as HTMLElement;

      if (confirmBtn) {
        confirmBtn.onclick = () => {
          this.removeNotification(notification);
          resolve(true);
        };
      }

      if (cancelBtn) {
        cancelBtn.onclick = () => {
          this.removeNotification(notification);
          resolve(false);
        };
      }
    }, 100);

    return `
      <div style="margin-top: 12px; display: flex; gap: 8px; justify-content: flex-end;">
        <button data-action="cancel" 
                style="background: #f5f5f5; border: 1px solid #ddd; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
          ${cancelText}
        </button>
        <button data-action="confirm" 
                style="background: #007bff; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 12px;">
          ${confirmText}
        </button>
      </div>
    `;
  }

  private removeNotification(notification: HTMLElement): void {
    if (!notification.parentNode) return;

    notification.style.transform = 'translateX(100%)';
    notification.style.opacity = '0';
    
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
      this.activeNotifications.delete(notification);
    }, 300);
  }

  private getIcon(type: string): string {
    const icons = {
      success: '✅',
      error: '❌',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return icons[type as keyof typeof icons] || icons.info;
  }

  private getColor(type: string): string {
    const colors = {
      success: '#28a745',
      error: '#dc3545',
      warning: '#ffc107',
      info: '#17a2b8'
    };
    return colors[type as keyof typeof colors] || colors.info;
  }

  // Métodos de conveniencia
  success(title: string, message: string, duration = 3000): Promise<boolean> {
    return this.show({ type: 'success', title, message, duration });
  }

  error(title: string, message: string, duration = 5000): Promise<boolean> {
    return this.show({ type: 'error', title, message, duration });
  }

  warning(title: string, message: string, duration = 4000): Promise<boolean> {
    return this.show({ type: 'warning', title, message, duration });
  }

  info(title: string, message: string, duration = 3000): Promise<boolean> {
    return this.show({ type: 'info', title, message, duration });
  }

  confirm(title: string, message: string, confirmText = 'Sí', cancelText = 'No'): Promise<boolean> {
    return this.show({
      type: 'warning',
      title,
      message,
      showConfirm: true,
      confirmText,
      cancelText,
      duration: 0
    });
  }

  // Limpiar todas las notificaciones
  clear(): void {
    this.activeNotifications.forEach(notification => {
      this.removeNotification(notification);
    });
  }
}