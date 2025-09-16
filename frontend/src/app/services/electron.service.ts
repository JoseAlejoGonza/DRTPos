import { Injectable } from '@angular/core';

declare global {
  interface Window { api: any; }
}

@Injectable({ providedIn: 'root' })
export class ElectronService {
    isElectron = !!(window && (window as any).api);
    
    async getProducts() { 
        console.log(window.api);
        return (window as any).api.getProducts(); 
    }
    async addProduct(p: any) { return (window as any).api.addProduct(p); }
    async updateProduct(p: any) { return (window as any).api.updateProduct(p); }
    async deleteProduct(id: number) { return (window as any).api.deleteProduct(id); }
    
    async createSale(sale: any) { return (window as any).api.createSale(sale); }
    async printTicket(sale: any) { return (window as any).api.printTicket(sale); }
}