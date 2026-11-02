export interface ObtainSource {
  type: 'gacha' | 'box' | 'exchange' | 'craft' | 'shop' | 'other';
  label: string;
  action?: string;
  target_name?: string;
  target_id?: number | null;
  target_icon?: string | null;
  count?: number;
  raw: string;
}

export interface Item {
  id: number;
  name: string;
  category_id: number;
  character_id: number;
  character_name: string;
  position_id: number;
  position_name: string;
  item_kind: number;
  level_req: number;
  game_money: number;
  cash: number;
  description: string;
  stats: string[];
  obtain_methods: string[];
  obtain_sources?: ObtainSource[];
  icon_file: string | null;
  icon_url: string | null;
}

export interface ItemSearchResponse {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  items: Item[];
}

export interface FilterOption {
  id: string | number;
  name: string;
  count?: number;
}

export interface FiltersResponse {
  positions: FilterOption[];
  characters: FilterOption[];
  sources: FilterOption[];
}
