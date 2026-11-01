import {
  Component,
  OnInit,
  inject,
  signal,
  computed
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ItemService } from '../../services/item.service';
import { Item } from '../../models/item.model';
import { CharacterInfo, RoomSkin } from '../../models/character.model';

export interface EquipSlotDef {
  key: string;
  name: string;
  posId: number | string;
  icon: string;
  column: 'left' | 'right';
}

@Component({
  selector: 'app-fitting-room',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fitting-room.component.html',
  styleUrl: './fitting-room.component.css'
})
export class FittingRoomComponent implements OnInit {
  private itemService = inject(ItemService);

  // Character list loaded from /api/characters
  characters = signal<CharacterInfo[]>([]);
  selectedCharacter = signal<CharacterInfo | null>(null);
  activeSubTab = signal<'char' | 'avatar' | 'costume'>('char');
  showLoreModal = signal<boolean>(false);

  // Stage Background Skins (สกินห้องแต่งตัว)
  skins = signal<RoomSkin[]>([]);
  selectedSkin = signal<RoomSkin | null>(null);
  showSkinModal = signal<boolean>(false);

  // Slot Definitions matching in-game dressing room
  slotDefs: EquipSlotDef[] = [
    // Left column
    { key: 'face', name: 'ดวงตา / แว่นตา', posId: 6, icon: '👓', column: 'left' },
    { key: 'face_lower', name: 'ใบหน้าล่าง / พลาสเตอร์', posId: 6, icon: '🩹', column: 'left' },
    { key: 'neck', name: 'คอ / สร้อย / ผ้าพันคอ', posId: 9, icon: '🧣', column: 'left' },
    { key: 'hand', name: 'มือ / ถุงมือ', posId: 7, icon: '🧤', column: 'left' },
    { key: 'wrist', name: 'ข้อมือ / กำไล', posId: 12, icon: '⌚', column: 'left' },
    { key: 'tail', name: 'หาง', posId: 14, icon: '🦊', column: 'left' },
    { key: 'expansion', name: 'ส่วนขยาย / บูสเตอร์', posId: '11,13', icon: '✨', column: 'left' },

    // Right column
    { key: 'head', name: 'หมวก / ศีรษะ', posId: 5, icon: '👑', column: 'right' },
    { key: 'hair', name: 'ทรงผม', posId: 1, icon: '💇', column: 'right' },
    { key: 'top', name: 'เสื้อ', posId: 2, icon: '👕', column: 'right' },
    { key: 'bottom', name: 'กางเกง', posId: 3, icon: '👖', column: 'right' },
    { key: 'shoes', name: 'รองเท้า', posId: 4, icon: '👟', column: 'right' },
    { key: 'back', name: 'หลัง / ปีก', posId: 8, icon: '🪽', column: 'right' },
    { key: 'pet', name: 'สัตว์เลี้ยง', posId: 10, icon: '🐾', column: 'right' },
  ];

  leftSlots = computed(() => this.slotDefs.filter(s => s.column === 'left'));
  rightSlots = computed(() => this.slotDefs.filter(s => s.column === 'right'));

  // Equipped Items Map
  equipped = signal<Record<string, Item | null>>({
    face: null,
    face_lower: null,
    neck: null,
    hand: null,
    wrist: null,
    tail: null,
    expansion: null,
    head: null,
    hair: null,
    top: null,
    bottom: null,
    shoes: null,
    back: null,
    pet: null,
  });

  // Drawer Picker State
  activePickerSlot = signal<EquipSlotDef | null>(null);
  pickerItems = signal<Item[]>([]);
  isPickerLoading = signal<boolean>(false);
  pickerSearchQuery = signal<string>('');

  // Total Combined Stats (Base Character Stats + Item Bonuses)
  totalStats = computed(() => {
    const char = this.selectedCharacter();
    const eq = this.equipped();

    const baseSpeed = char?.stats.speed || 0;
    const baseAccel = char?.stats.accel || 0;
    const baseStrength = char?.stats.strength || 0;
    const baseControl = char?.stats.control || 0;

    let itemSpeed = 0;
    let itemAccel = 0;
    let itemStrength = 0;
    let itemControl = 0;
    let itemExp = 0;
    let itemTr = 0;
    const otherBonuses: string[] = [];

    for (const item of Object.values(eq)) {
      if (!item || !item.stats) continue;
      for (const stat of item.stats) {
        let matched = false;
        if (stat.includes('ความเร็วสูงสุด')) {
          const m = stat.match(/[+]?\s*(\d+(\.\d+)?)/);
          if (m) { itemSpeed += parseFloat(m[1]); matched = true; }
        } else if (stat.includes('อัตราเร่ง')) {
          const m = stat.match(/[+]?\s*(\d+(\.\d+)?)/);
          if (m) { itemAccel += parseFloat(m[1]); matched = true; }
        } else if (stat.includes('แรงผลัก')) {
          const m = stat.match(/[+]?\s*(\d+(\.\d+)?)/);
          if (m) { itemStrength += parseFloat(m[1]); matched = true; }
        } else if (stat.includes('การควบคุม') || stat.includes('ควบคุม')) {
          const m = stat.match(/[+]?\s*(\d+(\.\d+)?)/);
          if (m) { itemControl += parseFloat(m[1]); matched = true; }
        } else if (stat.includes('EXP')) {
          const m = stat.match(/[+]?\s*(\d+(\.\d+)?)/);
          if (m) { itemExp += parseFloat(m[1]); matched = true; }
        } else if (stat.includes('TR')) {
          const m = stat.match(/[+]?\s*(\d+(\.\d+)?)/);
          if (m) { itemTr += parseFloat(m[1]); matched = true; }
        }

        if (!matched && !otherBonuses.includes(stat) && otherBonuses.length < 12) {
          otherBonuses.push(stat);
        }
      }
    }

    return {
      speed: { base: baseSpeed, item: itemSpeed, total: baseSpeed + itemSpeed },
      accel: { base: baseAccel, item: itemAccel, total: baseAccel + itemAccel },
      strength: { base: baseStrength, item: itemStrength, total: baseStrength + itemStrength },
      control: { base: baseControl, item: itemControl, total: baseControl + itemControl },
      exp: itemExp,
      tr: itemTr,
      others: otherBonuses,
    };
  });

  ngOnInit() {
    this.loadCharacters();
    this.loadRoomSkins();
  }

  loadRoomSkins() {
    this.itemService.getRoomSkins().subscribe({
      next: (skins) => {
        this.skins.set(skins);
        // Default to Royal Academy (Image 2 in-game look)
        const defaultSkin = skins.find(s => s.id === 'skin_royal_academy') || skins[0];
        if (defaultSkin) {
          this.selectedSkin.set(defaultSkin);
        }
      },
      error: (e) => console.error('Failed to load room skins', e)
    });
  }

  selectSkin(skin: RoomSkin) {
    this.selectedSkin.set(skin);
    this.showSkinModal.set(false);
  }

  loadCharacters() {
    this.itemService.getCharacters().subscribe({
      next: (chars) => {
        this.characters.set(chars);
        // Default to Harang (ID 23) or first
        const harang = chars.find(c => c.code === 'ha') || chars[0];
        if (harang) {
          this.selectedCharacter.set(harang);
          this.loadDefaultOutfit();
        }
      },
      error: (e) => console.error('Failed to load characters', e)
    });
  }

  selectCharacter(char: CharacterInfo) {
    this.selectedCharacter.set(char);
    // Clear equipment or keep universal
  }

  private loadDefaultOutfit() {
    this.itemService.getItems({ q: 'ที่คาดผมหูแมวดำ', limit: 1 }).subscribe(r => {
      if (r.items?.length) this.equipItem('head', r.items[0]);
    });
    this.itemService.getItems({ q: 'พลาสเตอร์เด็กซน', limit: 1 }).subscribe(r => {
      if (r.items?.length) this.equipItem('face_lower', r.items[0]);
    });
  }

  openSlotPicker(slot: EquipSlotDef) {
    this.activePickerSlot.set(slot);
    this.pickerSearchQuery.set('');
    this.fetchPickerItems();
  }

  closeSlotPicker() {
    this.activePickerSlot.set(null);
  }

  fetchPickerItems() {
    const slot = this.activePickerSlot();
    if (!slot) return;

    this.isPickerLoading.set(true);
    const char = this.selectedCharacter();

    this.itemService.getItems({
      q: this.pickerSearchQuery(),
      position: slot.posId,
      character: char?.id || 'all',
      limit: 30
    }).subscribe({
      next: (res) => {
        this.pickerItems.set(res.items || []);
        this.isPickerLoading.set(false);
      },
      error: () => this.isPickerLoading.set(false)
    });
  }

  onPickerSearchChange(q: string) {
    this.pickerSearchQuery.set(q);
    this.fetchPickerItems();
  }

  equipItem(slotKey: string, item: Item) {
    this.equipped.update(curr => ({
      ...curr,
      [slotKey]: item
    }));
    this.closeSlotPicker();
  }

  unequipSlot(slotKey: string, e?: Event) {
    if (e) e.stopPropagation();
    this.equipped.update(curr => ({
      ...curr,
      [slotKey]: null
    }));
  }

  clearAllEquip() {
    this.equipped.set({
      face: null,
      face_lower: null,
      neck: null,
      hand: null,
      wrist: null,
      tail: null,
      expansion: null,
      head: null,
      hair: null,
      top: null,
      bottom: null,
      shoes: null,
      back: null,
      pet: null,
    });
  }

  randomizeOutfit() {
    this.isPickerLoading.set(true);
    const char = this.selectedCharacter();
    for (const slot of this.slotDefs) {
      this.itemService.getItems({
        position: slot.posId,
        character: char?.id || 'all',
        limit: 10
      }).subscribe(res => {
        if (res.items && res.items.length > 0) {
          const randomIndex = Math.floor(Math.random() * res.items.length);
          this.equipItem(slot.key, res.items[randomIndex]);
        }
      });
    }
    this.isPickerLoading.set(false);
  }

  copyBuildShare() {
    const char = this.selectedCharacter();
    const eq = this.equipped();
    const stats = this.totalStats();
    const list = Object.entries(eq)
      .filter(([_, it]) => it !== null)
      .map(([k, it]) => `[${k}]: ${it?.name}`)
      .join('\n');
    const text = `🎮 Tales Runner Setup: ${char?.name} (${char?.job})\n🏃 ความเร็วสูงสุด: ${stats.speed.total} | ⚡ อัตราเร่ง: ${stats.accel.total} | 💥 แรงผลัก: ${stats.strength.total} | 🎮 ควบคุม: ${stats.control.total}\n\nไอเทมที่สวมใส่:\n${list}`;
    navigator.clipboard.writeText(text);
    alert('คัดลอกข้อมูลเซ็ตชุดและสเตตัสเรียบร้อยแล้ว!');
  }

  getIconUrl(iconFile: string | null | undefined): string {
    return this.itemService.getIconUrl(iconFile);
  }

  getCharacterImageUrl(char: CharacterInfo | null): string {
    if (!char) return this.itemService.getImgUrl('/img/characters/char_23.png');
    const path = char.image_url || `/img/characters/char_${char.id}.png`;
    return this.itemService.getImgUrl(path);
  }

  onCharacterImageError(event: Event, char: CharacterInfo | null) {
    if (!char) return;
    const img = event.target as HTMLImageElement;
    const fallbackIcon = this.getIconUrl(char.icon_file);
    if (char.icon_file && !img.src.includes(char.icon_file)) {
      img.src = fallbackIcon;
    } else {
      img.src = this.itemService.getImgUrl('/img/characters/char_23.png');
    }
  }

  onItemIconError(event: Event) {
    const img = event.target as HTMLImageElement;
    img.src = this.getIconUrl('default_icon.png');
  }
}
