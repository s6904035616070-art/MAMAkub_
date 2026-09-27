# MAMAkub

ระบบสั่งอาหารร้านมาม่าเกาหลี "MAMAkub"

## Tech Stack

- Next.js
- App Router
- JavaScript
- React
- Supabase
- Vercel

## Next.js Version

โปรเจกต์นี้ใช้ Next.js เวอร์ชันล่าสุดที่กำหนดไว้ใน package.json

ปัจจุบัน package.json ใช้:
- Next.js 16.3.6
- React 19.3.0
- @supabase/supabase-js 2.117.2

## Important Dynamic Route Rule

โปรเจกต์นี้ใช้ Next.js App Router รุ่นใหม่

เมื่อสร้าง Dynamic Route เช่น:

app/order/[sessionId]/page.js

ให้จำไว้ว่า `params` เป็น Promise ใน Next.js รุ่นใหม่

สำหรับ Client Component ที่ต้องอ่าน params:
- ต้องใช้ `use()` จาก React เพื่อ unwrap Promise
- ห้ามอ่านค่า params โดยตรงก่อน unwrap

ตัวอย่าง:

"use client";

import { use } from "react";

export default function OrderPage({ params }) {
  const { sessionId } = use(params);

  return <div>Session: {sessionId}</div>;
}

หมายเหตุ:
หากเป็น Server Component สามารถใช้ `await params` ได้ตามรูปแบบของ Next.js
แต่ถ้าเป็น Client Component ให้ใช้ `use(params)` จาก React

## Environment Variables

สร้างไฟล์ `.env.local`

NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

ห้าม commit `.env.local`

## Supabase Database Schema

ฐานข้อมูลมีอยู่แล้ว ไม่ต้องสร้างตารางใหม่

### sessions

Columns:
- id
- table_number
- adult_count
- child_count
- status
- created_at

### menu_categories

Columns:
- id
- name
- sort_order

### menu_items

Columns:
- id
- category_id
- name

### orders

Columns:
- id
- session_id
- table_number
- items (jsonb)
- status
- created_at

## Database Rules

การพัฒนาฟีเจอร์ในขั้นต่อไปต้องอ้างอิงตารางและ column ที่ระบุไว้ด้านบน

ห้ามสร้าง schema ใหม่หรือเปลี่ยนชื่อ column โดยไม่ได้รับคำสั่ง

## Routes

/                   -> หน้าแรก
/generate-qr        -> หน้าสร้าง QR
/kitchen            -> หน้าครัว

## Deployment

โปรเจกต์นี้ออกแบบให้ deploy บน Vercel

ก่อน deploy ให้ตั้งค่า Environment Variables ใน Vercel:

NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY

## Development

ติดตั้ง dependencies:

npm install

รัน development server:

npm run dev

Build:

npm run build

Start production server:

npm run start
