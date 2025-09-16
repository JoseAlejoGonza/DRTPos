import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';
import { ElectronService } from './services/electron.service';

declare global {
  interface Window { api: any; }
}
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})

export class AppComponent {
  title = 'frontend';
  product = { name: '', price: 0 };
  products: any[] = [];

  constructor(private electronService: ElectronService) {}

  async saveProduct() {
    if (!this.product.name || this.product.price <= 0) {
      alert('Nombre y precio son obligatorios');
      return;
    }

    this.electronService.addProduct({
      name: this.product.name,
      price: this.product.price
    }).then((res: any) => {
      console.log('Producto guardado', res);
    });
    this.product = { name: '', price: 0 };
    this.loadProducts();
  }

  async loadProducts() {
    this.electronService.getProducts().then((products: any) => {
      this.products = products;
    });
  }

  async deleteProduct(id:any){
    this.electronService.deleteProduct(id).then(()=>{
      console.log('se borró');
      this.loadProducts();
    })
  }

  ngOnInit() {
    this.loadProducts();
  }
}
