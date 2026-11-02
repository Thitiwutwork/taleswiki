import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ItemService } from './services/item.service';
import { Item, FilterOption, ObtainSource } from './models/item.model';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { FittingRoomComponent } from './components/fitting-room/fitting-room.component';
import { FILTERS_DATA } from './data/filters.data';
import { INITIAL_ITEMS_DATA } from './data/initial-items.data';

const LANDMARK_NEEDLES = [
  { name: 'เข็มแลนด์มาร์คอานูบิส', id: 129759, icon: 'all_9999_3852.png' },
  { name: 'เข็มแลนด์มาร์คไซอิ๋ว', id: 129765, icon: 'all_9999_3853.png' },
  { name: 'เข็มแลนด์มาร์คสงครามฮีโร่', id: 129771, icon: 'all_9999_3854.png' },
  { name: 'เข็มแลนด์มาร์คชูการ์แลนด์', id: 129777, icon: 'all_9999_3855.png' },
  { name: 'เข็มแลนด์มาร์คแพนโดร่า', id: 129783, icon: 'all_9999_3856.png' },
  { name: 'เข็มแลนด์มาร์คสวนสยอง', id: 129789, icon: 'all_9999_3857.png' },
  { name: 'เข็มแลนด์มาร์คเจเนซิส', id: 129795, icon: 'all_9999_3858.png' },
  { name: 'เข็มแลนด์มาร์คอัศวินรูปงาม', id: 129801, icon: 'all_9999_3859.png' },
  { name: 'เข็มแลนด์มาร์คอะคาเดมี่', id: 129807, icon: 'all_9999_3860.png' },
  { name: 'เข็มแลนด์มาร์คฟรอนเทียร์', id: 129813, icon: 'all_9999_3861.png' },
  { name: 'เข็มแลนด์มาร์คหมู่บ้านก็อบลิน', id: 129819, icon: 'all_9999_3862.png' },
  { name: 'เข็มแลนด์มาร์คเฟสติวัล', id: 129825, icon: 'all_9999_3863.png' },
  { name: 'เข็มแลนด์มาร์คอันเดอร์เวิลด์', id: 129831, icon: 'all_9999_3864.png' },
  { name: 'เข็มแลนด์มาร์คเทลส์ ดรีม', id: 129837, icon: 'all_9999_3865.png' },
  { name: 'เข็มแลนด์มาร์คหมู่เกาะความรู้สึก', id: 129843, icon: 'all_9999_3866.png' },
  { name: 'เข็มแลนด์มาร์คอีคลิปส์', id: 129849, icon: 'all_9999_3867.png' },
  { name: 'เข็มแลนด์มาร์คฮอไรซอน', id: 129855, icon: 'all_9999_3868.png' },
  { name: 'เข็มแลนด์มาร์คบริษัทปรโลก', id: 129861, icon: 'all_9999_3869.png' },
  { name: 'เข็มแลนด์มาร์คฝ่ายดูแลมิติ', id: 129867, icon: 'all_9999_3870.png' },
  { name: 'เข็มแลนด์มาร์คโบนาวี', id: 129873, icon: 'all_9999_3871.png' },
  { name: 'เข็มแลนด์มาร์คยุทธภพดอกท้อ', id: 129879, icon: 'all_9999_3872.png' },
  { name: 'เข็มแลนด์มาร์คอาณาจักรทะเลทราย', id: 129885, icon: 'all_9999_3873.png' },
  { name: 'เข็มแลนด์มาร์คไนท์แมร์', id: 129891, icon: 'all_9999_3874.png' },
  { name: 'เข็มแลนด์มาร์คเคออส', id: 129897, icon: 'all_9999_3875.png' },
  { name: 'เข็มแลนด์มาร์ควิลเลจ', id: 129903, icon: 'all_9999_3876.png' }
];

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
          obtain_methods: this.cleanObtainMethods(item.obtain_methods),
          obtain_sources: this.cleanObtainSources(item.obtain_sources)
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

  cleanObtainMethods(methods: string[] | undefined): string[] {
    return (methods || [])
      .map(m => this.cleanTags(m))
      .filter(m => {
        if (!m) return false;
        if (m.match(/(?:1,000,000|999,999)\s*(?:Cash|TR)/i)) return false;
        if (m.match(/ร้านค้าในเกม.*(?:1,000,000|999,999)/i)) return false;
        return true;
      });
  }

  cleanObtainSources(sources: ObtainSource[] | undefined): ObtainSource[] {
    if (!sources || !Array.isArray(sources)) return [];
    return sources.filter(s => {
      const raw = ((s.raw || '') + ' ' + (s.target_name || ''));
      if (raw.match(/(?:1,000,000|999,999)\s*(?:Cash|TR)/i)) return false;
      if (raw.match(/ร้านค้าในเกม.*(?:1,000,000|999,999)/i)) return false;
      return true;
    });
  }

  openDetail(item: Item) {
    const cleanMethods = this.cleanObtainMethods(item.obtain_methods);
    let cleanSources = this.cleanObtainSources(item.obtain_sources);

    // 1. Expand Special Landmark Needle to all 25 recipes if missing
    if (item.name.includes('เข็มแลนด์มาร์คพิเศษ') && cleanSources.length <= 2) {
      cleanSources = LANDMARK_NEEDLES.map(n => ({
        type: 'exchange',
        label: 'แลกเปลี่ยน',
        action: 'ใช้',
        target_name: n.name,
        target_id: n.id,
        target_icon: n.icon,
        count: 3,
        raw: `${n.name} x3`
      }));
    }

    const itemCopy: Item = {
      ...item,
      name: this.cleanTags(item.name),
      description: this.cleanTags(item.description),
      stats: (item.stats || []).map(s => this.cleanTags(s)).filter(Boolean),
      obtain_methods: cleanMethods,
      obtain_sources: cleanSources
    };

    this.selectedItem.set(itemCopy);

    // 2. Quantity bundle fallback (e.g. "ชิ้นส่วนหินแห่งความปรารถนา 20 ปี 10 ชิ้น" -> "ชิ้นส่วนหินแห่งความปรารถนา 20 ปี")
    if (cleanSources.length === 0) {
      const match = item.name.match(/^(.*?)\s+\d+\s*ชิ้น$/);
      if (match) {
        const baseName = match[1].trim();
        this.itemService.getItems({ q: baseName, limit: 5 }).subscribe(res => {
          const baseItem = res.items.find(i => i.name === baseName);
          if (baseItem && this.selectedItem()?.id === item.id) {
            const baseCleanSources = this.cleanObtainSources(baseItem.obtain_sources);
            const baseCleanMethods = this.cleanObtainMethods(baseItem.obtain_methods);
            if (baseCleanSources.length > 0 || baseCleanMethods.length > 0) {
              this.selectedItem.update(curr => curr ? {
                ...curr,
                obtain_sources: baseCleanSources.length > 0 ? baseCleanSources : curr.obtain_sources,
                obtain_methods: baseCleanMethods.length > 0 ? baseCleanMethods : curr.obtain_methods
              } : null);
            }
          }
        });
      }
    }
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

  isRealShopPrice(item: Item): boolean {
    if (!item.game_money || item.game_money <= 0) return false;
    // 999,999+ and 1,000,000+ are sentinel dummy values used by devs for unpurchasable/event items
    if (item.game_money >= 999999) return false;
    return true;
  }

  isRealCashPrice(item: Item): boolean {
    if (!item.cash || item.cash <= 0) return false;
    // 999,999+ and 1,000,000+ are sentinel dummy values used by devs for unpurchasable/event items
    if (item.cash >= 999999) return false;
    return true;
  }

  shouldShowLevelReq(item: Item): boolean {
    if (!item.level_req || item.level_req <= 1) return false;
    // In Tales Runner, level_req represents Rank (ยศ) and only applies to wearable gear (slots 1 to 15)
    return item.position_id >= 1 && item.position_id <= 15;
  }

  formatLevelReq(lvl: number): string {
    return `ยศขั้น ${lvl}`;
  }
}
