import { Component } from '@angular/core';
import { ElectronService } from '../../services/electron.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-category',
  imports: [CommonModule, FormsModule, RouterLink],
  standalone: true,
  templateUrl: './category.component.html',
  styleUrls: ['./category.component.scss']
})
export class CategoryComponent {
  categories: any[] = [];
  newCategory = '';

  constructor(private electronService: ElectronService) {
    this.loadCategories();
  }

  async loadCategories() {
    this.categories = await this.electronService.getCategories();
  }

  async addCategory() {
    if (!this.newCategory.trim()) return;
    await this.electronService.addCategory(this.newCategory.trim());
    this.newCategory = '';
    this.loadCategories();
  }

  async deleteCategory(id: number) {
    await this.electronService.deleteCategory(id);
    this.loadCategories();
  }
}
