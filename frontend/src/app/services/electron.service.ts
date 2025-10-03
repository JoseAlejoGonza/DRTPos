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
  async openImageDialog() { return (window as any).api.openImageDialog(); }
  async updateProduct(p: any) { return (window as any).api.updateProduct(p); }
  async deleteProduct(id: number) { return (window as any).api.deleteProduct(id); }
  
  async createSale(sale: any) { return (window as any).api.createSale(sale); }
  async printTicket(sale: any) { return (window as any).api.printTicket(sale); }

  async getCategories() { return (window as any).api.getCategories(); }
  async addCategory(name: string) { return (window as any).api.addCategory(name); }
  async deleteCategory(id: number) { return (window as any).api.deleteCategory(id); }
  // Clients CRUD
  async getClients() { return (window as any).api.getClients(); }
  async addClient(client: any) { return (window as any).api.addClient(client); }
  async updateClient(client: any) { return (window as any).api.updateClient(client); }
  async deleteClient(id: number) { return (window as any).api.deleteClient(id); }

  // Invoices CRUD (status update only)
  async getInvoices() { return (window as any).api.getInvoices(); }
  async addInvoice(invoice: any) { return (window as any).api.addInvoice(invoice); }
  async updateInvoiceStatus(id: number, status: string) { return (window as any).api.updateInvoiceStatus(id, status); }
  async deleteInvoice(id: number) { return (window as any).api.deleteInvoice(id); }

  // Sales
  async addSale(sale: any) { return (window as any).api.addSale(sale); }
  async getSales() { return (window as any).api.getSales(); }

  // Detail Sales
  async addDetailSale(detail: any) { return (window as any).api.addDetailSale(detail); }
  async getDetailSales() { return (window as any).api.getDetailSales(); }
}