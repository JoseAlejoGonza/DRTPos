import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';
import { ProductsComponent } from './components/products/products.component';
import { HomeComponent } from "./components/home/home.component";

declare global {
  interface Window { api: any; }
}
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})

export class AppComponent implements OnInit {
  title = 'DRT Solutions POS';

  constructor(private router: Router) {}

  ngOnInit(): void {
    this.router.navigate(['/home']);
  }
}
