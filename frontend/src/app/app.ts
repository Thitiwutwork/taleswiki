import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ItemService } from './services/item.service';
import { Item, FilterOption } from './models/item.model';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { FittingRoomComponent } from './components/fitting-room/fitting-room.component';
import { FILTERS_DATA } from './data/filters.data';
import { INITIAL_ITEMS_DATA } from './data/initial-items.data';

@Component({
  selector: 'app-root',
  imports: [CommonModule, FormsModule, FittingRoomComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App implements OnInit {
  private itemService = inject(ItemService);

  // View Navigation: 'search' | 'fitting'
  currentView = signal<'search' | 'fitting'>('search');

  // State Signals initialized instantly with pre-bundled data (0ms delay)
  items = signal<Item[]>(INITIAL_ITEMS_DATA);
  totalItems = signal<number>(INITIAL_ITEMS_DATA.length);
  totalPages = signal<number>(1);
  currentPage = signal<number>(1);
  isLoading = signal<boolean>(false);

  // Filter States
  searchQuery = signal<string>('');
  selectedPosition = signal<string | number>('all');
  selectedCharacter = signal<string | number>('all');
  selectedSource = signal<string>('all');
  hasStatsOnly = signal<boolean>(false);

  // Modal State
  selectedItem = signal<Item | null>(null);

  // Filter lists initialized instantly (0ms delay)
  positions = signal<FilterOption[]>([
    { id: 'all', name: 'ทุกหมวดหมู่ (All)', count: undefined },
    ...FILTERS_DATA.positions
  ]);
  characters = signal<FilterOption[]>([
    { id: 'all', name: 'ทุกตัวละคร (All)', count: undefined },
    ...FILTERS_DATA.characters
  ]);
  sources = signal<FilterOption[]>(FILTERS_DATA.sources);

  // Search debounce
  private searchSubject = new Subject<string>();

  ngOnInit() {
    this.searchSubject.pipe(
      debounceTime(350),
      distinctUntilChanged()
    ).subscribe(query => {
      this.searchQuery.set(query);
      this.currentPage.set(1);
      this.fetchItems();
    });

    this.fetchFilters();
    this.fetchItems();
  }

  fetchFilters() {
    this.itemService.getFilters().subscribe({
      next: (res) => {
        this.positions.set([
          { id: 'all', name: 'ทุกหมวดหมู่ (All)', count: undefined },
          ...res.positions
        ]);
        this.characters.set([
          { id: 'all', name: 'ทุกตัวละคร (All)', count: undefined },
          ...res.characters
        ]);
        this.sources.set(res.sources);
      },
      error: (err) => console.error('Failed to load filters', err)
    });
  }

  fetchItems() {
    if (this.items().length === 0) {
      this.isLoading.set(true);
    }
    this.itemService.getItems({
      q: this.searchQuery(),
      position: this.selectedPosition(),
      character: this.selectedCharacter(),
      source: this.selectedSource(),
      has_stats: this.hasStatsOnly(),
      page: this.currentPage(),
      limit: 36
    }).subscribe({
      next: (res) => {
        const cleanedItems = (res.items || []).map(item => ({
          ...item,
          name: this.cleanTags(item.name),
          description: this.cleanTags(item.description),
          stats: (item.stats || []).map(s => this.cleanTags(s)).filter(Boolean),
          obtain_methods: (item.obtain_methods || []).map(m => this.cleanTags(m)).filter(Boolean),
        }));
        this.items.set(cleanedItems);
        this.totalItems.set(res.total);
        this.totalPages.set(res.totalPages);
        this.isLoading.set(false);
        // Scroll to top of results
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      error: (err) => {
        console.error('Failed to fetch items', err);
        this.isLoading.set(false);
      }
    });
  }

  // Helper to remove any game formatting tags like <color=...>, </color>, <smallbold>, etc.
  cleanTags(text: string | null | undefined): string {
    if (!text) return '';
    return text
      .replace(/<[^>]+>/g, '')
      .replace(/<+[^>]*>/g, '')
      .replace(/<[^>]*$/g, '')
      .trim();
  }

  onSearchInput(value: string) {
    this.searchSubject.next(value);
  }

  clearSearch() {
    this.searchQuery.set('');
    this.currentPage.set(1);
    this.fetchItems();
  }

  onSelectCategory(posId: string | number) {
    this.selectedPosition.set(posId);
    this.currentPage.set(1);
    this.fetchItems();
  }

  onSelectCharacter(charId: string | number) {
    this.selectedCharacter.set(charId);
    this.currentPage.set(1);
    this.fetchItems();
  }

  onSelectSource(sourceId: string) {
    this.selectedSource.set(sourceId);
    this.currentPage.set(1);
    this.fetchItems();
  }

  toggleHasStats() {
    this.hasStatsOnly.set(!this.hasStatsOnly());
    this.currentPage.set(1);
    this.fetchItems();
  }

  resetFilters() {
    this.searchQuery.set('');
    this.selectedPosition.set('all');
    this.selectedCharacter.set('all');
    this.selectedSource.set('all');
    this.hasStatsOnly.set(false);
    this.currentPage.set(1);
    this.fetchItems();
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages() && page !== this.currentPage()) {
      this.currentPage.set(page);
      this.fetchItems();
    }
  }

  openDetail(item: Item) {
    this.selectedItem.set({
      ...item,
      name: this.cleanTags(item.name),
      description: this.cleanTags(item.description),
      stats: (item.stats || []).map(s => this.cleanTags(s)).filter(Boolean),
      obtain_methods: (item.obtain_methods || []).map(m => this.cleanTags(m)).filter(Boolean),
    });
  }

  closeDetail() {
    this.selectedItem.set(null);
  }

  getIconUrl(item: Item): string {
    return this.itemService.getIconUrl(item.icon_file);
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (img.src && img.src.includes('cdn.jsdelivr.net')) {
      img.src = img.src.replace('https://cdn.jsdelivr.net/gh/thitiwutwork/taleswiki@main', 'https://raw.githubusercontent.com/thitiwutwork/taleswiki/main');
      return;
    }
    img.style.display = 'none';
    const fallback = img.nextElementSibling as HTMLElement;
    if (fallback) {
      fallback.style.display = 'flex';
    }
  }

  getCategoryIcon(posId: number): string {
    switch (posId) {
      case 1: return '💇';
      case 2: return '👕';
      case 3: return '👖';
      case 4: return '👟';
      case 5: return '👑';
      case 6: return '🧤';
      case 7: return '📿';
      case 8: return '🪽';
      case 9: return '🚀';
      case 10: return '👓';
      case 11: return '🐾';
      case 12: return '💍';
      case 13: return '🥋';
      case 14: return '👤';
      case 15: return '✨';
      default: return '📦';
    }
  }

  getSourceBadgeClass(method: string): string {
    if (method.includes('TR')) return 'badge-shop-tr';
    if (method.includes('Cash')) return 'badge-shop-cash';
    if (method.includes('แปรธาตุ')) return 'badge-alchemist';
    if (method.includes('แลกเปลี่ยน')) return 'badge-exchange';
    if (method.includes('คิวบ์') || method.includes('กล่อง')) return 'badge-cube';
    if (method.includes('เลเวล')) return 'badge-level';
    if (method.includes('กิจกรรม') || method.includes('แพ็กเกจ') || method.includes('Tales Pro')) return 'badge-event';
    return 'badge-other';
  }

  getPaginationRange(): number[] {
    const current = this.currentPage();
    const total = this.totalPages();
    const delta = 2;
    const range: number[] = [];

    for (let i = Math.max(2, current - delta); i <= Math.min(total - 1, current + delta); i++) {
      range.push(i);
    }

    return range;
  }

  getSourceIconUrl(iconFile: string | null | undefined): string {
    return this.itemService.getIconUrl(iconFile);
  }

  viewSourceItem(targetId: number | null | undefined) {
    if (!targetId) return;
    this.itemService.getItemById(targetId).subscribe(item => {
      if (item) {
        this.openDetail(item);
      } else {
        alert('ไม่พบข้อมูลรายละเอียดของไอเทมต้นทางนี้ในระบบ');
      }
    });
  }
}
