import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, map, shareReplay } from 'rxjs';
import { Item, ItemSearchResponse, FiltersResponse } from '../models/item.model';
import { CharacterInfo, RoomSkin } from '../models/character.model';
import { CHARACTERS_DATA } from '../data/characters.data';
import { ROOM_SKINS_DATA } from '../data/skins.data';
import { FILTERS_DATA } from '../data/filters.data';
import { INITIAL_ITEMS_DATA } from '../data/initial-items.data';

@Injectable({
  providedIn: 'root'
})
export class ItemService {
  private http = inject(HttpClient);

  // Environment check: if running locally on port 4200/3000 with Node server, use backend API.
  // When running on Vercel or any static host, use high-speed inlined data directly (0ms network delay).
  private isLocalServer = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
    (window.location.port === '3000' || window.location.port === '4200');

  private apiUrl = this.isLocalServer
    ? (window.location.port === '4200' ? 'http://localhost:3000/api' : '/api')
    : '';

  // In-memory items store initialized immediately with pre-bundled items (zero network delay)
  private inMemoryItems: Item[] = [...INITIAL_ITEMS_DATA];
  private isFullSampleLoaded = false;
  private itemsSampleCache$: Observable<Item[]> | null = null;

  constructor() {
    // Silently pre-load the remaining sample items in the background
    if (!this.apiUrl) {
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
    // Instant bundled data: 0ms
    return of(CHARACTERS_DATA);
  }

  getRoomSkins(): Observable<RoomSkin[]> {
    // Instant bundled data: 0ms
    return of(ROOM_SKINS_DATA);
  }

  getFilters(): Observable<FiltersResponse> {
    if (this.apiUrl) {
      return this.http.get<FiltersResponse>(`${this.apiUrl}/filters`).pipe(
        catchError(() => of(FILTERS_DATA)),
        shareReplay(1)
      );
    }
    // Instant bundled data: 0ms
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
    // If backend is active locally, query backend API
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

    // High-speed synchronous in-memory filter (sub-millisecond 0ms instant response)
    return of(this.filterInMemory(params));
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

  getItemById(id: number): Observable<Item> {
    const item = this.inMemoryItems.find(it => it.id === id);
    if (item) return of(item);

    if (this.apiUrl) {
      return this.http.get<Item>(`${this.apiUrl}/items/${id}`).pipe(
        catchError(() => of(this.inMemoryItems[0]))
      );
    }
    return of(this.inMemoryItems[0]);
  }

  findDefaultItem(slotKey: string, characterId?: number): Item | null {
    // Map slotDef key to position IDs
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
    if (iconFile.startsWith('/')) return iconFile;
    return `/icons/${iconFile}`;
  }

  getImgUrl(imgPath: string | null | undefined): string {
    if (!imgPath) return '';
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) return imgPath;
    return imgPath.startsWith('/') ? imgPath : `/${imgPath}`;
  }
}
