import React from 'react'
import { supabase } from './supabaseClient'

type Mode = 'login' | 'signup' | 'magic'

function AuthScreen() {
  const [email, setEmail] = React.useState<string>('');
  const [password, setPassword] = React.useState<string>('');
  const [loading, setLoading] = React.useState<boolean>(false);

  const isValidEmail = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);

  const doLogin = async () => {
    if (!isValidEmail(email)) {
      window.alert('รูปแบบอีเมลไม่ถูกต้อง');
      return;
    }
    if (!password) {
      window.alert('กรุณากรอกรหัสผ่าน');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        const msg = (error?.message || '').toLowerCase();
        if (msg.includes('invalid') || msg.includes('credentials')) {
          window.alert('อีเมลหรือรหัสผ่านไม่ถูกต้อง');
        } else if (msg.includes('not found') || msg.includes('signup') || msg.includes('user')) {
          window.alert('ไม่พบบัญชีผู้ใช้ในระบบ ต้องการสมัครใช่ไหม?\nกรุณาติดต่อแอดมิน');
        } else {
          window.alert('ไม่สามารถเข้าสู่ระบบได้: ' + error.message);
        }
        return;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm">
        <div className="bg-white shadow-sm border rounded-2xl p-6">
          {/* โลโก้ */}
          <div className="flex flex-col items-center mb-6">
            <img src="/chg-logo.png" className="w-16 h-16 rounded-lg object-contain border" />
            <div className="mt-2 text-lg font-semibold">CHG Medical Pool</div>
            <div className="text-xs text-slate-500">กรุณาเข้าสู่ระบบ</div>
          </div>

          {/* ฟอร์มล็อกอินอย่างเดียว */}
          <div className="space-y-3">
            <label className="block">
              <span className="block text-xs text-slate-600 mb-1">อีเมล</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                type="email"
                className="w-full px-3 py-2.5 border rounded-xl"
                placeholder="you@email.com"
                autoFocus
              />
            </label>

            <label className="block">
              <span className="block text-xs text-slate-600 mb-1">รหัสผ่าน</span>
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                type="password"
                className="w-full px-3 py-2.5 border rounded-xl"
                placeholder="••••••••"
              />
            </label>

            <button
              onClick={doLogin}
              disabled={loading || !email || !password}
              className="w-full py-2.5 rounded-xl border bg-blue-600 text-white disabled:opacity-60"
            >
              {loading ? 'กำลังล็อกอิน...' : 'ล็อกอิน'}
            </button>

            {/* ข้อความคงที่ */}
            <div className="text-xs text-slate-500 text-center mt-2">
              กรุณาติดต่อแอดมิน
            </div>
          </div>

          <div className="mt-6 text-[11px] text-slate-400 text-center">
            © CHG — Chularat 3 International Hospital
          </div>
        </div>
      </div>
    </div>
  );
}


import InnerApp from './InnerApp'

export default function App() {
  const [ready, setReady] = React.useState(false)
  const [isAuthed, setAuthed] = React.useState(false)

  React.useEffect(() => {
    let mounted = true
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return
      setAuthed(!!data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthed(!!session)
    })
    return () => { sub.subscription.unsubscribe(); mounted = false }
  }, [])

  if (!ready) return <div className="min-h-screen flex items-center justify-center text-slate-500">Loading...</div>
  if (!isAuthed) return <AuthScreen />
  return <InnerApp />
}
