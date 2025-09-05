import { createClient } from '@supabase/supabase-js'

// ใช้ค่า ENV จากระบบ (ไม่มีไฟล์ .env ในโปรเจกต์นี้)
const url = import.meta.env.VITE_SUPABASE_URL
const anon = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!url || !anon) {
  console.warn('[supabaseClient] VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY is missing.')
}

export const supabase = createClient(url as string, anon as string, {
  auth: {
    autoRefreshToken: true,       // ต่ออายุ token ระหว่างใช้งาน
    persistSession: true,         // ให้จำ session
    detectSessionInUrl: true,
    storage: typeof window !== 'undefined' ? window.sessionStorage : undefined, 
    // 👆 เก็บ session ใน sessionStorage → ปิดเบราว์เซอร์แล้วหาย
  },
})
