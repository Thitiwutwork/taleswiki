import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ItemService } from './services/item.service';
import { Item, FilterOption, ObtainSource } from './models/item.model';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { FittingRoomComponent } from './components/fitting-room/fitting-room.component';
import { FILTERS_DATA } from './data/filters.data';
import { INITIAL_ITEMS_DATA } from './data/initial-items.data';
import { ICON_FALLBACKS } from './data/icon-fallbacks.data';

export type ViewMode = 'equipment' | 'usable' | 'material' | 'fitting';

export const EQUIP_PIDS = '1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,101,102,103,104,105,106,107,108,109,110';
export const USABLE_PIDS = '111,112,113,115,116,117,118,119,120,121,124,125,171,185,186,187,188,189,190,200,241,242,246,247,250,251,252,253,254,255,256,270,300,301,370,380,381,395,396,397,398,410,500,501,600,602,603,605,609,610,620,1000,1040,1045,1080';
export const MATERIAL_PIDS = '0,201,202,813,820,825,826,831,832,9996,9997,9999,50000';

export interface CategoryPill {
  id: string | number;
  name: string;
  icon: string;
}

export const EQUIP_CATEGORIES: CategoryPill[] = [
  { id: 'all', name: 'ทั้งหมด (All Equipment)', icon: '✨' },
  { id: '8', name: 'หลัง / ปีก', icon: '🪽' },
  { id: '1', name: 'ทรงผม', icon: '💇' },
  { id: '2', name: 'เสื้อ', icon: '👕' },
  { id: '3', name: 'กางเกง', icon: '👖' },
  { id: '4', name: 'รองเท้า', icon: '👟' },
  { id: '5', name: 'หมวก / ศีรษะ', icon: '👑' },
  { id: '7', name: 'มือ / ถุงมือ', icon: '🧤' },
  { id: '9', name: 'คอ / สร้อย', icon: '📿' },
  { id: '6', name: 'ใบหน้า / แว่น', icon: '👓' },
  { id: '10', name: 'สัตว์เลี้ยง', icon: '🐾' },
  { id: '13', name: 'บูสเตอร์', icon: '🚀' },
  { id: '12,14,15,16', name: 'กำไล / เครื่องประดับ', icon: '💍' },
  { id: '11,17,18,19,20,101,102,103,104,105,106,107,108,109,110', name: 'อวตาร / ชุดเสริม', icon: '🥋' }
];

export const USABLE_CATEGORIES: CategoryPill[] = [
  { id: 'all', name: 'ทั้งหมด (All Usables)', icon: '✨' },
  { id: '250,251,252,253,254,255,256', name: 'กล่องสุ่ม & หีบสมบัติ', icon: '🎁' },
  { id: '111,112', name: 'แพ็กเกจชุดเซ็ต', icon: '📦' },
  { id: '380,381', name: 'ตู้หมุนไข่ / กาชา', icon: '🎰' },
  { id: '171,200,241,1045', name: 'ตั๋ว บัฟ & บัตรผ่าน', icon: '🎟️' },
  { id: '395,396,397,398', name: 'น้ำยา & ไอเทมฟาร์ม', icon: '🧪' },
  { id: '116,185,186,187,188,189,190', name: 'ตกปลา & เหยื่อ', icon: '🎣' },
  { id: '1000,1040,1080', name: 'ของตกแต่ง & ฟาร์ม', icon: '🏡' }
];

export const MATERIAL_CATEGORIES: CategoryPill[] = [
  { id: 'all', name: 'ทั้งหมด (All Materials)', icon: '✨' },
  { id: '0,813,820,825,826,831,832', name: 'วัตถุดิบ & เศษหินคราฟต์', icon: '💎' },
  { id: '201', name: 'การ์ดนิทาน (Story Cards)', icon: '🎴' },
  { id: '202', name: 'แพ็กการ์ด (Card Packs)', icon: '📦' },
  { id: '9999,9996,9997,50000', name: 'เข็มแลนด์มาร์ค / โทเคนกิจกรรม', icon: '📌' }
];

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

  // View Navigation: 'equipment' | 'usable' | 'material' | 'fitting'
  currentView = signal<ViewMode>('equipment');

  // Active Category Sub-filters based on current view
  activeCategories = computed(() => {
    switch (this.currentView()) {
      case 'usable': return USABLE_CATEGORIES;
      case 'material': return MATERIAL_CATEGORIES;
      default: return EQUIP_CATEGORIES;
    }
  });

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
  activeModalTab = signal<'sources' | 'usages'>('sources');
  itemUsages = signal<Item[]>([]);
  isLoadingUsages = signal<boolean>(false);

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

  switchView(mode: ViewMode) {
    if (this.currentView() === mode) return;
    this.currentView.set(mode);
    if (mode !== 'fitting') {
      this.selectedPosition.set('all');
      this.currentPage.set(1);
      this.fetchItems();
    }
  }

  fetchItems() {
    if (this.items().length === 0) {
      this.isLoading.set(true);
    }
    let posParam: string | number | undefined = this.selectedPosition();
    if (posParam === 'all') {
      if (this.currentView() === 'equipment') {
        posParam = EQUIP_PIDS;
      } else if (this.currentView() === 'usable') {
        posParam = USABLE_PIDS;
      } else if (this.currentView() === 'material') {
        posParam = MATERIAL_PIDS;
      }
    }

    this.itemService.getItems({
      q: this.searchQuery(),
      position: posParam,
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
        // Ensure currentPage never exceeds totalPages (e.g. after filter change)
        if (this.currentPage() > res.totalPages && res.totalPages > 0) {
          this.currentPage.set(res.totalPages);
          this.fetchItems();
          return;
        }
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
    const bogusClothingPattern = /(?:แว่น|รองเท้า|กางเกง|เสื้อ|กี่เพ้า|กระโปรง|เท้าสาว|ทรงปิ่น|หางม้า|บัลเลต์|หมวย)/;
    return (methods || [])
      .map(m => this.cleanTags(m))
      .filter(m => {
        if (!m) return false;
        if (m.match(/(?:1,?000,?000|999,?999|9,?999,?999|1000000)\s*(?:Cash|TR)/i)) return false;
        if (m.match(/ร้านค้าในเกม.*(?:1,?000,?000|999,?999|9,?999,?999|1000000)/i)) return false;
        if (m.match(/(?:สุ่มจาก|เปิดสุ่มจาก|กล่องสุ่มจาก)/) && bogusClothingPattern.test(m)) return false;
        return true;
      });
  }

  cleanObtainSources(sources: ObtainSource[] | undefined): ObtainSource[] {
    if (!sources || !Array.isArray(sources)) return [];
    const containerKeywordPattern = /(?:กล่อง|ถุง|หีบ|แพ็ก|แพ็กเกจ|เซ็ต|ตู้|ซอง|กระปุก|โถ|กระเช้า|ไข่|ตู้หมุนไข่|ตั๋ว|คูปอง)/;
    const bogusClothingPattern = /(?:แว่น|รองเท้า|กางเกง|เสื้อ|กี่เพ้า|กระโปรง|เท้าสาว|ทรงปิ่น|หางม้า|บัลเลต์|หมวย)/;

    return sources.filter(s => {
      const raw = ((s.raw || '') + ' ' + (s.target_name || ''));
      if (raw.match(/(?:1,?000,?000|999,?999|9,?999,?999|1000000)\s*(?:Cash|TR)/i)) return false;
      if (raw.match(/ร้านค้าในเกม.*(?:1,?000,?000|999,?999|9,?999,?999|1000000)/i)) return false;
      if (s.type === 'shop' && ((s.count && s.count >= 999999) || raw.match(/(?:1,?000,?000|999,?999|1000000)/))) return false;

      // Purge bogus boxes (starter gear mistakenly mapped as packages)
      if (s.type === 'box' || s.type === 'gacha') {
        if (s.target_id && s.target_id <= 100) return false;
        if (s.target_name) {
          if (bogusClothingPattern.test(s.target_name)) return false;
          if (!containerKeywordPattern.test(s.target_name)) return false;
        }
      }
      return true;
    });
  }

  openDetail(item: Item) {
    let cleanMethods = this.cleanObtainMethods(item.obtain_methods);
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

    // Fallback if cleaned sources is empty and no custom methods
    if (cleanSources.length === 0 && !item.name.match(/\s+\d+\s*(?:ชิ้น|ครั้ง|วัน|ปี)$/)) {
      cleanSources = [{
        type: 'other',
        label: 'กิจกรรม / พิเศษ',
        action: '',
        raw: 'กิจกรรมภายในเกม / รางวัลพิเศษ'
      }];
      if (cleanMethods.length === 0) {
        cleanMethods = ['กิจกรรมภายในเกม / รางวัลพิเศษ'];
      }
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
    this.activeModalTab.set('sources');
    this.itemUsages.set([]);

    // 2. Quantity bundle fallback (e.g. "ชิ้นส่วนหินแห่งความปรารถนา 20 ปี 10 ชิ้น" -> "ชิ้นส่วนหินแห่งความปรารถนา 20 ปี")
    const match = item.name.match(/^(.*?)\s+\d+\s*(?:ชิ้น|ครั้ง|วัน|ปี)$/);
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

  closeDetail() {
    this.selectedItem.set(null);
    this.itemUsages.set([]);
  }

  selectUsagesTab(item: Item) {
    this.activeModalTab.set('usages');
    if (this.itemUsages().length === 0) {
      this.loadUsages(item);
    }
  }

  openExchangeTab(item: Item, event?: MouseEvent) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.openDetail(item);
    this.activeModalTab.set('usages');
    this.loadUsages(item);
  }

  tryOnItem(item: Item, event?: MouseEvent) {
    if (event) {
      event.preventDefault();
      event.stopPropagation();
    }
    this.itemService.pendingTryOnItem.set(item);
    this.currentView.set('fitting');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  getUsableBadge(item: Item): { label: string; class: string } {
    const n = item.name;
    const p = item.position_id;
    if (p === 380 || p === 381 || n.includes('ตู้หมุน') || n.includes('กาชา')) return { label: '🎰 ตู้หมุนไข่ / กาชา', class: 'badge-gacha' };
    if (p === 111 || p === 112 || n.includes('แพ็ก')) return { label: '📦 แพ็กเกจเซ็ต', class: 'badge-package' };
    if (p === 250 || n.includes('กล่อง') || n.includes('หีบ') || n.includes('ถุง')) return { label: '🎁 กล่องสุ่ม / หีบ', class: 'badge-box' };
    if (p === 171 || p === 200 || p === 241 || p === 1045 || n.includes('ตั๋ว') || n.includes('บัตร')) return { label: '🎟️ บัตรผ่าน / ตั๋วแลก', class: 'badge-ticket' };
    if (p === 395 || p === 396 || p === 397 || p === 398 || n.includes('น้ำยา')) return { label: '🧪 น้ำยา / ฟาร์ม', class: 'badge-potion' };
    if (p === 116 || (p >= 185 && p <= 190) || n.includes('เบ็ด') || n.includes('เหยื่อ')) return { label: '🎣 ตกปลา & เหยื่อ', class: 'badge-fishing' };
    return { label: '📦 ไอเทมใช้งาน', class: 'badge-usable' };
  }

  getMaterialBadge(item: Item): { label: string; class: string } {
    const p = item.position_id;
    const n = item.name;
    if (p === 201) return { label: '🎴 การ์ดนิทาน', class: 'badge-card' };
    if (p === 202) return { label: '📦 แพ็กการ์ด', class: 'badge-cardpack' };
    if (p === 9999 || n.includes('เข็มแลนด์มาร์ค') || n.includes('โทเคน')) return { label: '📌 เข็มแลนด์มาร์ค / โทเคน', class: 'badge-landmark' };
    if (n.includes('เศษ') || n.includes('ชิ้นส่วน')) return { label: '💎 ชิ้นส่วน / เศษหิน', class: 'badge-fragment' };
    return { label: '🧪 วัตถุดิบผสมของ', class: 'badge-material' };
  }

  loadUsages(item: Item) {
    this.isLoadingUsages.set(true);
    this.itemUsages.set([]);

    // Special Landmark Needle: expands to all 25 landmark themes
    if (item.name.includes('เข็มแลนด์มาร์คพิเศษ')) {
      const needles: Item[] = LANDMARK_NEEDLES.map(n => ({
        id: n.id,
        name: n.name,
        category_id: 0,
        character_id: 0,
        character_name: 'ทุกตัวละคร (All)',
        position_id: 9999,
        position_name: 'เข็มแลนด์มาร์ค',
        item_kind: 0,
        level_req: 0,
        game_money: 0,
        cash: 0,
        description: `ใช้เข็มแลนด์มาร์คพิเศษ 1 ชิ้น แลกรับ ${n.name}`,
        stats: [],
        obtain_methods: ['แลกเปลี่ยนโดยใช้: เข็มแลนด์มาร์คพิเศษ'],
        icon_file: n.icon,
        icon_url: null
      }));
      this.itemUsages.set(needles);
      this.isLoadingUsages.set(false);
      return;
    }

    this.itemService.getExchangeTargets(item).subscribe({
      next: (targets) => {
        this.itemUsages.set(targets);
        this.isLoadingUsages.set(false);
      },
      error: () => {
        this.itemUsages.set([]);
        this.isLoadingUsages.set(false);
      }
    });
  }

  getIconUrl(item: Item): string {
    const icon = item.icon_file || ICON_FALLBACKS[item.id];
    if (icon) {
      return this.itemService.getIconUrl(icon);
    }
    const name = item.name || '';
    if (name.includes('แอนิมอล เวลล์')) {
      if (name.includes('เครื่องหมุนไข่') && !name.startsWith('ใช้')) {
        return this.itemService.getIconUrl('all_250_5444.png');
      }
      return this.itemService.getIconUrl('all_9999_3722.png');
    }
    return this.itemService.getIconUrl(null);
  }

  hasIcon(item: Item): boolean {
    return Boolean(item.icon_file || ICON_FALLBACKS[item.id] || item.name?.includes('แอนิมอล เวลล์'));
  }

  onImageError(event: Event) {
    const img = event.target as HTMLImageElement;
    if (!img || !img.src) return;

    // 1. If local /icons failed, try jsDelivr CDN
    if (img.src.includes('/icons/') && !img.src.includes('cdn.jsdelivr.net') && !img.src.includes('raw.githubusercontent.com')) {
      const fileName = img.src.split('/icons/').pop();
      if (fileName && fileName.endsWith('.png') && fileName !== 'default_icon.png') {
        img.src = `https://cdn.jsdelivr.net/gh/thitiwutwork/taleswiki@main/public/icons/${fileName}`;
        return;
      }
    }

    // 2. If jsDelivr failed, try Raw GitHub
    if (img.src.includes('cdn.jsdelivr.net')) {
      img.src = img.src.replace('https://cdn.jsdelivr.net/gh/thitiwutwork/taleswiki@main', 'https://raw.githubusercontent.com/thitiwutwork/taleswiki/main');
      return;
    }

    // 3. Fallback to cardboard box / emoji placeholder
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
      case 201: return '🎴';
      case 202: return '📦';
      case 250: return '🎁';
      case 9999: return '⭐';
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
