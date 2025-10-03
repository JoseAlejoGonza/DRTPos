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
}
