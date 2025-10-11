import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, Input, OnInit, input } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ElectronService } from '../../services/electron.service';
import { BarcodeService } from '../../services/barcode.service';

@Component({
  selector: 'app-add-products',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './add-products.component.html',
  styleUrl: './add-products.component.scss'
})
export class AddProductsComponent implements OnInit {
  @Input() visible = false;
  @Input() productInput: any = null;
  @Input() title: string = '';
  @Output() closed = new EventEmitter<void>();
  @Output() productSaved = new EventEmitter<void>();

  product: any = {
    image: null,
    code: '',
    name: '',
    price: null,
    stock: null,
    color: '',
    category_id: null
  };
  archivoSeleccionado: string = '';
  isCapturingBarcode = false;

  categories: any[] = [];

  constructor(
    private electronService: ElectronService,
    private route: ActivatedRoute,
    private barcodeService: BarcodeService
  ) {}

  onImageInputChange(value: string) {
    this.product.image = value;
    this.onImageUrlInput();
  }

  // Determina si la imagen es una URL
  isUrl(value: string): boolean {
    return /^https?:\/\//i.test(value);
  }

  // Si el usuario edita el campo de URL, limpia archivoSeleccionado
  onImageUrlInput() {
    if (this.isUrl(this.product.image)) {
      this.archivoSeleccionado = '';
    }
  }

  async ngOnInit() {
    await this.loadCategories();
    
    // Verificar si hay un código de barras en los query parameters
    this.route.queryParams.subscribe(params => {
      if (params['code']) {
        this.product.code = params['code'];
      }
    });
  }

  ngOnChanges() {
    if (this.productInput) {
      this.product = { ...this.productInput };
      this.product.image = this.productInput.imagen || '';
      if (this.product.image && this.isUrl(this.product.image)) {
        // No modificar
      } else if (this.product.image && !this.product.image.startsWith('file://')) {
        this.product.image = 'file://' + this.product.image;
      }
    } else {
      this.product = {
        image: '',
        code: '',
        name: '',
        price: null,
        stock: null,
        color: '',
        category_id: null
      };
      this.archivoSeleccionado = '';
    }
  }

  getImagePreview(): string | null {
    if (!this.product.image) return null;
    if (this.isUrl(this.product.image)) return this.product.image;
    if (this.product.image.startsWith('file://')) return this.product.image;
    return 'file://' + this.product.image;
  }

  close() {
    this.closed.emit();
    this.visible = false;
  }
  async openFilePicker() {
    // El 'path' solo está disponible en Electron
    const filePath = await this.electronService.openImageDialog();  
    if (filePath) {
      // 2. Si se selecciona un archivo, guarda la ruta real
      this.product.image = filePath; 
    }
  }

  getFileName(filePath: string): string {
    // Función auxiliar para mostrar solo el nombre del archivo
    return filePath.split(/[\\/]/).pop() || '';
  }

  async saveProduct() {
    if (!this.product.name || this.product.price <= 0 || this.product.stock < 1 || !this.product.category_id || !this.product.color) {
      alert('Nombre, precio, cantidad, color y categoría son obligatorios');
      return;
    }
    if(this.archivoSeleccionado !== '') {
      this.product.image = this.archivoSeleccionado;
    }
    if (this.product.id) {
      // Sincronizar imagen editada de vuelta a productInput.imagen si aplica
      // console.log(this.product, 'esto es antes del if');
      // if (this.productInput) {
      //   this.product.image = this.productInput.imagen;
      // }
      console.log(this.product, 'esto es despues del if');

      await this.electronService.updateProduct(this.product); // Editar producto existente
    } else {
      await this.electronService.addProduct(this.product); // Crear producto nuevo
    }
    this.productSaved.emit();
    this.close();
  }

  async loadCategories() {
    this.categories = await this.electronService.getCategories();
  }

  /**
   * Inicia la captura de código de barras
   */
  startBarcodeCapture() {
    this.isCapturingBarcode = true;
    this.product.code = '';
    
    // Mostrar instrucción al usuario
    setTimeout(() => {
      const instruction = document.getElementById('barcode-instruction');
      if (instruction) {
        instruction.focus();
      }
    }, 100);
  }

  /**
   * Maneja los eventos de teclado para capturar códigos de barras
   */
  onBarcodeKeyDown(event: KeyboardEvent) {
    if (!this.isCapturingBarcode) return;

    if (event.key === 'Enter') {
      event.preventDefault();
      this.finishBarcodeCapture();
    } else if (event.key === 'Escape') {
      event.preventDefault();
      this.cancelBarcodeCapture();
    }
  }

  /**
   * Termina la captura del código de barras
   */
  finishBarcodeCapture() {
    this.isCapturingBarcode = false;
    if (this.product.code.trim()) {
      console.log('Código capturado:', this.product.code);
    }
  }

  /**
   * Cancela la captura del código de barras
   */
  cancelBarcodeCapture() {
    this.isCapturingBarcode = false;
    this.product.code = '';
  }

  /**
   * Valida el código de barras ingresado
   */
  async validateBarcodeCode() {
    if (!this.product.code.trim()) return;

    try {
      // Verificar si el código ya existe (solo si no estamos editando el mismo producto)
      const existingProduct = await this.electronService.getProductByCode(this.product.code.trim());
      
      if (existingProduct && existingProduct.id !== this.product.id) {
        alert(`Este código ya está asignado al producto: ${existingProduct.name}`);
        this.product.code = '';
      }
    } catch (error) {
      console.error('Error al validar código:', error);
    }
  }
}
