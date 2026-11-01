# 🏃‍♂️ Tales Runner Item Wiki & Search Website

ระบบค้นหาและฐานข้อมูลไอเทมเกม **Tales Runner (เซิร์ฟเวอร์ไทย)** พัฒนาด้วย **Angular (Frontend)** และ **Node.js + SQLite (Backend)**

---

## 📁 โครงสร้างโปรเจกต์ (`E:\talesItem`)

```text
E:\talesItem/
├── data/                       # โฟลเดอร์ข้อมูลหลัก
│   ├── items.json              # ฐานข้อมูล JSON (107,869 ไอเทม)
│   ├── items.sqlite            # ฐานข้อมูล SQLite พร้อม Full-Text Search (FTS5)
│   └── items.csv               # ฐานข้อมูล CSV เปิดดูใน Excel ได้
├── public/
│   └── icons/                  # รูปภาพไอคอนไอเทมขนาด 64x64 PNG (>35,000 รูป)
├── server/                     # Backend API (Node.js Built-in SQLite)
│   ├── server.js               # Web Server & REST API
│   └── package.json
├── frontend/                   # Frontend Web App (Angular)
│   ├── src/                    # ซอร์สโค้ด Angular
│   ├── dist/                   # ไฟล์คอมไพล์ของหน้าเว็บพร้อมใช้งาน
│   └── package.json
├── items.json                  # ลิงก์ไฟล์ข้อมูล
├── items.sqlite                # ลิงก์ไฟล์ฐานข้อมูล
├── items.csv                   # ลิงก์ไฟล์ตาราง
└── README.md                   # คู่มือการใช้งาน
```

---

## 🚀 วิธีเปิดใช้งานเว็บไซต์

### 1. รัน Backend & Frontend ผ่าน Node.js (พร้อมใช้งานทันที)
เข้าไปที่โฟลเดอร์ `server` และรันคำสั่ง:
```bash
cd E:\talesItem\server
node server.js
```
เปิดบราวเซอร์ไปที่: **`http://localhost:3000`**

---

### 2. รันโหมดพัฒนา (Frontend Dev Server - Angular)
หากต้องการแก้ไขโค้ดหน้าเว็บแบบ Hot-Reload:
```bash
# เทอร์มินัล 1: รัน Backend
cd E:\talesItem\server
node server.js

# เทอร์มินัล 2: รัน Angular Dev Server
cd E:\talesItem\frontend
npm.cmd start
```
เปิดบราวเซอร์ไปที่: **`http://localhost:4200`**

---

## 🌟 ฟีเจอร์ของระบบ
1. **ช่องค้นหาอัจฉริยะ (Live Instant Search):**
   * ค้นหาจากชื่อไอเทมภาษาไทย (เช่น `ปีก`, `มงกุฎ`, `ชุด`)
   * ค้นหาจากค่าสเตตัส (เช่น `ความเร็ว`, `EXP`, `TR`, `โกรธ`)
   * ค้นหาจากวิธีได้รับ (เช่น `แปรธาตุ`, `แลกเปลี่ยน`, `คิวบ์`, `Cash`)
2. **ระบบแบ่งหมวดหมู่ (Category Tabs):**
   * ทรงผม, เสื้อ, กางเกง, รองเท้า, หมวก, หลัง/ปีก, บูสเตอร์, ใบหน้า, สัตว์เลี้ยง, ถุงมือ, สร้อย/คอ, ชุดเซ็ต, ทั่วไป
3. **ระบบกรองตัวละคร (Character Filter):**
   * ทุกตัวละคร, โชวอน, หมิงหมิง, ลีน่า, บิ๊กโบ, รัฟ, บาดาดา, มากิ, เวร่า, ฮารัง, ชิโฮะ, มิโฮะ, ลูซี่, คาอิน, บลัดดี้เวร่า ฯลฯ
4. **บอกแหล่งที่มาและวิธีได้รับไอเทม (Acquisition Methods):**
   * 🛒 **ร้านค้าในเกม (Shop):** ระบุราคา TR, Cash, Farm Point หรือ Guild Point
   * 🧪 **ห้องเล่นแร่แปรธาตุ (Alchemist):** บอกไอเทมที่ต้องผสมสร้าง
   * 🔄 **ระบบแลกเปลี่ยน (Exchange System):** ไอเทมที่แลกได้จากตู้แลกของ
   * 🎁 **กล่องของขวัญ / คิวบ์ (Cube / Box Reward):** ได้รับจากการเปิดสุ่มกล่อง
   * ⭐ **รางวัลเลเวลอัป (Level Reward):** ได้รับเมื่อเลเวลถึงที่กำหนด
   * 🏆 **กิจกรรม / แพ็กเกจพิเศษ:** อีเวนต์และการแข่งขัน Tales Pro League
5. **หน้าต่างแสดงรายละเอียดไอเทม (Detail Modal):**
   * คลิกที่การ์ดไอเทมเพื่อดูรูปขนาดใหญ่, ค่าสเตตัสทั้งหมด, คำอธิบายไอเทมฉบับเต็ม และวิธีได้รับอย่างละเอียด

---

## 📡 REST API Endpoints
* `GET /api/items?q={keyword}&position={id}&character={id}&source={src}&page={p}&limit={n}`
* `GET /api/items/:id` — ดึงข้อมูลไอเทมรายชิ้น
* `GET /api/filters` — ดึงรายการหมวดหมู่, ตัวละคร และแหล่งที่มาทั้งหมด
* `GET /api/icons/:filename` — ดึงรูปภาพไอคอน PNG
