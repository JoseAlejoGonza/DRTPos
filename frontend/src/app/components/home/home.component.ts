import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { BarcodeService } from '../../services/barcode.service';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit, OnDestroy{
  shopName: string = 'DRT';

  constructor(public router: Router, private barcodeService: BarcodeService) {}

  ngOnInit(): void {
    this.barcodeService.setShopContext(false);
    this.router.navigate(['/products']);
  }

  ngOnDestroy(): void {
    this.barcodeService.setShopContext(false);
  }

  navigateTo(route: string) {
    this.router.navigate([`/${route}`]);
  }

  isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }
}
