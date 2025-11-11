import { Component, ElementRef, ViewChild, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ElectronService } from '../../services/electron.service';

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent {
  from: string = new Date().toISOString().slice(0, 10);
  to: string = new Date().toISOString().slice(0, 10);
  granularity: string = 'daily';
  loading = false;
  result: any = null;
  currentTab: string = 'summary';
  tableHeaders: string[] = [];
  tableKeys: string[] = [];

  @ViewChild('chartCanvas', { static: false }) chartCanvas!: ElementRef<HTMLCanvasElement>;

  constructor(private electron: ElectronService) {}

  async ngOnInit() {
    // Run the default tab on load
    await this.runCurrentReport();
  }

  private rangeChangeTimeout: any = null;

  onRangeChange() {
    // debounce rapid changes
    if (this.rangeChangeTimeout) clearTimeout(this.rangeChangeTimeout);
    this.rangeChangeTimeout = setTimeout(() => {
      this.runCurrentReport();
    }, 300);
  }

  setRangeQuick(type: 'daily'|'weekly'|'quincenal'|'monthly') {
    const now = new Date();
    let fromD = new Date();
    if (type === 'daily') {
      fromD = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    } else if (type === 'weekly') {
      const day = now.getDay();
      fromD = new Date(now);
      fromD.setDate(now.getDate() - day);
    } else if (type === 'quincenal') {
      const dayOfMonth = now.getDate();
      if (dayOfMonth > 15) fromD = new Date(now.getFullYear(), now.getMonth(), 16);
      else fromD = new Date(now.getFullYear(), now.getMonth(), 1);
    } else if (type === 'monthly') {
      fromD = new Date(now.getFullYear(), now.getMonth(), 1);
    }
    this.from = fromD.toISOString().slice(0,10);
    this.to = now.toISOString().slice(0,10);
    // auto-run after quick selection
    setTimeout(() => this.runCurrentReport(), 0);
  }

  async runSalesSummary() {
    this.loading = true;
    this.result = null;
    try {
      const res = await this.electron.getReportSalesSummary(this.from + 'T00:00:00', this.to + 'T23:59:59');
      this.result = res;
    } catch (e: any) {
      this.result = { success: false, error: e.message || e };
    } finally { this.loading = false; }
  }

  isSummaryResult() {
    return this.result && !this.result.rows && (this.result.totalGross !== undefined || this.result.totalNet !== undefined || this.result.taxes !== undefined || this.result.count !== undefined);
  }

  isTaxResult() {
    return this.result && !this.result.rows && (this.result.totalGross !== undefined && this.result.taxes !== undefined);
  }

  isFrequencyResult() {
    return this.result && !this.result.rows && (this.result.avgPerDay !== undefined || this.result.avgPerMonth !== undefined || this.result.avgPerYear !== undefined);
  }

  formatCurrency(v: any) {
    const n = Number(v || 0);
    try {
      return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);
    } catch (e) {
      return '$' + n.toFixed(0);
    }
  }

  formatNumber(v: any) {
    const n = Number(v || 0);
    try { return new Intl.NumberFormat('es-CO').format(n); } catch (e) { return String(n); }
  }

  async runSalesByRange() {
    this.loading = true; this.result = null;
    try {
      const res = await this.electron.getSalesByRange(this.from + 'T00:00:00', this.to + 'T23:59:59', this.granularity);
      this.result = res;
    } catch (e: any) { this.result = { success: false, error: e.message || e } }
    finally { this.loading = false; }
    this.prepareTableAndChart('range');
  }

  async runSalesByProduct() {
    this.loading = true; this.result = null;
    try {
      const res = await this.electron.getSalesByProduct(this.from + 'T00:00:00', this.to + 'T23:59:59');
      this.result = res;
    } catch (e: any) { this.result = { success: false, error: e.message || e } }
    finally { this.loading = false; }
    this.prepareTableAndChart('product');
  }

  async runSalesByCategory() {
    this.loading = true; this.result = null;
    try {
      const res = await this.electron.getSalesByCategory(this.from + 'T00:00:00', this.to + 'T23:59:59');
      this.result = res;
    } catch (e: any) { this.result = { success: false, error: e.message || e } }
    finally { this.loading = false; }
    this.prepareTableAndChart('category');
  }

  async runTaxSummary() {
    this.loading = true; this.result = null;
    try {
      const res = await this.electron.getTaxSummary(this.from + 'T00:00:00', this.to + 'T23:59:59');
      this.result = res;
  } catch (e: any) { this.result = { success: false, error: e.message || e } }
    finally { this.loading = false; }
  }

  async runFrequency() {
    this.loading = true; this.result = null;
    try {
      const res = await this.electron.getFrequency(this.from + 'T00:00:00', this.to + 'T23:59:59');
      this.result = res;
  } catch (e: any) { this.result = { success: false, error: e.message || e } }
    finally { this.loading = false; }
  }

  // CSV export helper: expects rows array of objects
  async exportCsv(defaultName: string, rows: any[]) {
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      alert('No hay datos para exportar');
      return;
    }
    const keys = Object.keys(rows[0]);
    const csv = [keys.join(',')].concat(rows.map(r => keys.map(k => {
      let v = r[k];
      if (v === null || v === undefined) return '""';
      v = String(v).replace(/"/g, '""');
      if (v.indexOf(',') >= 0 || v.indexOf('\n') >= 0) return '"' + v + '"';
      return v;
    }).join(','))).join('\n');

    await this.electron.saveTextFile(defaultName, csv, [{ name: 'CSV', extensions: ['csv'] }]);
  }

  async exportPdfFromRows(defaultName: string, rows: any[], title = 'Reporte') {
    if (!rows || !Array.isArray(rows) || rows.length === 0) {
      alert('No hay datos para exportar');
      return;
    }
    const keys = Object.keys(rows[0]);
    const header = keys.map(k => `<th>${k}</th>`).join('');
    const body = rows.map(r => '<tr>' + keys.map(k => `<td>${(r[k] !== null && r[k] !== undefined) ? String(r[k]) : ''}</td>`).join('') + '</tr>').join('');
    const html = `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><style>table{width:100%; border-collapse:collapse}th,td{border:1px solid #ccc;padding:6px;text-align:left}h1{font-size:18px}</style></head><body><h1>${title}</h1><p>Periodo: ${this.from} - ${this.to}</p><table><thead><tr>${header}</tr></thead><tbody>${body}</tbody></table></body></html>`;
    const res = await this.electron.exportReportPdf(html, defaultName || 'report.pdf');
    if (res && res.success) {
      alert('PDF guardado: ' + res.savedPath);
    } else {
      alert('No se guardó el PDF: ' + (res?.error || 'cancelado'));
    }
  }

  selectTab(tab: string) {
    if (this.currentTab === tab) return;
    this.currentTab = tab;
    // auto-execute when selecting a tab
    setTimeout(() => this.runCurrentReport(), 0);
  }

  async runCurrentReport() {
    if (this.currentTab === 'summary') return await this.runSalesSummary();
    if (this.currentTab === 'range') return await this.runSalesByRange();
    if (this.currentTab === 'product') return await this.runSalesByProduct();
    if (this.currentTab === 'category') return await this.runSalesByCategory();
    if (this.currentTab === 'tax') return await this.runTaxSummary();
    if (this.currentTab === 'frequency') return await this.runFrequency();
  }

  private prepareTableAndChart(kind: string) {
    if (!this.result) return;
    const rows = Array.isArray(this.result.rows) ? this.result.rows : [];
    if (!rows.length) {
      // Provide sensible empty table headers/keys for each kind so the UI shows an empty table or zeros
      if (kind === 'product') {
        this.tableKeys = ['productName', 'quantitySold', 'totalSales'];
        this.tableHeaders = ['Producto', 'Cantidad', 'Total'];
      } else if (kind === 'category') {
        this.tableKeys = ['categoryName', 'quantitySold', 'totalSales'];
        this.tableHeaders = ['Categoría', 'Cantidad', 'Total'];
      } else if (kind === 'range') {
        this.tableKeys = ['period', 'count_sales', 'total'];
        this.tableHeaders = ['Periodo', 'Transacciones', 'Total'];
      } else {
        this.tableKeys = [];
        this.tableHeaders = [];
      }
      // nothing to draw
      return;
    }
    const sample = rows[0];
    this.tableKeys = Object.keys(sample);
    this.tableHeaders = this.tableKeys.map(k => this.humanizeHeader(k));
    setTimeout(() => this.drawChart(kind), 50);
  }

  private humanizeHeader(key: string) {
    if (!key) return key;
    // common renames
    const map: any = {
      productName: 'Producto',
      productId: 'Producto',
      quantitySold: 'Cantidad',
      totalSales: 'Total',
      unitPrice: 'Precio Unit.',
      categoryName: 'Categoría',
      period: 'Periodo',
      count_sales: 'Transacciones',
      total: 'Total'
    };
    if (map[key]) return map[key];
    // fallback: split camelCase/underscores
    return key.replace(/([A-Z])/g, ' $1').replace(/_/g, ' ').replace(/^./, (s: string) => s.toUpperCase());
  }

  private drawChart(kind: string) {
    const canvas = this.chartCanvas?.nativeElement;
    if (!canvas || !this.result || !this.result.rows) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    const rows = this.result.rows;
    let labels: string[] = [];
    let values: number[] = [];
    if (kind === 'product') {
      labels = rows.map((r: any) => r.productName || r.name || r.productId);
      values = rows.map((r: any) => Number(r.quantitySold || r.total || r.totalSales || 0));
    } else if (kind === 'category') {
      labels = rows.map((r: any) => r.categoryName || r.categoryId);
      values = rows.map((r: any) => Number(r.totalSales || r.total || 0));
    } else if (kind === 'range') {
      labels = rows.map((r: any) => r.period);
      values = rows.map((r: any) => Number(r.total || 0));
    } else {
      labels = rows.map((r: any, i: number) => 'R' + (i+1));
      values = rows.map((r: any) => {
        const v = Object.values(r).find(vv => typeof vv === 'number');
        return Number(v || 0);
      });
    }
    const padding = 20;
    const w = canvas.width - padding * 2;
    const h = canvas.height - padding * 2;
    const max = Math.max(...values, 1);
    const barWidth = Math.max(6, w / values.length - 6);
    ctx.fillStyle = '#fff';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    ctx.fillStyle = '#0d6efd';
    values.forEach((v, i) => {
      const bw = barWidth;
      const x = padding + i * (bw + 6);
      const barH = (v / max) * h;
      const y = padding + (h - barH);
      ctx.fillRect(x, y, bw, barH);
    });
    ctx.fillStyle = '#333';
    ctx.font = '10px Arial';
    labels.forEach((lbl, i) => {
      const x = padding + i * (barWidth + 6);
      const y = padding + h + 12;
      const text = String(lbl).length > 12 ? String(lbl).slice(0,12) + '…' : String(lbl);
      ctx.fillText(text, x, y);
    });
  }
}
