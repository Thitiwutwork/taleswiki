import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, map, shareReplay } from 'rxjs';
import { Item, ItemSearchResponse, FiltersResponse } from '../models/item.model';
import { CharacterInfo, RoomSkin } from '../models/character.model';
import { CHARACTERS_DATA } from '../data/characters.data';
import { ROOM_SKINS_DATA } from '../data/skins.data';
import { FILTERS_DATA } from '../data/filters.data';
import { INITIAL_ITEMS_DATA } from '../data/initial-items.data';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class ItemService {
  private http = inject(HttpClient);

  // Environment check: if running locally on port 4200/3000 with Node server, use backend API.
  private isLocalServer = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname.startsWith('192.168.')) &&
    (window.location.port === '3000' || window.location.port === '4200');

  private apiUrl = this.isLocalServer
    ? (window.location.port === '4200' ? 'http://localhost:3000/api' : '/api')
    : '';

  // Supabase Configuration
  private supabaseUrl = (environment.supabaseUrl || '').replace(/\/+$/, '');
  private supabaseAnonKey = environment.supabaseAnonKey || '';
  private useSupabase = Boolean(this.supabaseUrl && this.supabaseAnonKey);

  // In-memory items store initialized immediately with pre-bundled items (zero network delay)
  private inMemoryItems: Item[] = [...INITIAL_ITEMS_DATA];
  private isFullSampleLoaded = false;
  private cachedTotals = new Map<string, number>();

  constructor() {
    // If not using local API and not using Supabase, pre-load sample items
    if (!this.apiUrl && !this.useSupabase) {
      this.loadFullSampleInBackground();
    }
  }

  private loadFullSampleInBackground() {
    this.http.get<Item[]>('/data/items_sample.json').pipe(
      catchError(() => of(INITIAL_ITEMS_DATA))
    ).subscribe(items => {
      if (items && items.length > 0) {
        this.inMemoryItems = items;
        this.isFullSampleLoaded = true;
      }
    });
  }

  getBaseUrl(): string {
    return this.isLocalServer && window.location.port === '4200' ? 'http://localhost:3000' : '';
  }

  getCharacters(): Observable<CharacterInfo[]> {
    if (this.apiUrl) {
      return this.http.get<CharacterInfo[]>(`${this.apiUrl}/characters`).pipe(
        catchError(() => of(CHARACTERS_DATA)),
        shareReplay(1)
      );
    }
    return of(CHARACTERS_DATA);
  }

  getRoomSkins(): Observable<RoomSkin[]> {
    return of(ROOM_SKINS_DATA);
  }

  getFilters(): Observable<FiltersResponse> {
    if (this.apiUrl) {
      return this.http.get<FiltersResponse>(`${this.apiUrl}/filters`).pipe(
        catchError(() => of(FILTERS_DATA)),
        shareReplay(1)
      );
    }
    return of(FILTERS_DATA);
  }

  getItems(params: {
    q?: string;
    position?: string | number;
    character?: string | number;
    source?: string;
    has_stats?: boolean;
    page?: number;
    limit?: number;
  }): Observable<ItemSearchResponse> {
    // 1. If local Node.js backend is active, query it
    if (this.apiUrl) {
      let httpParams = new HttpParams();
      if (params.q) httpParams = httpParams.set('q', params.q);
      if (params.position !== undefined && params.position !== 'all') {
        httpParams = httpParams.set('position', params.position.toString());
      }
      if (params.character !== undefined && params.character !== 'all') {
        httpParams = httpParams.set('character', params.character.toString());
      }
      if (params.source && params.source !== 'all') {
        httpParams = httpParams.set('source', params.source);
      }
      if (params.has_stats) {
        httpParams = httpParams.set('has_stats', 'true');
      }
      if (params.page) {
        httpParams = httpParams.set('page', params.page.toString());
      }
      if (params.limit) {
        httpParams = httpParams.set('limit', params.limit.toString());
      }

      return this.http.get<ItemSearchResponse>(`${this.apiUrl}/items`, { params: httpParams }).pipe(
        catchError(() => of(this.filterInMemory(params)))
      );
    }

    // 2. If Supabase is configured, query Supabase REST API (Lightning Fast Server-side Pagination)
    if (this.useSupabase) {
      return this.querySupabase(params);
    }

    // 3. Fallback: High-speed synchronous in-memory filter
    return of(this.filterInMemory(params));
  }

  private querySupabase(params: {
    q?: string;
    position?: string | number;
    character?: string | number;
    source?: string;
    has_stats?: boolean;
    page?: number;
    limit?: number;
  }): Observable<ItemSearchResponse> {
    const limit = params.limit || 36;
    const page = params.page || 1;
    const offset = (page - 1) * limit;

    let httpParams = new HttpParams()
      .set('select', '*')
      .set('order', 'id.desc')
      .set('limit', limit.toString())
      .set('offset', offset.toString());

    if (params.q) {
      const q = params.q.trim();
      httpParams = httpParams.set('name', `ilike.*${q}*`);
    }

    if (params.position !== undefined && params.position !== 'all' && params.position !== '') {
      const pids = params.position.toString().split(',').map(p => p.trim()).filter(Boolean);
      if (pids.length > 0) {
        httpParams = httpParams.set('position_id', `in.(${pids.join(',')})`);
      }
    }

    if (params.character !== undefined && params.character !== 'all' && params.character !== '') {
      const charId = parseInt(params.character.toString(), 10);
      if (!isNaN(charId)) {
        httpParams = httpParams.set('or', `(character_id.eq.${charId},character_id.eq.0)`);
      }
    }

    if (params.has_stats) {
      httpParams = httpParams.set('stats', 'not.eq.[]');
    }

    if (params.source && params.source !== 'all') {
      if (params.source === 'shop_tr') {
        httpParams = httpParams.set('game_money', 'gt.0');
      } else if (params.source === 'shop_cash') {
        httpParams = httpParams.set('cash', 'gt.0');
      } else if (params.source === 'alchemist') {
        httpParams = httpParams.set('obtain_sources', 'cs.[{"type":"craft"}]');
      } else if (params.source === 'exchange') {
        httpParams = httpParams.set('obtain_sources', 'cs.[{"type":"exchange"}]');
      } else if (params.source === 'cube') {
        httpParams = httpParams.set('obtain_sources', 'cs.[{"type":"box"}]');
      } else if (params.source === 'event') {
        httpParams = httpParams.set('obtain_sources', 'cs.[{"type":"gacha"}]');
      }
    }

    const filterKey = `${params.q || ''}_${params.position || 'all'}_${params.character || 'all'}_${params.source || 'all'}_${params.has_stats || false}`;
    const isDefaultFilter = !params.q && (params.position === 'all' || !params.position) && (params.character === 'all' || !params.character) && (params.source === 'all' || !params.source) && !params.has_stats;
    const hasCachedTotal = this.cachedTotals.has(filterKey) || isDefaultFilter;
    const knownTotal = this.cachedTotals.get(filterKey) || (isDefaultFilter ? 107870 : 0);

    // Fast paging: only calculate full table count on page 1. When jumping pages, count=none avoids timeout.
    const preferHeader = (page === 1 || !hasCachedTotal) ? 'count=exact' : 'count=none';

    const headers = new HttpHeaders({
      'apikey': this.supabaseAnonKey,
      'Authorization': `Bearer ${this.supabaseAnonKey}`,
      'Prefer': preferHeader
    });

    return this.http.get<Item[]>(`${this.supabaseUrl}/rest/v1/items`, {
      params: httpParams,
      headers,
      observe: 'response'
    }).pipe(
      map(res => {
        const items = res.body || [];
        const contentRange = res.headers.get('content-range') || '';
        let total = knownTotal || items.length;
        if (contentRange && contentRange.includes('/')) {
          const totalStr = contentRange.split('/')[1];
          const parsedTotal = parseInt(totalStr, 10);
          if (!isNaN(parsedTotal)) {
            total = parsedTotal;
            this.cachedTotals.set(filterKey, total);
          }
        }

        return {
          total,
          page,
          limit,
          totalPages: Math.ceil(total / limit) || 1,
          items
        };
      }),
      catchError(err => {
        console.warn('[ItemService] Supabase query error:', err);
        const fallbackTotal = knownTotal || 107870;
        return of({
          total: fallbackTotal,
          page,
          limit,
          totalPages: Math.ceil(fallbackTotal / limit) || 1,
          items: []
        });
      })
    );
  }

  private filterInMemory(params: {
    q?: string;
    position?: string | number;
    character?: string | number;
    source?: string;
    has_stats?: boolean;
    page?: number;
    limit?: number;
  }): ItemSearchResponse {
    let filtered = this.inMemoryItems;

    if (params.q) {
      const q = params.q.toLowerCase().trim();
      filtered = filtered.filter(it => it.name && it.name.toLowerCase().includes(q));
    }

    if (params.position !== undefined && params.position !== 'all' && params.position !== '') {
      const posList = params.position.toString().split(',').map(p => parseInt(p.trim(), 10)).filter(n => !isNaN(n));
      if (posList.length > 0) {
        filtered = filtered.filter(it => posList.includes(it.position_id));
      }
    }

    if (params.character !== undefined && params.character !== 'all' && params.character !== '') {
      const cId = parseInt(params.character.toString(), 10);
      if (!isNaN(cId)) {
        filtered = filtered.filter(it => it.character_id === cId || it.character_id === 0);
      }
    }

    if (params.has_stats) {
      filtered = filtered.filter(it => it.stats && it.stats.length > 0);
    }

    const limit = params.limit || 36;
    const page = params.page || 1;
    const total = filtered.length;
    const paged = filtered.slice((page - 1) * limit, page * limit);

    return {
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit) || 1,
      items: paged
    };
  }

  getItemById(id: number): Observable<Item | null> {
    const item = this.inMemoryItems.find(it => it.id === id);
    if (item) return of(item);

    if (this.apiUrl) {
      return this.http.get<Item>(`${this.apiUrl}/items/${id}`).pipe(
        catchError(() => of(null))
      );
    }

    if (this.useSupabase) {
      const headers = new HttpHeaders({
        'apikey': this.supabaseAnonKey,
        'Authorization': `Bearer ${this.supabaseAnonKey}`
      });
      return this.http.get<Item[]>(`${this.supabaseUrl}/rest/v1/items?id=eq.${id}&select=*`, { headers }).pipe(
        map(items => (items && items.length > 0 ? items[0] : null)),
        catchError(() => of(null))
      );
    }

    return of(null);
  }

  getExchangeTargets(item: Item): Observable<Item[]> {
    if (!item) return of([]);

    if (this.apiUrl && !this.useSupabase) {
      return this.http.get<{ usages: Item[] }>(`${this.apiUrl}/items/${item.id}/usages`).pipe(
        map(res => res.usages || []),
        catchError(() => of([]))
      );
    }

    const cleanName = (item.name || '')
      .replace(/\s*\d+\s*(?:ชิ้น|ครั้ง|วัน|ปี|month|day)$/i, '')
      .replace(/\s*\([^)]*\)$/, '')
      .replace(/\s*\[[^\]]*\]$/, '')
      .trim();

    // 1. Card Ticket lookup (e.g. "ตั๋วแลกการ์ด 3 ดาว 5 ชิ้น" -> all 3-star story cards in position 201)
    const cardTicketMatch = cleanName.match(/ตั๋วแลกการ์ด\s*(\d+)\s*ดาว/);
    if (cardTicketMatch) {
      const star = cardTicketMatch[1];
      return this.getItems({ position: 201, limit: 100 }).pipe(
        map(res => (res.items || []).filter(it => it.obtain_methods && it.obtain_methods.some(m => m.includes(`ตั๋วแลกการ์ด ${star} ดาว`))))
      );
    }

    // 2. Story Card lookup (When viewing a card, show Alchemist craft items)
    if (item.position_id === 201) {
      return this.getItems({ q: 'ชุดเต่าทอง', limit: 8 }).pipe(
        map(res => (res.items || []).map(it => ({
          ...it,
          position_name: 'ห้องเล่นแร่แปรธาตุ (Alchemist)',
          description: `ใช้การ์ดนิทานเป็นวัตถุดิบหลักในการผสมสร้างไอเทมนี้ในห้องเล่นแร่แปรธาตุ (Alchemist)`
        })))
      );
    }

    // 3. Thai Special Event Token (e.g. "บัวคริสตัลสีส้ม 5 ชิ้น")
    if (cleanName.includes('บัวคริสตัล')) {
      return of([
        {
          id: 142369,
          name: 'โทเคนกิจกรรมเซิร์ฟไทย (Thai Event Token)',
          category_id: 0,
          character_id: 0,
          character_name: 'ทุกตัวละคร (All)',
          position_id: 0,
          position_name: 'ร้านค้ากิจกรรมบนเว็บ',
          item_kind: 0,
          level_req: 0,
          game_money: 0,
          cash: 0,
          description: 'ดอกบัวคริสตัลเป็นโทเคนกิจกรรมพิเศษเฉพาะเซิร์ฟเวอร์ไทย ใช้สะสมเพื่อแลกไอเทมและคอสตูมพิเศษในหน้าเว็บกิจกรรม PlayPark Tales Runner',
          stats: [],
          obtain_methods: ['ใช้แลกรับของรางวัลบนหน้าเว็บกิจกรรม / ร้านค้ากิจกรรมพิเศษ PlayPark'],
          icon_file: 'all_9999_3927.png',
          icon_url: null
        }
      ]);
    }

    // 4. Material to Theme / Target lookup
    let targetQuery = cleanName
      .replace(/^(?:ตั๋วแลก|ตั๋ว|คูปองแลก|คูปอง|ใบแลก|เหรียญ|ชิ้นส่วน|เศษ|ตรา|ลูกไฟ|ไม้ตัก|ขวด|กล่อง)\s*/, '')
      .trim();

    if (!targetQuery || targetQuery === cleanName) {
      targetQuery = cleanName;
    }

    return this.getItems({ q: targetQuery, limit: 16 }).pipe(
      map(res => (res.items || []).filter(it => it.id !== item.id && !it.name.startsWith(cleanName)))
    );
  }

  findDefaultItem(slotKey: string, characterId?: number): Item | null {
    const posMap: Record<string, number> = {
      head: 5,
      hair: 1,
      top: 2,
      bottom: 3,
      shoes: 4,
      face: 6,
      face_lower: 6,
      hand: 7,
      wrist: 12,
      tail: 14,
      back: 8,
      pet: 10
    };
    const targetPos = posMap[slotKey];
    if (!targetPos) return null;

    return this.inMemoryItems.find(it => {
      const matchesPos = it.position_id === targetPos;
      const matchesChar = characterId ? (it.character_id === characterId || it.character_id === 0) : true;
      return matchesPos && matchesChar;
    }) || null;
  }

  getIconUrl(iconFile: string | null | undefined): string {
    if (!iconFile) return '/icons/default_icon.png';
    if (iconFile.startsWith('http://') || iconFile.startsWith('https://')) return iconFile;
    const cleanFile = iconFile.startsWith('/') ? iconFile.slice(1) : iconFile;

    // If local server is running on localhost, use local /icons/
    if (this.isLocalServer) {
      return `/icons/${cleanFile}`;
    }

    // On Vercel / Production: Use fast jsDelivr CDN from GitHub repository
    return `https://cdn.jsdelivr.net/gh/thitiwutwork/taleswiki@main/public/icons/${cleanFile}`;
  }

  getImgUrl(imgPath: string | null | undefined): string {
    if (!imgPath) return '';
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) return imgPath;
    const cleanPath = imgPath.startsWith('/') ? imgPath.slice(1) : imgPath;
    if (this.isLocalServer) {
      return `/${cleanPath}`;
    }
    return `https://cdn.jsdelivr.net/gh/thitiwutwork/taleswiki@main/frontend/public/${cleanPath}`;
  }
}
