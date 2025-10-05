import { Component } from '@angular/core';
import { ElectronService } from '../../services/electron.service';
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
export class ProductsComponent {
  products: any[] = [];
  categories: any[] = [];
  formVisible: boolean = false;
  selectedProduct: any = null;
  titleModal: string = '';

  constructor(private electronService: ElectronService) {}

  async ngOnInit() {
    await this.loadCategories();
    await this.loadProducts();
  }

  async loadCategories() {
    this.categories = await this.electronService.getCategories();
  }

  async loadProducts() {
    this.electronService.getProducts().then((products: any) => {
      this.products = products;
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
}
