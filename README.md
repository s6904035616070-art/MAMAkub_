# MAMAkub Project Guide

## 📌 Database Schema Context (ตารางฐานข้อมูลที่มีอยู่แล้วใน Supabase)

- **`sessions`**: `id`, `table_number`, `adult_count`, `child_count`, `status`, `created_at`
- **`menu_categories`**: `id`, `name`, `sort_order`
- **`menu_items`**: `id`, `category_id`, `name`
- **`orders`**: `id`, `session_id`, `table_number`, `items` (jsonb), `status`, `created_at`

---

## ⚡ Important Architecture Rules

### Next.js Dynamic Route Params Handling
โปรเจกต์นี้ใช้ Next.js เวอร์ชันล่าสุด ใน **Client Components** ที่รับ `params` จาก Dynamic Routes (เช่น `app/menu/[tableNumber]/page.js`) ค่า `params` จะถูกส่งมาเป็น **Promise** 

ต้องใช้ `React.use()` ในการ unwrap ค่าเสมอ เช่น:

```javascript
'use client';
import { use } from 'react';

export default function MenuPage({ params }) {
  const resolvedParams = use(params);
  const tableNumber = resolvedParams.tableNumber;

  return <div>โต๊ะที่: {tableNumber}</div>;
}
