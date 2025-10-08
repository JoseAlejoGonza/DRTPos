import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface CartItem {
  id: number;
  name: string;
  price: number;
  category_name: string;
  stock: number;
  quantity: number;
}

export interface CartTab {
  id: string;
  name: string;
  items: CartItem[];
  createdAt: Date;
}

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly STORAGE_KEY = 'drt_pos_carts';
  private readonly ACTIVE_TAB_KEY = 'drt_pos_active_tab';
  
  private cartsSubject = new BehaviorSubject<CartTab[]>([]);
  private activeTabIdSubject = new BehaviorSubject<string>('');

  public carts$ = this.cartsSubject.asObservable();
  public activeTabId$ = this.activeTabIdSubject.asObservable();

  constructor() {
    this.loadFromStorage();
    // Crear primera pestaña si no existe ninguna
    if (this.cartsSubject.value.length === 0) {
      this.createNewTab();
    }
  }

  /**
   * Carga los carritos desde localStorage
   */
  private loadFromStorage(): void {
    try {
      const storedCarts = localStorage.getItem(this.STORAGE_KEY);
      const storedActiveTab = localStorage.getItem(this.ACTIVE_TAB_KEY);
      
      if (storedCarts) {
        const carts = JSON.parse(storedCarts);
        // Convertir fechas de string a Date
        carts.forEach((cart: CartTab) => {
          cart.createdAt = new Date(cart.createdAt);
        });
        this.cartsSubject.next(carts);
      }
      
      if (storedActiveTab) {
        this.activeTabIdSubject.next(storedActiveTab);
      }
    } catch (error) {
      console.error('Error loading carts from storage:', error);
    }
  }

  /**
   * Guarda los carritos en localStorage
   */
  private saveToStorage(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.cartsSubject.value));
      localStorage.setItem(this.ACTIVE_TAB_KEY, this.activeTabIdSubject.value);
    } catch (error) {
      console.error('Error saving carts to storage:', error);
    }
  }

  /**
   * Crea una nueva pestaña de carrito
   */
  createNewTab(name?: string): string {
    const newTabId = this.generateTabId();
    const tabName = name || `Cotización ${this.cartsSubject.value.length + 1}`;
    
    const newTab: CartTab = {
      id: newTabId,
      name: tabName,
      items: [],
      createdAt: new Date()
    };

    const currentCarts = this.cartsSubject.value;
    currentCarts.push(newTab);
    this.cartsSubject.next(currentCarts);
    this.activeTabIdSubject.next(newTabId);
    this.saveToStorage();
    
    return newTabId;
  }

  /**
   * Elimina una pestaña específica
   */
  deleteTab(tabId: string): void {
    const currentCarts = this.cartsSubject.value.filter(cart => cart.id !== tabId);
    
    // Si eliminamos la pestaña activa, activar otra
    if (this.activeTabIdSubject.value === tabId) {
      const nextActiveTab = currentCarts.length > 0 ? currentCarts[0].id : '';
      this.activeTabIdSubject.next(nextActiveTab);
    }
    
    // Si no quedan pestañas, crear una nueva
    if (currentCarts.length === 0) {
      const newTabId = this.createNewTab();
      return;
    }
    
    this.cartsSubject.next(currentCarts);
    this.saveToStorage();
  }

  /**
   * Cambia la pestaña activa
   */
  setActiveTab(tabId: string): void {
    const exists = this.cartsSubject.value.some(cart => cart.id === tabId);
    if (exists) {
      this.activeTabIdSubject.next(tabId);
      this.saveToStorage();
    }
  }

  /**
   * Obtiene el carrito activo
   */
  getActiveCart(): CartTab | null {
    const activeTabId = this.activeTabIdSubject.value;
    return this.cartsSubject.value.find(cart => cart.id === activeTabId) || null;
  }

  /**
   * Agrega un producto al carrito activo
   */
  addToActiveCart(product: any): boolean {
    const activeCart = this.getActiveCart();
    if (!activeCart) return false;

    const existingItem = activeCart.items.find(item => item.id === product.id);
    
    if (existingItem) {
      if (existingItem.quantity < product.stock) {
        existingItem.quantity++;
        this.updateCarts();
        return true;
      }
      return false; // No hay stock suficiente
    } else {
      if (product.stock > 0) {
        activeCart.items.push({
          id: product.id,
          name: product.name,
          price: product.price,
          category_name: product.category_name,
          stock: product.stock,
          quantity: 1
        });
        this.updateCarts();
        return true;
      }
      return false; // Sin stock
    }
  }

  /**
   * Actualiza la cantidad de un item en el carrito activo
   */
  updateCartItemQuantity(itemId: number, quantity: number): boolean {
    const activeCart = this.getActiveCart();
    if (!activeCart) return false;

    const item = activeCart.items.find(i => i.id === itemId);
    if (item) {
      if (quantity >= 1 && quantity <= item.stock) {
        item.quantity = quantity;
        this.updateCarts();
        return true;
      }
    }
    return false;
  }

  /**
   * Elimina un item del carrito activo
   */
  removeFromActiveCart(itemId: number): void {
    const activeCart = this.getActiveCart();
    if (!activeCart) return;

    activeCart.items = activeCart.items.filter(item => item.id !== itemId);
    this.updateCarts();
  }

  /**
   * Calcula el total del carrito activo
   */
  getActiveCartTotal(): number {
    const activeCart = this.getActiveCart();
    if (!activeCart) return 0;

    return activeCart.items.reduce((total, item) => {
      return total + (item.price * item.quantity);
    }, 0);
  }

  /**
   * Limpia el carrito activo (para después de comprar)
   */
  clearActiveCart(): void {
    const activeCart = this.getActiveCart();
    if (activeCart) {
      activeCart.items = [];
      this.updateCarts();
    }
  }

  /**
   * Actualiza el estado y guarda en storage
   */
  private updateCarts(): void {
    this.cartsSubject.next([...this.cartsSubject.value]);
    this.saveToStorage();
  }

  /**
   * Genera un ID único para las pestañas
   */
  private generateTabId(): string {
    return 'tab_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  /**
   * Renombra una pestaña
   */
  renameTab(tabId: string, newName: string): void {
    const cart = this.cartsSubject.value.find(c => c.id === tabId);
    if (cart) {
      cart.name = newName;
      this.updateCarts();
    }
  }
}