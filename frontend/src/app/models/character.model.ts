export interface CharacterStats {
  speed: number;
  accel: number;
  strength: number;
  control: number;
}

export interface CharacterInfo {
  id: number;
  code: string;
  name: string;
  en_name: string;
  gender: string;
  job: string;
  story: string;
  stats: CharacterStats;
  abilities: string[];
  image_url: string | null;
  icon_file: string;
}

export interface RoomSkin {
  id: string;
  name: string;
  filename: string;
  url: string;
  width?: number;
  height?: number;
}
