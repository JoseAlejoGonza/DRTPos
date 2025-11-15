import { Routes } from '@angular/router';
import { CategoryComponent } from './components/category-component/category.component';
import { ProductsComponent } from './components/products/products.component';
import { HomeComponent } from './components/home/home.component';
import { ShopComponent } from './components/shop/shop.component';
import { SettingsComponent } from './components/settings/settings.component';
import { ReportsComponent } from './components/reports/reports.component';
import { LicenseManagerComponent } from './components/license-manager/license-manager.component';


export const routes: Routes = [
	{ path: 'home', component: HomeComponent },
	{ path: 'products', component: ProductsComponent },
	{ path: 'categories', component: CategoryComponent },
	{ path: 'shop', component: ShopComponent },
	{ path: 'reports', component: ReportsComponent },
	{ path: 'settings', component: SettingsComponent },
	{ path: 'license', component: LicenseManagerComponent },
	{ path: '', redirectTo: '/home', pathMatch: 'full' }
];
