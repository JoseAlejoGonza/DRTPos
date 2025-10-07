import { Component, OnInit } from '@angular/core';
import { ElectronService } from '../../services/electron.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-shop',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './shop.component.html',
  styleUrl: './shop.component.scss'
})
export class ShopComponent implements OnInit {
  products: any[] = [];
  cart: any[] = [];

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

  /**
   * Calcula el total de la compra sumando todos los subtotales del carrito
   */
  getTotal(): number {
    return this.cart.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }

  /**
   * Agrega un producto al carrito o incrementa su cantidad si ya existe
   */
  addToCart(product: any) {
    // Verificar si el producto ya existe en el carrito
    const existingItem = this.cart.find(item => item.id === product.id);
    
    if (existingItem) {
      // Si ya existe, verificar si hay stock suficiente
      if (existingItem.quantity < product.stock) {
        existingItem.quantity++;
      } else {
        alert('No hay suficiente stock disponible');
      }
    } else {
      // Si no existe, agregarlo al carrito con cantidad 1
      if (product.stock > 0) {
        this.cart.push({
          id: product.id,
          name: product.name,
          price: product.price,
          category_name: product.category_name,
          stock: product.stock,
          quantity: 1
        });
      } else {
        alert('Producto sin stock disponible');
      }
    }
    
    console.log('Carrito actualizado:', this.cart);
  }

  /**
   * Actualiza la cantidad de un producto en el carrito
   */
  updateCartQuantity(item: any) {
    // Validar que la cantidad esté dentro del rango permitido
    if (item.quantity < 1) {
      item.quantity = 1;
    } else if (item.quantity > item.stock) {
      item.quantity = item.stock;
      alert('No hay suficiente stock para la cantidad solicitada');
    }
    
    console.log('Cantidad actualizada:', item);
  }

  /**
   * Elimina un producto del carrito
   */
  removeFromCart(item: any) {
    const index = this.cart.findIndex(cartItem => cartItem.id === item.id);
    if (index > -1) {
      this.cart.splice(index, 1);
      console.log('Producto eliminado del carrito:', item);
    }
  }

  /**
   * Limpia completamente el carrito
   */
  clearCart() {
    this.cart = [];
    console.log('Carrito limpiado');
  }

  /**
   * Obtiene la cantidad total de productos en el carrito
   */
  getTotalItems(): number {
    return this.cart.reduce((total, item) => total + item.quantity, 0);
  }

  /**
   * Devuelve la clase CSS basada en el stock disponible
   * Verde si hay más de 3 unidades, rojo si hay 3 o menos
   */
  getStockClass(stock: number): string {
    return stock > 3 ? 'stock-high' : 'stock-low';
  }
}
