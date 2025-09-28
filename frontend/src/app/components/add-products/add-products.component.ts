import { CommonModule } from '@angular/common';
import { Component, Output, EventEmitter, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ElectronService } from '../../services/electron.service';

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
  @Output() closed = new EventEmitter<void>();
  @Output() productSaved = new EventEmitter<void>();

  product: any = {
    name: '',
    price: null,
    stock: null,
    color: '',
    category_id: null
  };

  categories: any[] = [];

  constructor(private electronService: ElectronService) {}

  async ngOnInit() {
    await this.loadCategories();
  }

  ngOnChanges() {
    if (this.productInput) {
      this.product = { ...this.productInput };
    } else {
      this.product = {
        name: '',
        price: null,
        stock: null,
        color: '',
        category_id: null
      };
    }
  }

  close() {
    this.closed.emit();
    this.visible = false;
  }

  async saveProduct() {
    if (!this.product.name || this.product.price <= 0 || this.product.stock < 1 || !this.product.category_id || !this.product.color) {
      alert('Nombre, precio, cantidad, color y categoría son obligatorios');
      return;
    }
    if (this.product.id) {
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
}
