import { Routes } from '@angular/router';
import { CategoryComponent } from './components/category-component/category.component';
import { ProductsComponent } from './components/products/products.component';
import { HomeComponent } from './components/home/home.component';


export const routes: Routes = [
	{ path: 'home', component: HomeComponent },
	{ path: 'products', component: ProductsComponent },
	{ path: 'categories', component: CategoryComponent },
];
