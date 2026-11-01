import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, catchError, of, map } from 'rxjs';
import { Item, ItemSearchResponse, FiltersResponse } from '../models/item.model';
import { CharacterInfo, RoomSkin } from '../models/character.model';

@Injectable({
  providedIn: 'root'
})
export class ItemService {
  private http = inject(HttpClient);
  // Auto-detect base API: if running on port 4200 (ng serve), point to port 3000, otherwise relative /api
  private apiUrl = window.location.port === '4200' ? 'http://localhost:3000/api' : '/api';
  private serverOrigin = window.location.port === '4200' ? 'http://localhost:3000' : '';

  getBaseUrl(): string {
    return this.serverOrigin;
  }

  getCharacters(): Observable<CharacterInfo[]> {
    return this.http.get<CharacterInfo[]>(`${this.apiUrl}/characters`).pipe(
      catchError(() => this.http.get<CharacterInfo[]>('/data/characters.json'))
    );
  }

  getRoomSkins(): Observable<RoomSkin[]> {
    return this.http.get<RoomSkin[]>('/data/room_skins.json').pipe(
      catchError(() => of([
        {
          id: 'skin_royal_academy',
          name: 'โรงเรียนเวทมนตร์ (Royal Academy)',
          filename: 'skin_royal_academy.jpg',
          url: '/img/skins/skin_royal_academy.jpg'
        }
      ]))
    );
  }

  getFilters(): Observable<FiltersResponse> {
    return this.http.get<FiltersResponse>(`${this.apiUrl}/filters`).pipe(
      catchError(() => this.http.get<FiltersResponse>('/data/filters.json'))
    );
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
      catchError(() => this.getStaticFallbackItems(params))
    );
  }

  private getStaticFallbackItems(params: any): Observable<ItemSearchResponse> {
    return this.http.get<Item[]>('/data/items_sample.json').pipe(
      map(items => {
        let filtered = items;
        if (params.q) {
          const q = params.q.toLowerCase();
          filtered = filtered.filter(it => it.name && it.name.toLowerCase().includes(q));
        }
        if (params.position !== undefined && params.position !== 'all') {
          const posList = params.position.toString().split(',').map((p: string) => parseInt(p.trim(), 10));
          filtered = filtered.filter(it => posList.includes(it.position_id));
        }
        if (params.character !== undefined && params.character !== 'all') {
          const cId = parseInt(params.character.toString(), 10);
          filtered = filtered.filter(it => it.character_id === cId || it.character_id === 0);
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
      }),
      catchError(() => of({ total: 0, page: 1, limit: 30, totalPages: 1, items: [] }))
    );
  }

  getItemById(id: number): Observable<Item> {
    return this.http.get<Item>(`${this.apiUrl}/items/${id}`).pipe(
      catchError(() => this.http.get<Item[]>('/data/items_sample.json').pipe(
        map(items => items.find(it => it.id === id) as Item)
      ))
    );
  }

  getIconUrl(iconFile: string | null | undefined): string {
    if (!iconFile) return `${this.serverOrigin}/icons/default_icon.png`;
    // Fast path: essential character face icons and default icon are bundled directly in frontend
    if (iconFile.endsWith('_character_000.png') || iconFile === 'default_icon.png' || iconFile.startsWith('char_')) {
      return `/icons/${iconFile}`;
    }
    return `${this.apiUrl}/icons/${iconFile}`;
  }

  getImgUrl(imgPath: string | null | undefined): string {
    if (!imgPath) return '';
    if (imgPath.startsWith('http://') || imgPath.startsWith('https://')) return imgPath;
    // Character art and skin backgrounds are bundled directly in /img/
    return imgPath.startsWith('/') ? imgPath : `/${imgPath}`;
  }
}
