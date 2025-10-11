import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ProductsComponent } from './components/products/products.component';
import { HomeComponent } from "./components/home/home.component";
import { ProductNotFoundModalComponent } from './components/product-not-found-modal/product-not-found-modal.component';
import { BarcodeService } from './services/barcode.service';

declare global {
  interface Window { api: any; }
}
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, HomeComponent, ProductNotFoundModalComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})

export class AppComponent implements OnInit {
  title = 'DRT Solutions POS';

  constructor(
    private barcodeService: BarcodeService
  ) {}

  ngOnInit(): void {
    // Inicializar el servicio de códigos de barras
    // El servicio ya se inicializa automáticamente en su constructor
    console.log('Servicio de códigos de barras inicializado');
  }
}
