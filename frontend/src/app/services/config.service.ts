import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { ElectronService } from './electron.service';

export interface PrinterConfig {
  legacy: {
    printerName: string;
    enabled: boolean;
  };
  thermal: {
    printerName: string;
    paperWidth: number;
    enabled: boolean;
  };
  normal: {
    printerName: string;
    paperWidth: number;
    enabled: boolean;
  };
}

export interface AppConfig {
  printer: PrinterConfig;
  invoicing: {
    companyNit: string;
    companyName: string;
    companyAddress: string;
    companyCity: string;
    companyPhone: string;
    companyEmail: string;
  };
  whatsapp: {
    enabled: boolean;
    defaultMessage: string;
  };
  postPayment: {
    autoprint: boolean;
    showOptions: boolean;
  };
}

@Injectable({
  providedIn: 'root'
})
export class ConfigService {
  private configSubject = new BehaviorSubject<AppConfig>(this.getDefaultConfig());
  public config$ = this.configSubject.asObservable();

  constructor(private electronService: ElectronService) {
    this.loadConfig();
  }

  /**
   * Configuración por defecto del sistema
   */
  private getDefaultConfig(): AppConfig {
    return {
      printer: {
        legacy: {
          // printerName: 'DigitalPOS', // Tu impresora que funciona
          printerName: 'POS-80', // Tu impresora que funciona
          enabled: true
        },
        thermal: {
          printerName: '',
          paperWidth: 48,
          enabled: false
        },
        normal: {
          printerName: '',
          paperWidth: 80,
          enabled: false
        }
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
      },
      postPayment: {
        autoprint: true,  // Impresión automática habilitada
        showOptions: false // No mostrar opciones adicionales
      }
    };
  }

  /**
   * Carga la configuración desde localStorage o usa la por defecto
   */
  private loadConfig(): void {
    try {
      const savedConfig = localStorage.getItem('drtpos_config');
      if (savedConfig) {
        const config = JSON.parse(savedConfig);
        this.configSubject.next({ ...this.getDefaultConfig(), ...config });
      }
    } catch (error) {
      console.error('Error cargando configuración:', error);
      this.configSubject.next(this.getDefaultConfig());
    }
  }

  /**
   * Guarda la configuración en localStorage
   */
  saveConfig(config: AppConfig): void {
    try {
      localStorage.setItem('drtpos_config', JSON.stringify(config));
      this.configSubject.next(config);
      console.log('✅ Configuración guardada exitosamente');
    } catch (error) {
      console.error('❌ Error guardando configuración:', error);
      throw new Error('No se pudo guardar la configuración');
    }
  }

  /**
   * Obtiene la configuración actual
   */
  getCurrentConfig(): AppConfig {
    return this.configSubject.value;
  }

  /**
   * Actualiza una sección específica de la configuración
   */
  updateConfig(updates: Partial<AppConfig>): void {
    const currentConfig = this.getCurrentConfig();
    const newConfig = { ...currentConfig, ...updates };
    this.saveConfig(newConfig);
  }

  /**
   * Actualiza solo la configuración de impresoras
   */
  updatePrinterConfig(printerConfig: Partial<PrinterConfig>): void {
    const currentConfig = this.getCurrentConfig();
    const newConfig = {
      ...currentConfig,
      printer: { ...currentConfig.printer, ...printerConfig }
    };
    this.saveConfig(newConfig);
  }

  /**
   * Obtiene el nombre de la impresora legacy configurada
   */
  getLegacyPrinterName(): string {
    return this.getCurrentConfig().printer.legacy.printerName;
  }

  /**
   * Actualiza el nombre de la impresora legacy
   */
  setLegacyPrinterName(printerName: string): void {
    this.updatePrinterConfig({
      legacy: {
        ...this.getCurrentConfig().printer.legacy,
        printerName
      }
    });
  }

  /**
   * Verifica si la impresión automática está habilitada
   */
  isAutoprintEnabled(): boolean {
    return this.getCurrentConfig().postPayment.autoprint;
  }

  /**
   * Habilita o deshabilita la impresión automática
   */
  setAutoprint(enabled: boolean): void {
    this.updateConfig({
      postPayment: {
        ...this.getCurrentConfig().postPayment,
        autoprint: enabled
      }
    });
  }

  /**
   * Restaura la configuración por defecto
   */
  resetToDefault(): void {
    this.saveConfig(this.getDefaultConfig());
  }

  /**
   * Exporta la configuración actual
   */
  exportConfig(): string {
    return JSON.stringify(this.getCurrentConfig(), null, 2);
  }

  /**
   * Importa configuración desde JSON
   */
  importConfig(configJson: string): void {
    try {
      const config = JSON.parse(configJson);
      this.saveConfig(config);
    } catch (error) {
      throw new Error('Formato de configuración inválido');
    }
  }
}