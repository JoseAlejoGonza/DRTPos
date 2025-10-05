import { Component, OnInit } from '@angular/core';
import { ElectronService } from '../../services/electron.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './shop.component.html',
  styleUrl: './shop.component.scss'
})
export class ShopComponent implements OnInit {
  products: any[] = [];

  constructor(private electronService: ElectronService) {}

  async ngOnInit() {
    await this.loadProducts();
  }

  async loadProducts() {
    this.electronService.getProducts().then((products: any) => {
      this.products = products;
      console.log(this.products);
    });
  }
  getImageSrc(imagen: string): string {
    if (!imagen) return '';
    // Si es URL http/https, retorna tal cual
    if (/^https?:\/\//i.test(imagen)) return imagen;
    // Si es ruta local, usa file://
    return 'file://' + imagen;
  }

  getTotal(): number {
    // Aquí puedes implementar la lógica para calcular el total de la compra
    return 450000;
  }
  addToCart(product: any) {
    // Aquí puedes implementar la lógica para agregar el producto al carrito
    console.log('Producto agregado al carrito:', product);
  }
}
