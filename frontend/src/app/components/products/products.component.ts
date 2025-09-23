import { Component } from '@angular/core';
import { ElectronService } from '../../services/electron.service';
import { RouterLink, RouterOutlet } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-products',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, RouterOutlet],
  templateUrl: './products.component.html',
  styleUrl: './products.component.scss'
})
export class ProductsComponent {
product = { name: '', price: 0, quantity: 1, color: '', category_id: null };
  products: any[] = [];
  categories: any[] = [];

  constructor(private electronService: ElectronService) {}

  async ngOnInit() {
    await this.loadCategories();
    await this.loadProducts();
  }

  async loadCategories() {
    this.categories = await this.electronService.getCategories();
  }

  async saveProduct() {
    if (!this.product.name || this.product.price <= 0 || this.product.quantity < 1 || !this.product.category_id || !this.product.color) {
      alert('Nombre, precio, cantidad, color y categoría son obligatorios');
      return;
    }
    this.electronService.addProduct({
      name: this.product.name,
      price: this.product.price,
      quantity: this.product.quantity,
      color: this.product.color,
      category_id: this.product.category_id
    }).then((res: any) => {
      console.log('Producto guardado', res);
    });
    this.product = { name: '', price: 0, quantity: 1, color: '', category_id: null };
    this.loadProducts();
  }

  async loadProducts() {
    this.electronService.getProducts().then((products: any) => {
      this.products = products;
    });
  }

  async deleteProduct(id: any) {
    this.electronService.deleteProduct(id).then(() => {
      this.loadProducts();
    });
  }
}
