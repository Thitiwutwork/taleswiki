import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, map, shareReplay } from 'rxjs';
import { Item, ItemSearchResponse, FiltersResponse } from '../models/item.model';
import { CharacterInfo, RoomSkin } from '../models/character.model';

@Injectable({
  providedIn: 'root'
})
export class ItemService {
  private http = inject(HttpClient);

  // Environment check: if running locally on port 4200/3000 with Node server, use backend API.
  // When running on Vercel or any static host, use high-speed static CDN data directly (0ms network failure lag).
  private isLocalServer = typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') &&
    (window.location.port === '3000' || window.location.port === '4200');

  private apiUrl = this.isLocalServer
    ? (window.location.port === '4200' ? 'http://localhost:3000/api' : '/api')
    : '';

  // In-memory singletons to ensure data is fetched only once and cached forever in memory
  private charactersCache$: Observable<CharacterInfo[]> | null = null;
  private roomSkinsCache$: Observable<RoomSkin[]> | null = null;
  private filtersCache$: Observable<FiltersResponse> | null = null;
  private itemsSampleCache$: Observable<Item[]> | null = null;

  getBaseUrl(): string {
    return this.isLocalServer && window.location.port === '4200' ? 'http://localhost:3000' : '';
  }

  getCharacters(): Observable<CharacterInfo[]> {
    if (!this.charactersCache$) {
      const src$ = this.apiUrl
        ? this.http.get<CharacterInfo[]>(`${this.apiUrl}/characters`).pipe(
            catchError(() => this.http.get<CharacterInfo[]>('/data/characters.json'))
          )
        : this.http.get<CharacterInfo[]>('/data/characters.json');

      this.charactersCache$ = src$.pipe(shareReplay(1));
    }
    return this.charactersCache$;
  }

  getRoomSkins(): Observable<RoomSkin[]> {
    if (!this.roomSkinsCache$) {
      this.roomSkinsCache$ = this.http.get<RoomSkin[]>('/data/room_skins.json').pipe(
        catchError(() => of([
          {
            id: 'skin_royal_academy',
            name: 'โรงเรียนเวทมนตร์ (Royal Academy)',
            filename: 'skin_royal_academy.jpg',
            url: '/img/skins/skin_royal_academy.jpg'
          }
        ])),
        shareReplay(1)
      );
    }
    return this.roomSkinsCache$;
  }

  getFilters(): Observable<FiltersResponse> {
    if (!this.filtersCache$) {
      const src$ = this.apiUrl
        ? this.http.get<FiltersResponse>(`${this.apiUrl}/filters`).pipe(
            catchError(() => this.http.get<FiltersResponse>('/data/filters.json'))
          )
        : this.http.get<FiltersResponse>('/data/filters.json');

      this.filtersCache$ = src$.pipe(shareReplay(1));
    }
    return this.filtersCache$;
  }

  private loadItemsSample(): Observable<Item[]> {
    if (!this.itemsSampleCache$) {
      this.itemsSampleCache$ = this.http.get<Item[]>('/data/items_sample.json').pipe(
        catchError(() => of([])),
        shareReplay(1)
      );
    }
    return this.itemsSampleCache$;
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
        catchError(() => this.filterStaticItems(params))
      );
    }

    // High-speed in-memory static filter for Vercel (sub-millisecond instant search)
    return this.filterStaticItems(params);
  }

  private filterStaticItems(params: {
    q?: string;
    position?: string | number;
    character?: string | number;
    source?: string;
    has_stats?: boolean;
    page?: number;
    limit?: number;
  }): Observable<ItemSearchResponse> {
    return this.loadItemsSample().pipe(
      map(items => {
        let filtered = items;

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
      })
    );
  }

  getItemById(id: number): Observable<Item> {
    if (this.apiUrl) {
      return this.http.get<Item>(`${this.apiUrl}/items/${id}`).pipe(
        catchError(() => this.loadItemsSample().pipe(
          map(items => items.find(it => it.id === id) as Item)
        ))
      );
    }
    return this.loadItemsSample().pipe(
      map(items => items.find(it => it.id === id) as Item)
    );
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
