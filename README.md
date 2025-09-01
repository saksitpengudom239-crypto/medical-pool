# Medical Pool – Supabase (Starter, no .env)

โปรเจกต์นี้จัดตามโค้ด `App.tsx` ที่คุณให้มา + โครง Vite/React/Tailwind + Supabase + XLSX พร้อมใช้งาน
> **ไม่มีไฟล์ `.env`** ตามที่ร้องขอ — กรุณาตั้งค่าตัวแปรแวดล้อมเองเวลา run

## ติดตั้ง
```bash
npm i
npm run dev
```

### ตั้งค่า ENV โดย *ไม่ใช้ .env*
**Windows PowerShell:**
```powershell
$env:VITE_SUPABASE_URL="https://xxxx.supabase.co"; $env:VITE_SUPABASE_ANON_KEY="eyJhbGciOi..."; npm run dev
```

**Windows CMD:**
```cmd
set VITE_SUPABASE_URL=https://xxxx.supabase.co && set VITE_SUPABASE_ANON_KEY=eyJhbGciOi... && npm run dev
```

**macOS/Linux:**
```bash
VITE_SUPABASE_URL=https://xxxx.supabase.co VITE_SUPABASE_ANON_KEY=eyJhbGciOi... npm run dev
```

**Vercel:** ไปที่ *Project Settings → Environment Variables* แล้วเพิ่ม `VITE_SUPABASE_URL` และ `VITE_SUPABASE_ANON_KEY`

## Supabase Schema (ตัวอย่างพร้อมใช้งาน)
ใช้ไฟล์ `supabase_schema.sql` ในโฟลเดอร์รากของโปรเจกต์ — คัดลอกไปวางที่ Supabase SQL Editor แล้วรัน
- ตาราง: brands, models, vendors, departments, locations, assets, borrows
- มี RLS policy แบบง่ายสำหรับผู้ใช้ที่ authenticate แล้ว

## หมายเหตุ
- ไฟล์โลโก้ `/public/312501_logo_20220919143527.webp` เป็น *placeholder* คุณสามารถแทนที่ด้วยไฟล์จริงได้
- ถ้าเห็น console เตือน `VITE_SUPABASE_* is missing` แปลว่ายังไม่ได้ตั้งค่า ENV ครับ
