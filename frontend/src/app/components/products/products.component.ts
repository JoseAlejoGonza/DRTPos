import { Component, OnInit } from '@angular/core';
import { ElectronService } from '../../services/electron.service';
import { BarcodeService } from '../../services/barcode.service';
import { RouterLink, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AddProductsComponent } from '../add-products/add-products.component';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterOutlet, AddProductsComponent],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent implements OnInit {
  products: any[] = [];
  filteredProducts: any[] = [];
  categories: any[] = [];
  formVisible: boolean = false;
  selectedProduct: any = null;
  titleModal: string = '';
  searchTerm: string = '';

  constructor(
    private electronService: ElectronService,
    private barcodeService: BarcodeService
  ) {}

  async ngOnInit() {
    await this.loadCategories();
    await this.loadProducts();
    // Suscribirse al evento de abrir modal de agregar producto
    this.barcodeService.addProductModal$.subscribe(code => {
      console.log('🔔 ProductsComponent recibió código para modal:', code);
      if (code) {
        this.addProductWithCode(code);
      }
    });
  }

  onSearchChange() {
    const term = this.searchTerm.trim().toLowerCase();
    if (term.length < 3) {
      this.filteredProducts = [...this.products];
    } else {
      this.filteredProducts = this.products.filter(p =>
        p.name && p.name.toLowerCase().includes(term)
      );
    }
  }

  async loadCategories() {
    this.categories = await this.electronService.getCategories();
  }

  async loadProducts() {
    this.electronService.getProducts().then((products: any) => {
      this.products = products;
      this.onSearchChange();
      console.log(this.products);
    });
  }

  async deleteProduct(id: any) {
    this.electronService.deleteProduct(id).then(() => {
      this.loadProducts();
    });
  }

  editProduct(productId: number) {
    this.titleModal = 'Editar producto';
    const product = this.products.find(p => p.id === productId);
    this.selectedProduct = { ...product };
    this.formVisible = true;
  }

  addProduct(show: boolean) {
    this.selectedProduct = null;
    this.titleModal = 'Agregar producto';
    this.formVisible = show;
  }

  onProductSaved() {
    this.formVisible = false;
    this.selectedProduct = null;
    this.loadProducts(); // Refresca la tabla con los datos actualizados
  }

  /**
   * Abre el modal de agregar producto con un código específico pre-cargado
   */
  addProductWithCode(code: string) {
    console.log('🚀 Abriendo modal con código:', code);
    this.selectedProduct = {
      image: '',
      code: code,
      name: '',
      price: null,
      cost_price: null,
      stock: null,
      color: '',
      category_id: null
    };
    this.titleModal = 'Agregar producto';
    this.formVisible = true;
    console.log('🎯 Modal configurado - formVisible:', this.formVisible);
  }
}
