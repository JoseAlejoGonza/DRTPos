import { Injectable } from '@angular/core';

declare global {
  interface Window { api: any; }
}

@Injectable({ providedIn: 'root' })
export class ElectronService {
  isElectron = !!(window && (window as any).api);

  // Products
  async getProducts() { return (window as any).api.getProducts(); }
  async addProduct(p: any) { return (window as any).api.addProduct(p); }
  async getProductByCode(code: string) { return (window as any).api.getProductByCode(code); }
  async openImageDialog() { return (window as any).api.openImageDialog(); }
  async updateProduct(p: any) { return (window as any).api.updateProduct(p); }
  async deleteProduct(id: number) { return (window as any).api.deleteProduct(id); }

  // Categories
  async getCategories() { return (window as any).api.getCategories(); }
  async addCategory(name: string) { return (window as any).api.addCategory(name); }
  async deleteCategory(id: number) { return (window as any).api.deleteCategory(id); }

  // Clients
  async getClients() { return (window as any).api.getClients(); }
  async addClient(client: any) { return (window as any).api.addClient(client); }
  async updateClient(client: any) { return (window as any).api.updateClient(client); }
  async deleteClient(id: number) { return (window as any).api.deleteClient(id); }
  async searchClientByDocument(documentType: string, documentNumber: string) { return (window as any).api.searchClientByDocument(documentType, documentNumber); }

  // Invoices
  async getInvoices() { return (window as any).api.getInvoices(); }
  async addInvoice(invoice: any) { return (window as any).api.addInvoice(invoice); }
  async updateInvoiceStatus(id: number, status: string) { return (window as any).api.updateInvoiceStatus(id, status); }
  async deleteInvoice(id: number) { return (window as any).api.deleteInvoice(id); }

  // Sales
  async createSale(sale: any) { return (window as any).api.createSale(sale); }
  async addSale(sale: any) { return (window as any).api.addSale(sale); }
  async getSales() { return (window as any).api.getSales(); }
  async addDetailSale(detail: any) { return (window as any).api.addDetailSale(detail); }
  async getDetailSales() { return (window as any).api.getDetailSales(); }

  // Payment / Processing
  async processPayment(paymentData: any) { return (window as any).api.processPayment(paymentData); }

  // Printing
  async getAvailablePrinters() { return (window as any).api.getAvailablePrinters(); }
  async printThermal(data: any) { return (window as any).api.printThermal(data); }
  async printNormal(data: any) { return (window as any).api.printNormal(data); }
  async showPrintDialog(data: any) { return (window as any).api.showPrintDialog(data); }
  async setThermalPaperWidth(width: number) { return (window as any).api.setThermalPaperWidth(width); }
  async testBasicPrint(printerName: string) { return (window as any).api.testBasicPrint(printerName); }
  async printThermalLegacy(data: any) { return (window as any).api.printThermalLegacy(data); }

  // WhatsApp (compat)
  async sendWhatsAppInvoice(data: any) { return (window as any).api.sendWhatsAppInvoice(data); }
  async sendWhatsAppReceipt(data: any) { return (window as any).api.sendWhatsAppReceipt(data); }
  async getWhatsAppPreview(data: any) { return (window as any).api.getWhatsAppPreview(data); }
  async sendWhatsAppInvoiceWithAttachment(data: any) { return (window as any).api.sendWhatsAppInvoiceWithAttachment(data); }
  async autoSendWhatsAppInvoice(data: any) { return (window as any).api.autoSendWhatsAppInvoice(data); }
  async getWhatsAppAutoStatus() { return (window as any).api.getWhatsAppAutoStatus(); }
  async clearWhatsAppAutoQr() { return (window as any).api.clearWhatsAppAutoQr(); }

  // Electronic invoicing and file helpers
  async generateElectronicInvoice(data: any) { return (window as any).api.generateElectronicInvoice(data); }
  async saveFileCopy(filePath: string) { return (window as any).api.saveFileCopy(filePath); }
  async saveTextFile(defaultName: string, content: string, filters?: any) { return (window as any).api.saveTextFile(defaultName, content, filters); }

  // Reports
  async getReportSalesSummary(from: string, to: string) { return (window as any).api.getReportSalesSummary(from, to); }
  async getSalesByRange(from: string, to: string, granularity: string) { return (window as any).api.getSalesByRange(from, to, granularity); }
  async getSalesByProduct(from: string, to: string) { return (window as any).api.getSalesByProduct(from, to); }
  async getSalesByCategory(from: string, to: string) { return (window as any).api.getSalesByCategory(from, to); }
  async getTaxSummary(from: string, to: string) { return (window as any).api.getTaxSummary(from, to); }
  async getFrequency(from: string, to: string) { return (window as any).api.getFrequency(from, to); }
  async getDailyClosure(date: string) { return (window as any).api.getDailyClosure(date); }
  async exportReportPdf(html: string, defaultName: string) { return (window as any).api.exportReportPdf(html, defaultName); }

  // Configs
  async getConfig() { return (window as any).api.getConfig(); }
  async getCompanyConfig() { return (window as any).api.getCompanyConfig(); }
  async getInvoicingConfig() { return (window as any).api.getInvoicingConfig(); }
  async getWhatsAppConfig() { return (window as any).api.getWhatsAppConfig(); }
  async getPrintingConfig() { return (window as any).api.getPrintingConfig(); }
  async getPaymentConfig() { return (window as any).api.getPaymentConfig(); }
  async updateCompanyConfig(data: any) { return (window as any).api.updateCompanyConfig(data); }
  async updateInvoicingConfig(data: any) { return (window as any).api.updateInvoicingConfig(data); }
  async updateWhatsAppConfig(data: any) { return (window as any).api.updateWhatsAppConfig(data); }
  async togglePaymentMethod(methodId: string, enabled: boolean) { return (window as any).api.togglePaymentMethod(methodId, enabled); }
  async resetConfig() { return (window as any).api.resetConfig(); }
  async exportConfig() { return (window as any).api.exportConfig(); }
  async importConfig(configJson: string) { return (window as any).api.importConfig(configJson); }

  // Licencias
  async validateLicense() { return (window as any).api.validateLicense(); }
  async getHardwareInfo() { return (window as any).api.getHardwareInfo(); }
  async installLicense(encryptedLicense: string) { return (window as any).api.installLicense(encryptedLicense); }
  async checkLicenseStatus() { return (window as any).api.checkLicenseStatus(); }

  // Backup y Restauración
  async createBackup() { return (window as any).api.createBackup(); }
  async restoreBackup() { return (window as any).api.restoreBackup(); }
  async verifyBackup(filePath: string) { return (window as any).api.verifyBackup(filePath); }
  async getBackupStats() { return (window as any).api.getBackupStats(); }

  // Sistema - Fix para inputs bloqueados
  async fixInputs() { return (window as any).api.fixInputs(); }
  async forceReload() { return (window as any).api.forceReload(); }
  async resetAngular() { return (window as any).api.resetAngular(); }
}
