import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Item, ItemSearchResponse, FiltersResponse } from '../models/item.model';
import { CharacterInfo } from '../models/character.model';

@Injectable({
  providedIn: 'root'
})
export class ItemService {
  private http = inject(HttpClient);
  // Auto-detect base API: if running on port 4200 (ng serve), point to port 3000, otherwise relative /api
  private apiUrl = window.location.port === '4200' ? 'http://localhost:3000/api' : '/api';

  getCharacters(): Observable<CharacterInfo[]> {
    return this.http.get<CharacterInfo[]>(`${this.apiUrl}/characters`);
  }

  getFilters(): Observable<FiltersResponse> {
    return this.http.get<FiltersResponse>(`${this.apiUrl}/filters`);
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

    return this.http.get<ItemSearchResponse>(`${this.apiUrl}/items`, { params: httpParams });
  }

  getItemById(id: number): Observable<Item> {
    return this.http.get<Item>(`${this.apiUrl}/items/${id}`);
  }

  getIconUrl(iconFile: string | null): string {
    if (!iconFile) return '';
    return `${this.apiUrl}/icons/${iconFile}`;
  }
}
