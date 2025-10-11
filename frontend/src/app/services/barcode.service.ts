import { Injectable, NgZone } from '@angular/core';
import { Router } from '@angular/router';
import { BehaviorSubject, debounceTime, filter } from 'rxjs';
import { ElectronService } from './electron.service';
import { CartService } from './cart.service';

@Injectable({
  providedIn: 'root'
})
export class BarcodeService {
  private barcodeBuffer: string = '';
  private barcodeTimeout: any;
  private readonly BARCODE_TIMEOUT = 100; // ms
  private readonly MIN_BARCODE_LENGTH = 3;
  private isListening = true;
  private currentContext: string = '';
  private isInShopSection = false;

  // Subject para notificar cuando se encuentra un producto
  private productFoundSubject = new BehaviorSubject<any>(null);
  public productFound$ = this.productFoundSubject.asObservable();

  // Subject para notificar cuando no se encuentra un producto
  private productNotFoundSubject = new BehaviorSubject<string | null>(null);
  public productNotFound$ = this.productNotFoundSubject.asObservable();

  constructor(
    private electronService: ElectronService,
    private cartService: CartService,
    private router: Router,
    private ngZone: NgZone
  ) {
    this.initializeBarcodeListener();
  }

  /**
   * Inicializa el listener global de códigos de barras
   */
  private initializeBarcodeListener(): void {
    // Listener para eventos de teclado globales
    document.addEventListener('keydown', (event) => this.handleKeyDown(event), true);
    
    // Listener para cuando se pierde el foco (limpiar buffer)
    document.addEventListener('blur', () => this.clearBuffer(), true);
    
    // Prevenir que ciertos eventos interfieran
    document.addEventListener('keypress', (event) => this.handleKeyPress(event), true);
  }

  /**
   * Maneja los eventos keydown para capturar códigos de barras
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.isListening) return;

    // Ignorar si estamos en un input/textarea y no es Enter
    const target = event.target as HTMLElement;
    if (this.isInputElement(target) && event.key !== 'Enter') {
      return;
    }

    // Si es Enter, procesar el código acumulado
    if (event.key === 'Enter') {
      event.preventDefault();
      this.processBarcode();
      return;
    }

    // Solo procesar caracteres alfanuméricos y algunos símbolos comunes en códigos
    if (this.isValidBarcodeCharacter(event.key)) {
      // Prevenir el comportamiento por defecto solo si no estamos en un input
      if (!this.isInputElement(target)) {
        event.preventDefault();
      }
      
      this.addToBuffer(event.key);
    }
  }

  /**
   * Maneja los eventos keypress para mejor captura
   */
  private handleKeyPress(event: KeyboardEvent): void {
    if (!this.isListening) return;
    
    const target = event.target as HTMLElement;
    
    // Si no estamos en un input y es un carácter válido, prevenir por defecto
    if (!this.isInputElement(target) && this.isValidBarcodeCharacter(event.key)) {
      event.preventDefault();
    }
  }

  /**
   * Verifica si el elemento es un input donde se puede escribir
   */
  private isInputElement(element: HTMLElement): boolean {
    const inputElements = ['INPUT', 'TEXTAREA', 'SELECT'];
    const isContentEditable = element.contentEditable === 'true';
    
    return inputElements.includes(element.tagName) || isContentEditable;
  }

  /**
   * Verifica si el carácter es válido para un código de barras
   */
  private isValidBarcodeCharacter(key: string): boolean {
    // Permitir números, letras, guiones, espacios y algunos símbolos comunes
    const validPattern = /^[a-zA-Z0-9\-_\.\s]$/;
    return validPattern.test(key);
  }

  /**
   * Agrega un carácter al buffer de código de barras
   */
  private addToBuffer(character: string): void {
    this.barcodeBuffer += character;
    
    // Reiniciar el timeout
    if (this.barcodeTimeout) {
      clearTimeout(this.barcodeTimeout);
    }
    
    // Si el buffer se acumula muy rápido (típico de pistolas), procesarlo automáticamente
    this.barcodeTimeout = setTimeout(() => {
      if (this.barcodeBuffer.length >= this.MIN_BARCODE_LENGTH) {
        this.processBarcode();
      } else {
        this.clearBuffer();
      }
    }, this.BARCODE_TIMEOUT);
  }

  /**
   * Procesa el código de barras acumulado
   */
  private async processBarcode(): Promise<void> {
    const code = this.barcodeBuffer.trim();
    this.clearBuffer();

    if (code.length < this.MIN_BARCODE_LENGTH) {
      return;
    }

    console.log('Procesando código de barras:', code);

    try {
      const product = await this.electronService.getProductByCode(code);
      
      if (product) {
        console.log('Producto encontrado:', product);
        this.handleProductFound(product);
      } else {
        console.log('Producto no encontrado para código:', code);
        this.handleProductNotFound(code);
      }
    } catch (error) {
      console.error('Error al buscar producto por código:', error);
      this.handleProductNotFound(code);
    }
  }

  /**
   * Maneja cuando se encuentra un producto
   */
  private handleProductFound(product: any): void {
    this.ngZone.run(async () => {
      try {
        if (this.isInShopSection) {
          // Estamos en la sección de ventas
          await this.handleProductFoundInShop(product);
        } else {
          // Estamos en otra sección
          await this.handleProductFoundOutsideShop(product);
        }
        
        // Notificar que se encontró el producto
        this.productFoundSubject.next(product);
        
        console.log(`Producto ${product.name} procesado correctamente`);
      } catch (error) {
        console.error('Error al procesar producto encontrado:', error);
      }
    });
  }

  /**
   * Maneja producto encontrado cuando estamos en la sección de ventas
   */
  private async handleProductFoundInShop(product: any): Promise<void> {
    // Necesito acceder al CartService de manera que pueda obtener las cotizaciones actuales
    // Voy a usar el método existente para verificar si hay cotizaciones activas
    const activeCart = this.cartService.getActiveCart();
    
    if (!activeCart) {
      // No hay cotizaciones, crear una nueva
      console.log('No hay cotizaciones activas, creando una nueva');
      this.cartService.createNewTab();
    }
    
    // Agregar el producto a la cotización activa
    const success = this.cartService.addToActiveCart(product);
    
    if (success) {
      console.log(`Producto ${product.name} agregado a la cotización activa`);
    } else {
      console.log('Error al agregar producto a la cotización activa');
    }
  }

  /**
   * Maneja producto encontrado cuando estamos fuera de la sección de ventas
   */
  private async handleProductFoundOutsideShop(product: any): Promise<void> {
    // Navegar a la sección de ventas
    await this.router.navigate(['/shop']);
    
    // Crear nueva cotización
    this.cartService.createNewTab();
    
    // Agregar el producto al carrito
    this.cartService.addToActiveCart(product);
    
    console.log(`Navegando a ventas y creando nueva cotización para ${product.name}`);
  }

  /**
   * Maneja cuando no se encuentra un producto
   */
  private handleProductNotFound(code: string): void {
    this.ngZone.run(() => {
      this.productNotFoundSubject.next(code);
    });
  }

  /**
   * Limpia el buffer de código de barras
   */
  private clearBuffer(): void {
    this.barcodeBuffer = '';
    if (this.barcodeTimeout) {
      clearTimeout(this.barcodeTimeout);
      this.barcodeTimeout = null;
    }
  }

  /**
   * Habilita o deshabilita la escucha de códigos de barras
   */
  public setListening(listening: boolean): void {
    this.isListening = listening;
    if (!listening) {
      this.clearBuffer();
    }
  }

  /**
   * Verifica si está escuchando códigos de barras
   */
  public getListening(): boolean {
    return this.isListening;
  }

  /**
   * Procesa manualmente un código de barras
   */
  public async processManualBarcode(code: string): Promise<void> {
    this.barcodeBuffer = code;
    await this.processBarcode();
  }

  /**
   * Limpia las notificaciones
   */
  public clearNotifications(): void {
    this.productFoundSubject.next(null);
    this.productNotFoundSubject.next(null);
  }

  /**
   * Notifica que estamos en la sección de ventas
   */
  public setShopContext(isInShop: boolean): void {
    this.isInShopSection = isInShop;
    this.currentContext = isInShop ? 'shop' : '';
    console.log(`Contexto actualizado: ${isInShop ? 'Sección de Ventas' : 'Otra Sección'}`);
  }

  /**
   * Obtiene el contexto actual
   */
  public getCurrentContext(): string {
    return this.currentContext;
  }

  /**
   * Verifica si estamos en la sección de ventas
   */
  public isInShop(): boolean {
    return this.isInShopSection;
  }
}