import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router, RouterOutlet } from '@angular/router';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterOutlet, CommonModule],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit{
  shopName: string = 'DRT';

  constructor(public router: Router) {}

  ngOnInit(): void {
    this.router.navigate(['/products']);
  }

  navigateTo(route: string) {
    this.router.navigate([`/${route}`]);
  }

  isActive(route: string): boolean {
    return this.router.url.startsWith(route);
  }
}
