import { Routes } from '@angular/router';
import { CategoryComponent } from './components/category-component/category.component';
import { ProductsComponent } from './components/products/products.component';
import { HomeComponent } from './components/home/home.component';
import { ShopComponent } from './components/shop/shop.component';
import { SettingsComponent } from './components/settings/settings.component';
import { ReportsComponent } from './components/reports/reports.component';
import { LicenseManagerComponent } from './components/license-manager/license-manager.component';
import { LoginComponent } from './components/login/login.component';
import { UserManagementComponent } from './components/user-management/user-management.component';
import { authGuard, adminGuard } from './guards/auth.guard';


export const routes: Routes = [
	{ path: 'login', component: LoginComponent },
	{ path: 'home', component: HomeComponent, canActivate: [authGuard] },
	{ path: 'products', component: ProductsComponent, canActivate: [authGuard] },
	{ path: 'categories', component: CategoryComponent, canActivate: [authGuard] },
	{ path: 'shop', component: ShopComponent, canActivate: [authGuard] },
	{ path: 'reports', component: ReportsComponent, canActivate: [authGuard] },
	{ path: 'settings', component: SettingsComponent, canActivate: [authGuard] },
	{ path: 'users', component: UserManagementComponent, canActivate: [adminGuard] },
	{ path: 'license', component: LicenseManagerComponent, canActivate: [adminGuard] },
	{ path: '', redirectTo: '/login', pathMatch: 'full' }
];
