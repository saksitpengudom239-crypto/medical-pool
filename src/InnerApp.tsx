import React from 'react'
import { LayoutDashboard, Archive, Undo2, FileBarChart2, Settings as SettingsIcon, CheckCircle2, AlertTriangle, Download, Printer, Trash2, Plus } from 'lucide-react'
import * as XLSX from 'xlsx'
import { supabase } from './supabaseClient'

// Simple Error Boundary to avoid blank screen
class ErrorBoundary extends React.Component<{children: React.ReactNode}, {hasError: boolean, err?: any}> {
  constructor(props:any){ super(props); this.state = { hasError: false }; }
  static getDerivedStateFromError(error:any){ return { hasError: true, err: error }; }
  componentDidCatch(error:any, info:any){ console.error('UI ErrorBoundary:', error, info); }
  render(){
    if(this.state.hasError){
      return <div className="p-4 m-4 border rounded-xl bg-rose-50 text-rose-700">
        เกิดข้อผิดพลาดในการแสดงผล — โปรดลองรีเฟรชหน้า หรือส่งภาพหน้า Console มาให้ผู้ดูแล
      </div>;
    }
    return this.props.children as any;
  }
}


// Lightweight SVG line chart (no external deps)
function BorrowLineChart({ data }: { data: { date: string; count: number }[] }) {
  const width = 800, height = 240, pad = 32;
  if (!data || data.length === 0) {
    return <div className="text-sm text-slate-500">ไม่มีข้อมูลกราฟในช่วงที่เลือก</div>;
  }
  const parse = (d: string) => new Date(d + "T00:00:00").getTime();
  const xs = data.map(d => parse(d.date));
  const ys = data.map(d => d.count);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = 0, maxY = Math.max(1, Math.max(...ys));

  const sx = (x: number) => pad + (maxX === minX ? 0 : (x - minX) / (maxX - minX) * (width - 2 * pad));
  const sy = (y: number) => (height - pad) - (maxY === minY ? 0 : (y - minY) / (maxY - minY) * (height - 2 * pad));

  const points = data.map(d => `${sx(parse(d.date)).toFixed(1)},${sy(d.count).toFixed(1)}`).join(" ");

  // y ticks (0, max/2, max)
  const yTicks = [0, Math.ceil(maxY/2), maxY];

  // x ticks: first, middle, last
  const xTicksIdx = [0, Math.floor(data.length/2), data.length-1].filter((v, i, arr) => arr.indexOf(v) === i);
  const format = (d: string) => {
    const [y,m,day] = d.split("-");
    return `${day}/${m}`;
  };

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-64">
      {/* grid */}
      {yTicks.map((t,i)=>(
        <g key={i}>
          <line x1={pad} y1={sy(t)} x2={width-pad} y2={sy(t)} stroke="#e5e7eb" strokeDasharray="3 3" />
          <text x={4} y={sy(t)+4} fontSize="10" fill="#64748b">{t}</text>
        </g>
      ))}
      {/* axes */}
      <line x1={pad} y1={pad} x2={pad} y2={height-pad} stroke="#94a3b8" />
      <line x1={pad} y1={height-pad} x2={width-pad} y2={height-pad} stroke="#94a3b8" />

      {/* x ticks */}
      {xTicksIdx.map((idx, i)=>{
        const x = sx(xs[idx]);
        return (
          <g key={i}>
            <line x1={x} y1={height-pad} x2={x} y2={height-pad+4} stroke="#94a3b8" />
            <text x={x} y={height-pad+14} fontSize="10" textAnchor="middle" fill="#64748b">{format(data[idx].date)}</text>
          </g>
        );
      })}

      {/* line */}
      <polyline fill="none" stroke="#2563eb" strokeWidth="2.5" points={points} />
      {/* dots */}
      {data.map((d,i)=>(
        <circle key={i} cx={sx(xs[i])} cy={sy(ys[i])} r="2" fill="#2563eb" />
      ))}
    </svg>
  );
}


const todayStr = (): string => new Date().toISOString().slice(0, 10)
const parseDate = (d: string): Date => new Date(d + "T00:00:00")

const formatDate = (d?: string) => {
  if (!d) return "";
  const parts = d.split("-");
  if (parts.length !== 3) return d as string;
  const [y, m, day] = parts;
  return `${day}/${m}/${y}`;
}


type Asset = {
  id: string;
  asset_id: string;
  id_code: string;
  name: string;
  brand: string;
  model: string;
  vendor: string;
  serial: string;
  department: string;
  branch?: string;
  location: string;
  purchase_date: string;
  price: string;
}

type Borrow = {
  id: string;
  asset_id: string;
  borrower_name: string;
  borrower_dept: string;
  borrower_branch?: string;
  lender_name: string;
  peripherals: string;
  start_date: string;
  end_date: string;
  returned: boolean;
  borrower_signature: string;
}

type OptionRow = { id: string; name: string }

const Text = ({ label, value, onChange, type = 'text', placeholder, min, max }: {
  label: string; value: string | undefined; onChange?: (v: string) => void; type?: string; placeholder?: string; min?: string; max?: string;
}) => (
  <label className="block">
    <span className="block text-xs text-slate-600 mb-1">{label}</span>
    <input type={type} value={value ?? ''} placeholder={placeholder} min={min} max={max}
      onChange={(e) => onChange?.(e.target.value)}
      className="w-full px-3 py-2.5 border rounded-xl bg-white" />
  </label>
)

const Select = ({ label, value, onChange, options, disabled }: {
  label: string; value: string | undefined; onChange: (v: string) => void; options: string[]; disabled?: boolean;
}) => (
  <label className="block">
    <span className="block text-xs text-slate-600 mb-1">{label}</span>
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value)} disabled={disabled}
      className="w-full px-3 py-2.5 border rounded-xl bg-white">
      <option value="">-- เลือก --</option>
      {options.map(o => <option key={o} value={o}>{o}</option>)}
    </select>
  </label>
)


// Local inline Edit icon to avoid import issues
const EditIcon = ({ className = "w-3 h-3" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none"
       stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
       className={className}>
    <path d="M12 20h9" />
    <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z" />
  </svg>
);

function SignaturePad({ value, onChange }: { value?: string; onChange: (dataUrl: string) => void }) {
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const drawing = React.useRef(false)
  const [empty, setEmpty] = React.useState(!value)

  React.useEffect(() => {
    const canvas = canvasRef.current!
    const dpr = window.devicePixelRatio || 1
    const rect = canvas.getBoundingClientRect()
    canvas.width = rect.width * dpr
    canvas.height = rect.height * dpr
    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, rect.width, rect.height)
  }, [])

  const getPos = (e: any) => {
    const rect = canvasRef.current!.getBoundingClientRect()
    if (e.touches && e.touches[0]) {
      return { x: e.touches[0].clientX - rect.left, y: e.touches[0].clientY - rect.top }
    }
    return { x: e.clientX - rect.left, y: e.clientY - rect.top }
  }

  const start = (e: any) => {
    e.preventDefault()
    drawing.current = true
    const p = getPos(e)
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
  }
  const move = (e: any) => {
    if (!drawing.current) return
    e.preventDefault()
    const p = getPos(e)
    const ctx = canvasRef.current!.getContext('2d')!
    ctx.lineTo(p.x, p.y)
    ctx.strokeStyle = '#111827'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    setEmpty(false)
  }
  const end = () => {
    if (!drawing.current) return
    drawing.current = false
    onChange(canvasRef.current!.toDataURL('image/png'))
  }
  const clear = () => {
    const c = canvasRef.current!
    const ctx = c.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, c.width, c.height)
    setEmpty(true)
    onChange('')
  }

  return (
    <div className="space-y-2">
      <div className="border rounded-xl bg-white relative touch-none"
        onMouseDown={start} onMouseMove={move} onMouseUp={end} onMouseLeave={end}
        onTouchStart={start} onTouchMove={move} onTouchEnd={end}
        style={{ width: '100%', height: 140 }}>
        <canvas ref={canvasRef} className="w-full h-full rounded-xl" />
      </div>
      <div className="flex items-center gap-2">
        <button type="button" onClick={clear} className="px-3 py-1.5 rounded-lg bg-slate-200 text-sm">ล้างลายเซ็น</button>
        {!empty && <span className="text-xs text-emerald-700">บันทึกแล้ว</span>}
      </div>
      {value && <div className="text-xs text-slate-500">พรีวิว: <img alt="signature" src={value} className="inline h-10 align-middle" /></div>}
    </div>
  )
}

async function fetchOptions(table: string): Promise<string[]> {
  const { data, error } = await supabase.from(table).select('name').order('name')
  if (error) return []
  return (data as { name: string }[]).map(r => r.name)
}

function OptionEditor({ table, title }: { table: 'brands'|'vendors'|'departments'|'branches'|'locations'; title: string }) {
  const [items, setItems] = React.useState<OptionRow[]>([])
  const [txt, setTxt] = React.useState('')

  const load = async () => {
    const { data } = await supabase.from(table).select('*').order('name')
    setItems((data as any) ?? [])
  }
  React.useEffect(() => { load() }, [])

  const add = async () => {
    const name = txt.trim()
    if (!name) return
    await supabase.from(table).insert({ name })
    setTxt('')
    load()
  }
  const del = async (id: string) => {
    await supabase.from(table).delete().eq('id', id)
    load()
  }

  return (
    <div className="bg-white border rounded-2xl p-4 shadow-soft">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="flex gap-2 mb-3">
        <input value={txt} onChange={e=>setTxt(e.target.value)} className="flex-1 px-3 py-2.5 border rounded-xl" placeholder={"เพิ่ม " + title} />
        <button onClick={add} className="px-3 py-2 rounded-xl bg-blue-600 text-white text-sm inline-flex items-center gap-1">
          <Plus className="w-4 h-4" /> เพิ่ม
        </button>
      </div>
      <div className="divide-y border rounded-xl">
        {items.map((r) => (
          <div key={r.id} className="flex items-center justify-between px-3 py-2">
            <span className="text-sm">{r.name}</span>
            <button onClick={() => del(r.id)} className="px-2 py-1 rounded-lg bg-rose-600 text-white text-xs inline-flex items-center gap-1">
              <Trash2 className="w-3 h-3" /> ลบ
            </button>
          </div>
        ))}
        {items.length === 0 && <div className="px-3 py-2 text-sm text-slate-500">ยังไม่มีข้อมูล</div>}
      </div>
    </div>
  )
}

window.addEventListener("error", (e)=>{ console.error("GlobalError:", e.message, e.error); });

export default function App() {
  const [tab, setTab] = React.useState<'dashboard'|'register'|'borrow'|'report'|'settings'>('dashboard')

  const [assets, setAssets] = React.useState<Asset[]>([])
  const [borrows, setBorrows] = React.useState<Borrow[]>([])

// รายชื่อ asset_id ที่ยังไม่คืน (กันยืมซ้ำ)
const activeBorrowAssetIds = React.useMemo(() => {
  const ids = new Set<string>();
  borrows.forEach(b => { if (!b.returned) ids.add(b.asset_id); });
  return ids;
}, [borrows]);

  // dynamic option lists from Supabase
  const [brandOpts, setBrandOpts] = React.useState<string[]>([])
  const [modelOpts, setModelOpts] = React.useState<string[]>([])
  const [vendorOpts, setVendorOpts] = React.useState<string[]>([])
  const [deptOpts, setDeptOpts] = React.useState<string[]>([])
  const [branchOpts, setBranchOpts] = React.useState<string[]>([])
  const [locOpts, setLocOpts] = React.useState<string[]>([])

  const loadOptions = async () => {
    const [b, m, v, d, br, l] = await Promise.all([
      fetchOptions('brands'), fetchOptions('models'), fetchOptions('vendors'),
      fetchOptions('departments'), fetchOptions('branches'), fetchOptions('locations')
    ])
    setBrandOpts(b); setModelOpts(m); setVendorOpts(v); setDeptOpts(d); setBranchOpts(br); setLocOpts(l)
  }

  const loadAssets = async () => {
    const { data } = await supabase.from('assets').select('*').order('asset_id')
    setAssets((data as any) ?? [])
  }
  const loadBorrows = async () => {
    const { data } = await supabase.from('borrows').select('*').order('start_date', { ascending: false })
    setBorrows((data as any) ?? [])
  }
  React.useEffect(() => { loadAssets(); loadBorrows(); loadOptions(); }, [])

  const [form, setForm] = React.useState<Partial<Asset>>({})
  const addAsset = async () => {
    const payload: any = {
      asset_id: form.asset_id ?? null,
      id_code: form.id_code ?? null,
      name: form.name ?? null,
      brand: form.brand ?? null,
      model: form.model ?? null,
      vendor: form.vendor ?? null,
      serial: form.serial ?? null,
      department: form.department ?? null,
      branch: form.branch ?? null,
      location: form.location ?? null,
      purchase_date: form.purchase_date ?? null,
      price: form.price ?? null,
    }
    const { error } = await supabase.from('assets').insert([payload])
    if (error) return alert('บันทึกไม่สำเร็จ: ' + error.message)
    alert('บันทึกแล้ว')
    setForm({})
    loadAssets()
  }
  const delAsset = async (id: string) => {
    await supabase.from('assets').delete().eq('id', id)
    loadAssets()
  }

  
  // === Asset edit modal state ===
  const [editingAssetId, setEditingAssetId] = React.useState<string | null>(null)
  const [editAsset, setEditAsset] = React.useState<Partial<Asset>>({})

  const startEditAsset = (a: Asset) => {
    setEditingAssetId(a.id)
    setEditAsset({
      asset_id: a.asset_id,
      id_code: a.id_code,
      name: a.name,
      brand: a.brand,
      model: a.model,
      vendor: a.vendor,
      serial: a.serial,
      department: a.department,
      location: a.location,
      purchase_date: a.purchase_date,
      price: a.price,
    })
  }

  const cancelEditAsset = () => {
    setEditingAssetId(null)
    setEditAsset({})
  }

  const saveEditAsset = async () => {
    if (!editingAssetId) return
    const payload: any = {
      asset_id: editAsset.asset_id ?? null,
      id_code: editAsset.id_code ?? null,
      name: editAsset.name ?? null,
      brand: editAsset.brand ?? null,
      model: editAsset.model ?? null,
      vendor: editAsset.vendor ?? null,
      serial: editAsset.serial ?? null,
      department: editAsset.department ?? null,
      branch: editAsset.branch ?? null,
      location: editAsset.location ?? null,
      purchase_date: editAsset.purchase_date ?? null,
      price: editAsset.price ?? null,
    }
    const { error } = await supabase.from('assets').update(payload).eq('id', editingAssetId)
    if (error) { alert('บันทึกไม่สำเร็จ: ' + error.message); return }
    await loadAssets()
    cancelEditAsset()
  }
const [borrow, setBorrow] = React.useState<Partial<Borrow>>({ start_date: todayStr(), borrower_signature: '' })

  // === Borrow edit modal state ===
  const [editingBorrowId, setEditingBorrowId] = React.useState<string | null>(null)
  const [editBorrow, setEditBorrow] = React.useState<Partial<Borrow>>({})

  const startEditBorrow = (b: Borrow) => {
    setEditingBorrowId(b.id)
    setEditBorrow({
      borrower_name: b.borrower_name,
      borrower_dept: b.borrower_dept,
      borrower_branch: (b as any).borrower_branch,
      lender_name: b.lender_name,
      peripherals: b.peripherals,
      start_date: b.start_date,
      end_date: b.end_date ?? undefined,
    })
  }

  const cancelEditBorrow = () => {
    setEditingBorrowId(null)
    setEditBorrow({})
  }

  const saveEditBorrow = async () => {
    if (!editingBorrowId) return
    // validate date order
    if (editBorrow.start_date && editBorrow.end_date && parseDate(editBorrow.end_date) < parseDate(editBorrow.start_date)) { alert('วันที่คืนต้องไม่ก่อนวันที่ยืม'); return; }
    const payload: any = {
      borrower_name: editBorrow.borrower_name ?? null,
      borrower_dept: editBorrow.borrower_dept ?? null,
      borrower_branch: editBorrow.borrower_branch ?? null,
      lender_name: editBorrow.lender_name ?? null,
      peripherals: editBorrow.peripherals ?? null,
      start_date: editBorrow.start_date ?? null,
      end_date: editBorrow.end_date ?? null,
    }
    await supabase.from('borrows').update(payload).eq('id', editingBorrowId)
    await loadBorrows()
    cancelEditBorrow()
  }

  const addBorrow = async () => {
  if (!borrow.asset_id) return alert('เลือกเครื่องก่อน')
    if (!borrow.borrower_dept || !borrow.borrower_branch) { alert('ต้องเลือกแผนก/สาขาผู้ยืม'); return; };
  if (activeBorrowAssetIds.has(borrow.asset_id as string)) { alert('ยืมซ้ำไม่ได้: เครื่องนี้ยังไม่ได้คืน'); return; }

    // validate date order
    const s = borrow.start_date ?? todayStr();
    const e = borrow.end_date;
    if (e && parseDate(e) < parseDate(s)) { alert('วันที่คืนต้องไม่ก่อนวันที่ยืม'); return; }

    if (!borrow.asset_id) return alert('เลือกเครื่องก่อน')
    if (!borrow.borrower_dept || !borrow.borrower_branch) { alert('ต้องเลือกแผนก/สาขาผู้ยืม'); return; }
    const { error } = await supabase.from('borrows').insert([borrow])
    if (error) return alert('บันทึกไม่สำเร็จ: ' + error.message)
    alert('บันทึกยืมแล้ว')
    setBorrow({ start_date: todayStr(), borrower_signature: '' })
    loadBorrows()
  }
  const markReturned = async (id: string) => {
    await supabase.from('borrows').update({ returned: true, end_date: todayStr() }).eq('id', id)
    loadBorrows()
  }

  const [dateFrom, setDateFrom] = React.useState('')
  const [reportBranch, setReportBranch] = React.useState<string>('All')
  const [reportDept, setReportDept] = React.useState<string>('All')
  const [dateTo, setDateTo] = React.useState('')
  const reportRows = React.useMemo(() => {
  const from = dateFrom ? parseDate(dateFrom).getTime() : -Infinity;
  const to   = dateTo   ? parseDate(dateTo).getTime()   : Infinity;

  return borrows
    .filter(b => {
      const t = parseDate(b.start_date).getTime();
      const inRange = t >= from && t <= to;
      if (!inRange) return false;
      // เพิ่มเงื่อนไขกรอง แผนก/สาขา
      const a = assets.find(x => x.id === b.asset_id);
      const deptOk = reportDept === 'All' || b.borrower_dept === reportDept || (a?.department ?? '') === reportDept;
      const branchOk = reportBranch === 'All' || (b as any).borrower_branch === reportBranch || (a?.branch ?? '') === reportBranch;
      return deptOk && branchOk;
    })
    .map(b => {
      const a = assets.find(x => x.id === b.asset_id); // หา asset ครั้งเดียว
      return {
        id: b.id,
        start_date: b.start_date,

        // ✅ คอลัมน์ใหม่ที่อยากเพิ่มในรายงาน
        asset_id: a?.asset_id ?? "",   // เลขครุภัณฑ์
        id_code:  a?.id_code  ?? "",   // รหัสเครื่อง
        asset_name: a?.name   ?? "",   // เครื่อง (ชื่อเครื่อง)
        brand:    a?.brand    ?? "",
        model:    a?.model    ?? "",
        serial:   a?.serial   ?? "",   // S/N

        // ผู้ยืม/แผนก
        borrower_name: b.borrower_name ?? "",
        borrower_dept: b.borrower_dept ?? "",
        borrower_branch: (b as any).borrower_branch ?? "",
        asset_branch: a?.branch ?? "",

        // ลายเซ็น / สถานะคืน
        has_signature: b.borrower_signature ? "✔" : "✘",
        returned: !!b.returned,
        end_date: b.end_date ?? ""
      };
    });
}, [borrows, assets, dateFrom, dateTo, reportDept, reportBranch]);

  const exportXLSX = () => {
    const exportable = reportRows.map(({ borrower_signature, ...rest }) => rest)
    const ws = XLSX.utils.json_to_sheet(exportable)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, 'Report')
    XLSX.writeFile(wb, 'report.xlsx')
  }

    const [dashBranch, setDashBranch] = React.useState<string>('All')
  const [dashFrom, setDashFrom] = React.useState('')
  const [dashTo, setDashTo] = React.useState('')

const dashSeries = React.useMemo(() => {
    // build daily counts by start_date after filters
    const from = dashFrom ? new Date(dashFrom + 'T00:00:00').getTime() : -Infinity;
    const to = dashTo ? new Date(dashTo + 'T00:00:00').getTime() : Infinity;
    const counts: Record<string, number> = {};
    borrows.forEach(b => {
      const t = new Date(b.start_date + 'T00:00:00').getTime();
      if (t < from || t > to) return;
      // branch filter: match borrower_branch or asset.branch
      const a = assets.find(x => x.id === b.asset_id);
      const branchOk = dashBranch === 'All' || (b as any).borrower_branch === dashBranch || (a?.branch ?? '') === dashBranch;
      if (!branchOk) return;
      const d = b.start_date;
      counts[d] = (counts[d] || 0) + 1;
    });
    // convert to sorted array
    return Object.keys(counts).sort().map(d => ({ date: d, count: counts[d] }));
  }, [borrows, assets, dashBranch, dashFrom, dashTo]);

  const dashTotal = React.useMemo(() => dashSeries.reduce((sum,d)=>sum+d.count,0), [dashSeries]);
  const dashAvg = React.useMemo(() => dashSeries.length? dashTotal/dashSeries.length:0, [dashSeries,dashTotal]);

  const totalDash = React.useMemo(() => borrowTrendData.reduce((s, d) => (s as number) + (d as any).count, 0), [borrowTrendData]);
const avgDash = React.useMemo(() => borrowTrendData.length ? totalDash / borrowTrendData.length : 0, [borrowTrendData, totalDash]);

const borrowTrendData = React.useMemo(() => {
    const from = dashFrom ? parseDate(dashFrom).getTime() : -Infinity;
    const to   = dashTo   ? parseDate(dashTo).getTime()   : Infinity;
    const grouped: Record<string, number> = {};
    borrows.forEach(b => {
      const t = parseDate(b.start_date).getTime();
      if (t < from || t > to) return;
      const asset = assets.find(a => a.id === b.asset_id);
      if (dashBranch !== 'All') {
        const branchOk = (b as any).borrower_branch === dashBranch || (asset?.branch ?? '') === dashBranch;
        if (!branchOk) return;
      }
      const key = b.start_date;
      grouped[key] = (grouped[key]||0)+1;
    });
    return Object.entries(grouped).sort((a,b)=>a[0].localeCompare(b[0])).map(([date,count])=>({date,count})) || []; // fallback
  }, [borrows, assets, dashBranch, dashFrom, dashTo]);
const overdue = React.useMemo(() => {

  
const now = parseDate(todayStr()).getTime()
    return borrows.filter(b => !b.returned && (now - parseDate(b.start_date).getTime())/(1000*60*60*24) > 14)
  }, [borrows])

  return (
    <ErrorBoundary>
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 text-slate-800">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b">
  <div className="mx-auto max-w-6xl px-3 sm:px-4 py-3 flex items-center gap-3">
    <img src="/312501_logo_20220919143527.webp" alt="logo" className="w-9 h-9 rounded-xl object-contain border" />
    <h1 className="text-lg font-semibold">Chularat – Medical Pool</h1>
    <nav className="ml-auto flex gap-1 overflow-x-auto no-scrollbar">
      {[
        {k:'dashboard', label:'แดชบอร์ด', icon: <LayoutDashboard className="w-4 h-4" />},
        {k:'register', label:'ลงทะเบียน', icon: <Archive className="w-4 h-4" />},
        {k:'borrow', label:'บันทึกยืม/คืน', icon: <Undo2 className="w-4 h-4" />},
        {k:'report', label:'รายงาน', icon: <FileBarChart2 className="w-4 h-4" />},
        {k:'settings', label:'ตั้งค่า', icon: <SettingsIcon className="w-4 h-4" />},
      ].map((t:any) => (
        <button key={t.k} onClick={() => setTab(t.k as any)}
          className={`px-3 py-1.5 rounded-xl text-sm border ${tab===t.k?'bg-blue-600 text-white border-blue-600':'bg-white hover:bg-slate-50'}`}>
          <span className="inline-flex items-center gap-1">{t.icon} {t.label}</span>
        </button>
      ))}
    </nav>
    <button onClick={async()=>{await supabase.auth.signOut(); location.reload();}} className="ml-2 px-3 py-1.5 rounded-xl text-sm border bg-white hover:bg-slate-50">ออกจากระบบ</button>
  </div>
</header>

      <main className="mx-auto max-w-6xl px-3 sm:px-4 py-6 space-y-6">
        {tab==='dashboard' && (
          <section className="grid md:grid-cols-3 gap-4">
            <div className="bg-white border rounded-2xl p-4 shadow-soft">
              <div className="text-sm text-slate-600">จำนวนเครื่อง</div>
              <div className="text-2xl font-semibold">{assets.length}</div>
            </div>
            <div className="bg-white border rounded-2xl p-4 shadow-soft">
              <div className="text-sm text-slate-600">กำลังยืม</div>
              <div className="text-2xl font-semibold">{borrows.filter(b=>!b.returned).length}</div>
            </div>
            <div className="bg-white border rounded-2xl p-4 shadow-soft">
              <div className="text-sm text-slate-600">เกินกำหนด 14 วัน</div>
              <div className="text-2xl font-semibold text-red-600">{overdue.length}</div>
            </div>

            <div className="md:col-span-3 bg-white border rounded-2xl p-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2"><AlertTriangle className="text-red-600" /> รายการเกิน 14 วัน</h3>
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100 sticky top-0">
                    <tr>
    <th className="text-left px-3 py-2">เลขครุภัณฑ์</th>
    <th className="text-left px-3 py-2">รหัสเครื่อง</th>
    <th className="text-left px-3 py-2">เครื่อง</th>
    <th className="text-left px-3 py-2">ยี่ห้อ</th>
    <th className="text-left px-3 py-2">รุ่น</th>
    <th className="text-left px-3 py-2">S/N</th>
    <th className="text-left px-3 py-2">ผู้ยืม</th>
    <th className="text-left px-3 py-2">แผนก</th>
    <th className="text-left px-3 py-2">วันที่ยืม</th>
    <th className="text-left px-3 py-2">คืน</th>
                    </tr>
                  </thead>
                  <tbody>
                    {overdue.map(b => (
                      <tr key={b.id} className="border-b hover:bg-slate-50">
                        <td className="px-3 py-2">
      {b.returned ? (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs">✔ คืนแล้ว</span>
          <button onClick={() => startEditBorrow(b)} className="ml-2 px-2 py-1 rounded bg-slate-600 text-white text-xs">แก้ไข</button>
        </div>
      ) : (
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-rose-100 text-rose-700 text-xs">✘ ยังไม่คืน</span>
          <button onClick={() => markReturned(b.id)} className="px-2 py-1 rounded-lg bg-emerald-600 text-white text-xs">ทำเครื่องหมายคืนแล้ว</button>
          <button onClick={() => startEditBorrow(b)} className="px-2 py-1 rounded bg-slate-600 text-white text-xs">แก้ไข</button>
        </div>
      )}
    </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              

          <section className="md:col-span-3 bg-white border rounded-2xl p-4">
            <h3 className="font-semibold mb-3">สถิติการยืม</h3>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <Select label="สาขา" value={dashBranch} onChange={setDashBranch} options={['All', ...branchOpts]} />
              <Text label="จากวันที่" type="date" value={dashFrom} onChange={setDashFrom} />
              <Text label="ถึงวันที่" type="date" value={dashTo} onChange={setDashTo} />
            </div>
            <div style={{width:'100%', height:300}}>
              {/* Inline SVG chart */}
              <BorrowLineChart data={borrowTrendData as any} />
            </div>
          </section></div>
            </div>
          </section>
        )}

        {tab==='register' && (
          <section className="bg-white border rounded-2xl p-4 shadow-soft space-y-4">
            <h2 className="text-lg font-semibold">หน้าลงทะเบียน</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <Text label="เลขครุภัณฑ์ (Asset ID)" value={form.asset_id} onChange={v=>setForm(p=>({...p, asset_id:v}))} />
              <Text label="รหัสเครื่อง (ID CODE)" value={form.id_code} onChange={v=>setForm(p=>({...p, id_code:v}))} />
              <Text label="ชื่อเครื่องมือ" value={form.name} onChange={v=>setForm(p=>({...p, name:v}))} />

              <Select label="ยี่ห้อ" value={form.brand} onChange={v=>setForm(p=>({...p, brand:v}))} options={brandOpts} />
              <Select label="รุ่น" value={form.model} onChange={v=>setForm(p=>({...p, model:v}))} options={modelOpts} />
              <Select label="บริษัทผู้ขาย" value={form.vendor} onChange={v=>setForm(p=>({...p, vendor:v}))} options={vendorOpts} />

              <Text label="S/N" value={form.serial} onChange={v=>setForm(p=>({...p, serial:v}))} />
              <Select label="แผนก" value={form.department} onChange={v=>setForm(p=>({...p, department:v}))} options={deptOpts} />
              <Select label="สาขา" value={form.branch} onChange={v=>setForm(p=>({...p, branch:v}))} options={branchOpts} />
              <Select label="สถานที่/อาคาร" value={form.location} onChange={v=>setForm(p=>({...p, location:v}))} options={locOpts} />
              <Text label="วันที่ซื้อ" type="date" value={form.purchase_date} onChange={v=>setForm(p=>({...p, purchase_date:v}))} />
              <Text label="ราคา (บาท)" value={form.price} onChange={v=>setForm(p=>({...p, price:v}))} />
            </div>

            <div className="flex gap-2">
              <button onClick={addAsset} className="px-4 py-2 rounded-xl bg-blue-600 text-white">บันทึก</button>
              <button onClick={() => setForm({})} className="px-4 py-2 rounded-xl bg-slate-200">ล้างฟอร์ม</button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                    <th className="px-3 py-2 text-left">ครุภัณฑ์/รหัส</th>
                    <th className="px-3 py-2 text-left">ชื่อเครื่อง</th>
                    <th className="px-3 py-2 text-left">ผู้ขาย</th>
                    <th className="px-3 py-2 text-left hidden md:table-cell">ยี่ห้อ/รุ่น</th>
                    <th className="px-3 py-2 text-left hidden md:table-cell">S/N</th>
                    <th className="px-3 py-2 text-left hidden sm:table-cell">แผนก</th>
                    <th className="px-3 py-2 text-left hidden sm:table-cell">สาขา</th>
                    <th className="px-3 py-2 text-left">สถานที่</th>
                    <th className="px-3 py-2 text-left">แก้ไข/ลบ</th>
                  </tr>
                </thead>
                <tbody>
                  {assets.map(a => (
                    <tr key={a.id} className="border-b hover:bg-slate-50">
                      <td className="px-3 py-2">{a.asset_id || "-"}{a.id_code ? ` / ${a.id_code}` : ""}</td>
                      <td className="px-3 py-2">{a.name || "-"}</td>
                      <td className="px-3 py-2">{a.vendor || "-"}</td>
                      <td className="px-3 py-2 hidden md:table-cell">{[a.brand, a.model].filter(Boolean).join(" / ") || "-"}</td>
                      <td className="px-3 py-2 hidden md:table-cell">{a.serial || "-"}</td>
                      <td className="px-3 py-2 hidden sm:table-cell">{a.department || "-"}</td>
                      <td className="px-3 py-2 hidden sm:table-cell">{a.branch || "-"}</td>
                      <td className="px-3 py-2">{a.location || "-"}</td>
                      <td className="px-3 py-2">
  <div className="flex items-center gap-2">
    <button onClick={() => startEditAsset(a)} className="px-2 py-1 rounded-lg bg-amber-500 text-white text-xs inline-flex items-center gap-1">
      <EditIcon className="w-3 h-3" /> แก้ไข
    </button>
    <button onClick={() => delAsset(a.id)} className="px-2 py-1 rounded-lg bg-rose-600 text-white text-xs inline-flex items-center gap-1">
      <Trash2 className="w-3 h-3" /> ลบ
    </button>
  </div>
</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {tab==='borrow' && (
          <section className="bg-white border rounded-2xl p-4 shadow-soft space-y-4">
            <h2 className="text-lg font-semibold">บันทึกยืม/คืน</h2>
            <div className="grid md:grid-cols-2 gap-4">
              <label className="block">
                <span className="block text-xs text-slate-600 mb-1">เลือกเครื่อง</span>
                <select value={borrow.asset_id ?? ''} onChange={(e)=>{
                  const id = e.target.value;
                  if (id && activeBorrowAssetIds.has(id)) {
                    alert('เครื่องนี้ติดยืมอยู่ — ยืมซ้ำไม่ได้');
                    setBorrow(p=>({ ...p, asset_id: '' }));
                    return;
                  }
                  setBorrow(p=>({ ...p, asset_id: id }));
                }} className="w-full px-3 py-2.5 border rounded-xl bg-white">
                  <option value="">-- เลือก --</option>
                  {assets.map(a => <option key={a.id} value={a.id}>{a.name} — {a.serial}</option>)}
                </select>
              </label>
              <Text label="ผู้ยืม" value={borrow.borrower_name ?? ''} onChange={v=>setBorrow(p=>({...p, borrower_name:v}))} />
              <Select label="แผนกผู้ยืม" value={borrow.borrower_dept ?? ''} onChange={v=>setBorrow(p=>({...p, borrower_dept:v}))} options={deptOpts} />
              <Select label="สาขาผู้ยืม" value={borrow.borrower_branch ?? ''} onChange={v=>setBorrow(p=>({...p, borrower_branch:v}))} options={branchOpts} />
              <Text label="ผู้ให้ยืม" value={borrow.lender_name ?? ''} onChange={v=>setBorrow(p=>({...p, lender_name:v}))} />
              <Text label="อุปกรณ์เสริมที่ให้ไป" value={borrow.peripherals ?? ''} onChange={v=>setBorrow(p=>({...p, peripherals:v}))} />
              <Text label="วันที่ยืม" type="date" value={borrow.start_date ?? todayStr()} onChange={v=>setBorrow(p=>({...p, start_date:v}))} />
              <Text label="วันที่คืน (ถ้ามี)" type="date" min={borrow.start_date ?? ''} value={borrow.end_date ?? ''} onChange={v=>setBorrow(p=>({...p, end_date:v}))} />

              <div className="md:col-span-2">
                <span className="block text-xs text-slate-600 mb-1">ลายเซ็นผู้ขอยืม</span>
                <SignaturePad
                  value={borrow.borrower_signature ?? ''}
                  onChange={(dataUrl) => setBorrow(p => ({ ...p, borrower_signature: dataUrl }))}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={addBorrow} className="px-4 py-2 rounded-xl bg-blue-600 text-white" disabled={!borrow.asset_id || activeBorrowAssetIds.has(borrow.asset_id as string)}>บันทึกยืม</button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 sticky top-0">
                  <tr>
                        <th className="px-3 py-2 text-left">วันที่ยืม</th>
                        <th className="px-3 py-2 text-left">ครุภัณฑ์/รหัส</th>
                        <th className="px-3 py-2 text-left">เครื่อง</th>
                        <th className="px-3 py-2 text-left hidden md:table-cell">ยี่ห้อ/รุ่น</th>
                        <th className="px-3 py-2 text-left hidden md:table-cell">S/N</th>
                        <th className="px-3 py-2 text-left">ผู้ยืม</th>
                        <th className="px-3 py-2 text-left hidden sm:table-cell">แผนก</th>
                        <th className="px-3 py-2 text-left hidden sm:table-cell">สาขา</th>
                        <th className="px-3 py-2 text-left hidden md:table-cell">มีลายเซ็น</th>
                        <th className="px-3 py-2 text-left">คืน</th>
                  </tr>
                </thead>
<tbody>
  {borrows.map(b => {
    const asset = assets.find(a => a.id === b.asset_id)
    return (
      <tr key={b.id} className="border-b hover:bg-slate-50">
        <td className="px-3 py-2">{formatDate(b.start_date)}</td>
        <td className="px-3 py-2">{asset?.asset_id ? asset.asset_id : '-'}{asset?.id_code ? ` / ${asset.id_code}` : ""}</td>
        <td className="px-3 py-2">{asset?.name}</td>
        <td className="px-3 py-2 hidden md:table-cell">{[asset?.brand, asset?.model].filter(Boolean).join(" / ")}</td>
        <td className="px-3 py-2 hidden md:table-cell">{asset?.serial || "-"}</td>
        <td className="px-3 py-2">{b.borrower_name}</td>
        <td className="px-3 py-2 hidden sm:table-cell">{b.borrower_dept}</td>
        <td className="px-3 py-2 hidden sm:table-cell">{(b as any).borrower_branch ?? '-'}</td>
        <td className="px-3 py-2 hidden md:table-cell">
          {b.borrower_signature ? <span className="text-green-600">✔</span> : <span className="text-red-600">✘</span>}
        </td>
        <td className="px-3 py-2">
  {b.returned ? (
    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-100 text-emerald-700 text-xs">✔ คืนแล้ว</span>
  ) : (
    <details className="relative">
      <summary className="px-2 py-1 rounded-lg border cursor-pointer select-none">⋮</summary>
      <div className="absolute right-0 mt-1 w-44 bg-white border rounded-lg shadow z-10">
        <button onClick={() => markReturned(b.id)} className="w-full text-left px-3 py-2 hover:bg-slate-50">ทำเครื่องหมายคืนแล้ว</button>
        <button onClick={() => startEditBorrow(b)} className="w-full text-left px-3 py-2 hover:bg-slate-50">แก้ไข</button>
      </div>
    </details>
  )}
</td>
      		</tr>
   	 	)
  		})}
		</tbody>
              </table>
            </div>
          </section>
        )}

        {tab==='report' && (
          <section className="bg-white border rounded-2xl p-4 shadow-soft space-y-4">
            <h2 className="text-lg font-semibold">รายงาน</h2>
            <div className="grid md:grid-cols-6 gap-4">
              <Text label="จากวันที่" type="date" value={dateFrom} onChange={setDateFrom} />
              <Text label="ถึงวันที่" type="date" value={dateTo} onChange={setDateTo} />
              <Select label="แผนก (กรอง)" value={reportDept} onChange={v=>setReportDept(v)} options={["All", ...deptOpts]} />
              <Select label="สาขา (กรอง)" value={reportBranch} onChange={v=>setReportBranch(v)} options={["All", ...branchOpts]} />
              <button onClick={exportXLSX} className="px-4 py-2 rounded-xl bg-emerald-600 text-white inline-flex items-center gap-2"><Download className="w-4 h-4"/> Export Excel (.xlsx)</button>
              <button onClick={() => window.print()} className="px-4 py-2 rounded-xl bg-slate-200 inline-flex items-center gap-2"><Printer className="w-4 h-4"/> พิมพ์</button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100 sticky top-0">
  <tr>
    <th className="px-3 py-2 text-left">วันที่ยืม</th>
    <th className="px-3 py-2 text-left">ครุภัณฑ์/รหัส</th>
    <th className="px-3 py-2 text-left">เครื่อง</th>
    <th className="px-3 py-2 text-left hidden md:table-cell">ยี่ห้อ/รุ่น</th>
    <th className="px-3 py-2 text-left hidden md:table-cell">S/N</th>
    <th className="px-3 py-2 text-left">ผู้ยืม</th>
    <th className="px-3 py-2 text-left hidden sm:table-cell">แผนก</th>
    <th className="px-3 py-2 text-left hidden sm:table-cell">สาขา (ผู้ยืม)</th>
    <th className="px-3 py-2 text-left hidden sm:table-cell">สาขา (เครื่อง)</th>
    <th className="px-3 py-2 text-left hidden md:table-cell">มีลายเซ็น</th>
    <th className="px-3 py-2 text-left">คืน</th>
  </tr>
</thead>

<tbody>
  {reportRows.map(r => (
    <tr key={r.id} className="border-b hover:bg-slate-50">
      <td className="px-3 py-2">{formatDate(r.start_date)}</td>
      <td className="px-3 py-2">{r.asset_id ? r.asset_id : "-"}{r.id_code ? " / " + r.id_code : ""}</td>
      <td className="px-3 py-2">{r.asset_name}</td>
      <td className="px-3 py-2 hidden md:table-cell">{[r.brand, r.model].filter(Boolean).join(" / ")}</td>
      <td className="px-3 py-2 hidden md:table-cell">{r.serial || "-"}</td>
      <td className="px-3 py-2">{r.borrower_name}</td>
      <td className="px-3 py-2 hidden sm:table-cell">{r.borrower_dept || "-"}</td>
      <td className="px-3 py-2 hidden sm:table-cell">{r.borrower_branch || "-"}</td>
      <td className="px-3 py-2 hidden sm:table-cell">{r.asset_branch || "-"}</td>
      <td className="px-3 py-2 hidden md:table-cell">{r.has_signature === "✔" ? "✔" : "✘"}</td>
      <td className="px-3 py-2">{r.returned ? "✔" : "✘"}</td>
    </tr>
  ))}
</tbody>
              </table>
            </div>
          </section>
        )}

        {tab==='settings' && (
          <section className="bg-white border rounded-2xl p-4 shadow-soft space-y-6">
            <h2 className="text-lg font-semibold">ตั้งค่า (แก้ได้จริง)</h2>
            <div className="grid md:grid-cols-2 gap-6">
              <OptionEditor table="brands" title="ยี่ห้อ" />
              <OptionEditor table="vendors" title="บริษัทผู้ขาย" />
              <OptionEditor table="models" title="รุ่น" />
              <OptionEditor table="departments" title="แผนก" />
              <OptionEditor table="branches" title="สาขา" />
              <OptionEditor table="locations" title="สถานที่/อาคาร" />
            </div>
            <p className="text-xs text-slate-500">* ถ้าเมนูดรอปดาวไม่ขึ้นรายการ ให้กลับไปหน้า ลงทะเบียน แล้วกดรีเฟรชเพื่อโหลดรายการล่าสุด</p>
          </section>
        )}
      
      {/* Edit Borrow Modal */}
      {editingBorrowId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-lg p-4 w-full max-w-xl space-y-3">
            <h3 className="text-lg font-semibold">แก้ไขรายการยืม/คืน</h3>
            <div className="grid md:grid-cols-2 gap-3">
              <label className="text-sm">ผู้ยืม
                <input className="mt-1 w-full border rounded px-2 py-1" value={editBorrow.borrower_name ?? ''} onChange={e=>setEditBorrow(p=>({...p, borrower_name: e.target.value}))} />
              </label>
              <label className="text-sm">แผนกผู้ยืม
                <input className="mt-1 w-full border rounded px-2 py-1" value={editBorrow.borrower_dept ?? ''} onChange={e=>setEditBorrow(p=>({...p, borrower_dept: e.target.value}))} />
              </label>
              <label className="text-sm">สาขาผู้ยืม
                <select className="mt-1 w-full border rounded px-2 py-1" value={editBorrow.borrower_branch ?? ''} onChange={e=>setEditBorrow(p=>({...p, borrower_branch: e.target.value}))}>
                  <option value="">-- เลือก --</option>
                  {branchOpts.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
              </label>
              <label className="text-sm">ผู้ปล่อยยืม (ผู้รับผิดชอบ)
                <input className="mt-1 w-full border rounded px-2 py-1" value={editBorrow.lender_name ?? ''} onChange={e=>setEditBorrow(p=>({...p, lender_name: e.target.value}))} />
              </label>
              <label className="text-sm">อุปกรณ์ที่ติดไป
                <input className="mt-1 w-full border rounded px-2 py-1" value={editBorrow.peripherals ?? ''} onChange={e=>setEditBorrow(p=>({...p, peripherals: e.target.value}))} placeholder="เช่น สายไฟ x1, เซ็นเซอร์ x2" />
              </label>
              <label className="text-sm">วันที่ยืม
                <input type="date" className="mt-1 w-full border rounded px-2 py-1" value={editBorrow.start_date ?? ''} onChange={e=>setEditBorrow(p=>({...p, start_date: e.target.value}))} />
              </label>
              <label className="text-sm">วันที่คืน (ถ้ามี)
                <input type="date" className="mt-1 w-full border rounded px-2 py-1" min={editBorrow.start_date ?? ''} value={editBorrow.end_date ?? ''} onChange={e=>setEditBorrow(p=>({...p, end_date: e.target.value}))} />
              </label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={cancelEditBorrow} className="px-3 py-1 rounded border">ยกเลิก</button>
              <button onClick={saveEditBorrow} className="px-3 py-1 rounded bg-emerald-600 text-white">บันทึก</button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Asset Modal */}
      {editingAssetId && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl shadow-lg p-4 w-full max-w-2xl space-y-4">
            <h3 className="text-lg font-semibold">แก้ไขข้อมูลเครื่อง</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <Text label="เลขครุภัณฑ์ (Asset ID)" value={editAsset.asset_id as any} onChange={v=>setEditAsset(p=>({...p, asset_id:v}))} />
              <Text label="รหัสเครื่อง (ID CODE)" value={editAsset.id_code as any} onChange={v=>setEditAsset(p=>({...p, id_code:v}))} />
              <Text label="ชื่อเครื่องมือ" value={editAsset.name as any} onChange={v=>setEditAsset(p=>({...p, name:v}))} />

              <Select label="ยี่ห้อ" value={editAsset.brand as any} onChange={v=>setEditAsset(p=>({...p, brand:v}))} options={brandOpts} />
              <Select label="รุ่น" value={editAsset.model as any} onChange={v=>setEditAsset(p=>({...p, model:v}))} options={modelOpts} />
              <Select label="บริษัทผู้ขาย" value={editAsset.vendor as any} onChange={v=>setEditAsset(p=>({...p, vendor:v}))} options={vendorOpts} />

              <Text label="S/N" value={editAsset.serial as any} onChange={v=>setEditAsset(p=>({...p, serial:v}))} />
              <Select label="แผนก" value={editAsset.department as any} onChange={v=>setEditAsset(p=>({...p, department:v}))} options={deptOpts} />
              <Select label="สาขา" value={editAsset.branch as any} onChange={v=>setEditAsset(p=>({...p, branch:v}))} options={branchOpts} />
              <Select label="สถานที่/อาคาร" value={editAsset.location as any} onChange={v=>setEditAsset(p=>({...p, location:v}))} options={locOpts} />
              <Text label="วันที่ซื้อ" type="date" value={editAsset.purchase_date as any} onChange={v=>setEditAsset(p=>({...p, purchase_date:v}))} />
              <Text label="ราคา (บาท)" value={editAsset.price as any} onChange={v=>setEditAsset(p=>({...p, price:v}))} />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button onClick={cancelEditAsset} className="px-3 py-1.5 rounded-lg border">ยกเลิก</button>
              <button onClick={saveEditAsset} className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white">บันทึก</button>
            </div>
          </div>
        </div>
      )}
</main>
    </div>
    </ErrorBoundary>
  )
}
