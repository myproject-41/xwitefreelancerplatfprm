'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { escrowService } from '@/services/escrow.service'
import { walletService } from '@/services/wallet.service'
import { uploadService } from '@/services/upload.service'
import { useAuthStore } from '@/store/authStore'

/* ══════════════════════════════════════
   TYPES
══════════════════════════════════════ */
type EscrowStatus = 'CREATED' | 'FUNDED' | 'IN_PROGRESS' | 'REVIEW' | 'REVISION' | 'RELEASED' | 'DISPUTED' | 'REFUNDED'

interface EscrowData {
  id: string
  status: EscrowStatus
  amount: number
  platformFee: number
  disputeReason?: string
  revisionNote?: string
  revisionImage?: string
  revisionCount?: number
  releasedAt?: string
  createdAt: string
  updatedAt: string
  task: { id: string; title: string; description: string; budget: number; deadline?: string; submissionNote?: string; submissionFiles?: string[] }
  client: {
    id: string; role: string
    clientProfile?:  { fullName?: string; profileImage?: string; companyName?: string }
    companyProfile?: { companyName?: string; profileImage?: string }
  }
  freelancer: {
    id: string; role: string
    freelancerProfile?: { fullName?: string; profileImage?: string; title?: string }
  }
}

/* ══════════════════════════════════════
   STYLES
══════════════════════════════════════ */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
@keyframes ep-spin{to{transform:rotate(360deg);}}
@keyframes ep-shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
.ep-skel{background:linear-gradient(90deg,#e8eaed 25%,#f5f5f5 50%,#e8eaed 75%);background-size:1200px 100%;animation:ep-shimmer 1.4s ease infinite;}

.ep-page{min-height:100vh;background:#EDF1F7;font-family:'Inter',sans-serif;padding:28px 16px 80px;}
.ep-wrap{max-width:860px;margin:0 auto;}

/* back */
.ep-back{display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:600;color:#64748b;cursor:pointer;margin-bottom:18px;background:none;border:none;font-family:'Inter',sans-serif;transition:color .15s;}
.ep-back:hover{color:#0077b5;}

/* header card */
.ep-hdr{background:#fff;border-radius:20px;padding:22px 24px 18px;box-shadow:0 2px 20px rgba(0,0,0,0.08);margin-bottom:14px;}
.ep-hdr-top{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap;}
.ep-task-title{font-size:20px;font-weight:800;color:#0D1B2A;line-height:1.3;letter-spacing:-0.02em;}
.ep-task-desc{font-size:13px;color:#64748b;margin-top:6px;line-height:1.6;}
.ep-id{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-top:8px;}

/* status badge */
.ep-badge{display:inline-flex;align-items:center;gap:5px;padding:6px 13px;border-radius:999px;font-size:11px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;flex-shrink:0;}
.ep-badge.CREATED   {background:#f1f5f9;color:#475569;border:1.5px solid #cbd5e1;}
.ep-badge.FUNDED    {background:#dbeafe;color:#1e40af;border:1.5px solid #93c5fd;}
.ep-badge.IN_PROGRESS{background:#dbeafe;color:#1e40af;border:1.5px solid #93c5fd;}
.ep-badge.REVIEW    {background:#fef9c3;color:#854d0e;border:1.5px solid #fde047;}
.ep-badge.REVISION  {background:#fff7ed;color:#c2410c;border:1.5px solid #fdba74;}
.ep-badge.RELEASED  {background:#dcfce7;color:#15803d;border:1.5px solid #86efac;}
.ep-badge.DISPUTED  {background:#fee2e2;color:#991b1b;border:1.5px solid #fca5a5;}
.ep-badge.REFUNDED  {background:#f3f4f6;color:#6b7280;border:1.5px solid #d1d5db;}
.ep-badge-dot{width:7px;height:7px;border-radius:50%;background:currentColor;}

/* timeline */
.ep-timeline{display:flex;align-items:center;gap:0;margin-top:20px;overflow-x:auto;padding-bottom:4px;}
.ep-tl-step{display:flex;flex-direction:column;align-items:center;gap:5px;flex:1;min-width:64px;}
.ep-tl-circle{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:800;flex-shrink:0;transition:all .2s;}
.ep-tl-circle.done{background:#0077b5;color:#fff;}
.ep-tl-circle.active{background:#fff;border:2.5px solid #0077b5;color:#0077b5;}
.ep-tl-circle.pending{background:#f1f5f9;border:2px solid #e2e8f0;color:#94a3b8;}
.ep-tl-circle.dispute{background:#fee2e2;border:2px solid #fca5a5;color:#dc2626;}
.ep-tl-label{font-size:10px;font-weight:600;color:#94a3b8;text-align:center;white-space:nowrap;}
.ep-tl-label.done{color:#0077b5;}
.ep-tl-label.active{color:#0077b5;font-weight:800;}
.ep-tl-connector{flex:1;height:2px;background:#e2e8f0;margin-bottom:18px;}
.ep-tl-connector.done{background:#0077b5;}

/* two-col layout */
.ep-cols{display:grid;grid-template-columns:1fr 340px;gap:14px;align-items:start;}
@media(max-width:720px){.ep-cols{grid-template-columns:1fr;}}

/* card */
.ep-card{background:#fff;border-radius:16px;box-shadow:0 1px 8px rgba(0,0,0,0.06);overflow:hidden;margin-bottom:14px;}
.ep-card-hdr{padding:14px 18px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;font-weight:800;color:#0D1B2A;text-transform:uppercase;letter-spacing:.06em;}
.ep-card-body{padding:16px 18px;}

/* party */
.ep-party{display:flex;align-items:center;gap:12px;}
.ep-party-avatar{width:44px;height:44px;border-radius:12px;overflow:hidden;background:#dde4ea;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.ep-party-avatar img{width:100%;height:100%;object-fit:cover;}
.ep-party-name{font-size:14px;font-weight:700;color:#0D1B2A;}
.ep-party-role{font-size:11px;color:#64748b;margin-top:1px;}
.ep-party-you{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;color:#0077b5;background:#e8f4fd;padding:2px 7px;border-radius:999px;margin-left:6px;}
.ep-divider{height:1px;background:#f1f5f9;margin:14px 0;}

/* amount */
.ep-amount-row{display:flex;align-items:center;justify-content:space-between;padding:8px 0;}
.ep-amount-lbl{font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em;}
.ep-amount-val{font-size:15px;font-weight:800;color:#0D1B2A;}
.ep-amount-total{font-size:22px;font-weight:800;color:#0077b5;}
.ep-free-chip{display:inline-flex;align-items:center;gap:4px;background:#dcfce7;color:#15803d;font-size:10px;font-weight:800;padding:3px 9px;border-radius:999px;letter-spacing:.03em;}

/* action panel */
.ep-action-card{background:#fff;border-radius:16px;box-shadow:0 1px 8px rgba(0,0,0,0.06);padding:20px;position:sticky;top:20px;z-index:10;}
.ep-action-title{font-size:14px;font-weight:800;color:#0D1B2A;margin-bottom:14px;}
.ep-action-note{font-size:12px;color:#64748b;line-height:1.6;margin-bottom:16px;background:#f8fafc;border-radius:10px;padding:10px 12px;border-left:3px solid #0077b5;}
.ep-action-note.warn{border-left-color:#f59e0b;background:#fffbeb;}
.ep-action-note.danger{border-left-color:#ef4444;background:#fef2f2;}
.ep-action-note.success{border-left-color:#22c55e;background:#f0fdf4;}
.ep-action-note.dispute{border-left-color:#ef4444;background:#fef2f2;}

/* buttons */
.ep-btn{width:100%;padding:13px;border-radius:12px;font-size:14px;font-weight:800;cursor:pointer;font-family:'Inter',sans-serif;border:none;transition:all .15s;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:10px;}
.ep-btn:last-child{margin-bottom:0;}
.ep-btn:active:not(:disabled){transform:scale(.98);}
.ep-btn:disabled{opacity:.55;cursor:not-allowed;}
.ep-btn-primary{background:#0077b5;color:#fff;box-shadow:0 3px 14px rgba(0,119,181,0.28);}
.ep-btn-primary:hover:not(:disabled){background:#005d8f;}
.ep-btn-success{background:#16a34a;color:#fff;box-shadow:0 3px 14px rgba(22,163,74,0.25);}
.ep-btn-success:hover:not(:disabled){background:#15803d;}
.ep-btn-outline{background:#fff;color:#64748b;border:1.5px solid #e2e8f0;}
.ep-btn-outline:hover:not(:disabled){border-color:#0077b5;color:#0077b5;}
.ep-btn-danger{background:#fff;color:#dc2626;border:1.5px solid #fca5a5;}
.ep-btn-danger:hover:not(:disabled){background:#fef2f2;}
.ep-btn-ghost{background:#f8fafc;color:#475569;}
.ep-btn-ghost:hover:not(:disabled){background:#f1f5f9;}

/* wallet balance inside action */
.ep-wallet-row{display:flex;align-items:center;justify-content:space-between;background:#f0f9ff;border-radius:10px;padding:10px 12px;margin-bottom:14px;}
.ep-wallet-lbl{font-size:11px;font-weight:700;color:#0369a1;text-transform:uppercase;letter-spacing:.04em;}
.ep-wallet-val{font-size:15px;font-weight:800;color:#0D1B2A;}

/* dispute modal */
.ep-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.4);backdrop-filter:blur(3px);z-index:900;display:flex;align-items:center;justify-content:center;padding:16px;}
.ep-modal{background:#fff;border-radius:20px;padding:24px;width:100%;max-width:440px;box-shadow:0 20px 60px rgba(0,0,0,0.2);}
.ep-modal-title{font-size:17px;font-weight:800;color:#0D1B2A;margin-bottom:8px;}
.ep-modal-desc{font-size:13px;color:#64748b;line-height:1.6;margin-bottom:16px;}
.ep-modal-textarea{width:100%;border:1.5px solid #e2e8f0;border-radius:12px;padding:12px;font-size:13px;font-family:'Inter',sans-serif;resize:vertical;min-height:100px;outline:none;color:#0D1B2A;transition:border-color .15s;}
.ep-modal-textarea:focus{border-color:#0077b5;}
.ep-modal-actions{display:flex;gap:10px;margin-top:14px;}
.ep-modal-actions .ep-btn{margin-bottom:0;}

/* spinner */
.ep-spin{width:16px;height:16px;border-radius:50%;border:2.5px solid rgba(255,255,255,0.35);border-top-color:#fff;animation:ep-spin .7s linear infinite;flex-shrink:0;}
.ep-spin-dark{width:16px;height:16px;border-radius:50%;border:2.5px solid rgba(0,119,181,0.2);border-top-color:#0077b5;animation:ep-spin .7s linear infinite;flex-shrink:0;}

/* file upload */
.ep-dropzone{border:2px dashed #bdd8f0;border-radius:14px;padding:24px;text-align:center;cursor:pointer;transition:all .15s;background:#f8fafc;}
.ep-dropzone:hover,.ep-dropzone.over{border-color:#0077b5;background:#f0f7ff;}
.ep-file-list{margin-top:12px;display:flex;flex-direction:column;gap:8px;}
.ep-file-item{display:flex;align-items:center;gap:10px;background:#f0f7ff;border:1px solid #bdd8f0;border-radius:10px;padding:8px 12px;}
.ep-file-name{flex:1;font-size:12px;font-weight:600;color:#0D1B2A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.ep-file-size{font-size:11px;color:#94a3b8;flex-shrink:0;}
.ep-file-remove{width:20px;height:20px;border-radius:50%;background:#fee2e2;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#dc2626;font-size:14px;flex-shrink:0;line-height:1;}
.ep-file-progress{height:3px;background:#e2e8f0;border-radius:2px;margin-top:4px;overflow:hidden;}
.ep-file-progress-bar{height:100%;background:#0077b5;transition:width .2s;}

/* submitted deliverables */
.ep-deliverable{display:flex;align-items:center;gap:10px;padding:10px 12px;background:#f0f7ff;border:1px solid #bdd8f0;border-radius:10px;margin-bottom:8px;}
.ep-deliverable:last-child{margin-bottom:0;}
.ep-deliverable-icon{width:32px;height:32px;border-radius:8px;background:#0077b5;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.ep-deliverable-name{flex:1;font-size:13px;font-weight:600;color:#0D1B2A;word-break:break-all;}
.ep-deliverable-dl{font-size:12px;font-weight:700;color:#0077b5;text-decoration:none;flex-shrink:0;padding:4px 10px;background:#fff;border:1.5px solid #bdd8f0;border-radius:8px;}
.ep-deliverable-dl:hover{background:#e8f4fd;}

/* revision request card */
.ep-revision{background:#fff7ed;border:1.5px solid #fdba74;border-radius:14px;padding:16px 18px;margin-bottom:14px;}
.ep-revision-title{font-size:13px;font-weight:800;color:#c2410c;margin-bottom:10px;display:flex;align-items:center;gap:6px;}
.ep-revision-note{font-size:13px;color:#374151;line-height:1.65;white-space:pre-wrap;background:#fff;border-radius:10px;padding:10px 14px;border:1px solid #fed7aa;}
.ep-revision-img{margin-top:10px;border-radius:10px;overflow:hidden;border:1px solid #fed7aa;max-width:100%;}
.ep-revision-img img{width:100%;max-height:320px;object-fit:contain;display:block;}

/* history */
.ep-history-item{display:flex;gap:10px;padding:10px 0;border-bottom:1px solid #f8fafc;}
.ep-history-item:last-child{border-bottom:none;}
.ep-history-dot{width:8px;height:8px;border-radius:50%;background:#0077b5;flex-shrink:0;margin-top:5px;}
.ep-history-dot.warn{background:#f59e0b;}
.ep-history-dot.danger{background:#ef4444;}
.ep-history-dot.success{background:#22c55e;}
.ep-history-text{font-size:13px;color:#475569;line-height:1.5;}
.ep-history-time{font-size:10px;color:#94a3b8;margin-top:2px;}

/* deadline */
.ep-deadline{display:inline-flex;align-items:center;gap:5px;font-size:12px;font-weight:600;color:#f59e0b;background:#fffbeb;padding:4px 10px;border-radius:999px;border:1px solid #fde68a;}
`

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */
function fmt(n: number) {
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n) }
  catch { return `₹${n}` }
}
function fmtDate(d?: string) {
  if (!d) return ''
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
}
function fmtDateTime(d?: string) {
  if (!d) return ''
  return new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

function getPartyName(party: EscrowData['client'] | EscrowData['freelancer']) {
  if ('freelancerProfile' in party && party.freelancerProfile?.fullName) return party.freelancerProfile.fullName
  if ('clientProfile' in party && (party as EscrowData['client']).clientProfile?.fullName) return (party as EscrowData['client']).clientProfile!.fullName!
  if ('clientProfile' in party && (party as EscrowData['client']).clientProfile?.companyName) return (party as EscrowData['client']).clientProfile!.companyName!
  if ('companyProfile' in party && (party as EscrowData['client']).companyProfile?.companyName) return (party as EscrowData['client']).companyProfile!.companyName!
  return 'User'
}
function getPartyImage(party: EscrowData['client'] | EscrowData['freelancer']) {
  if ('freelancerProfile' in party) return party.freelancerProfile?.profileImage
  if ('clientProfile' in party && (party as EscrowData['client']).clientProfile?.profileImage) return (party as EscrowData['client']).clientProfile!.profileImage
  if ('companyProfile' in party && (party as EscrowData['client']).companyProfile?.profileImage) return (party as EscrowData['client']).companyProfile!.profileImage
  return undefined
}

const STATUS_STEPS = ['CREATED', 'FUNDED', 'REVIEW', 'RELEASED'] as const
const STEP_LABELS  = ['Created', 'Funded', 'In Review', 'Released']

function getStepState(status: EscrowStatus, step: string): 'done' | 'active' | 'pending' | 'dispute' {
  if (status === 'DISPUTED') {
    if (step === 'CREATED' || step === 'FUNDED') return 'done'
    if (step === 'REVIEW') return 'dispute'
    return 'pending'
  }
  if (status === 'REFUNDED') {
    if (step === 'CREATED') return 'done'
    return 'pending'
  }
  const order = ['CREATED', 'FUNDED', 'REVIEW', 'RELEASED']
  const normalised = status === 'IN_PROGRESS' || status === 'REVISION' ? 'FUNDED' : status
  const cur = order.indexOf(normalised)
  const idx = order.indexOf(step)
  if (idx < cur) return 'done'
  if (idx === cur) return 'active'
  return 'pending'
}

/* ══════════════════════════════════════
   AVATAR
══════════════════════════════════════ */
function Avatar({ src, name }: { src?: string; name: string }) {
  return (
    <div className="ep-party-avatar">
      {src
        ? <img src={src} alt={name} />
        : <svg width="22" height="22" viewBox="0 0 24 24" fill="#94a3b8"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
      }
    </div>
  )
}

/* ══════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════ */
export default function EscrowDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuthStore()

  const escrowId = Array.isArray(params.escrowId) ? params.escrowId[0] : params.escrowId

  const [escrow,         setEscrow]         = useState<EscrowData | null>(null)
  const [walletBalance,  setWalletBalance]  = useState<number>(0)
  const [loading,        setLoading]        = useState(true)
  const [error,          setError]          = useState('')
  const [actionLoading,  setActionLoading]  = useState(false)
  const [disputeOpen,    setDisputeOpen]    = useState(false)
  const [disputeReason,  setDisputeReason]  = useState('')
  const [reviewOpen,     setReviewOpen]     = useState(false)
  const [reviewNotes,    setReviewNotes]    = useState('')

  // Revision modal
  const [revisionOpen,   setRevisionOpen]   = useState(false)
  const [revisionNote,   setRevisionNote]   = useState('')
  const [revisionImage,  setRevisionImage]  = useState<string>('')
  const [revImgUploading, setRevImgUploading] = useState(false)
  const revImgRef = useRef<HTMLInputElement>(null)

  // Submit work modal
  const [submitOpen,     setSubmitOpen]     = useState(false)
  const [submitNote,     setSubmitNote]     = useState('')
  const [uploadedFiles,  setUploadedFiles]  = useState<{ url: string; originalName: string; progress: number }[]>([])
  const [uploading,      setUploading]      = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  /* ── fetch ── */
  useEffect(() => {
    if (!escrowId) return
    setLoading(true)
    Promise.allSettled([
      escrowService.getEscrow(escrowId),
      walletService.getWallet(),
    ]).then(([eRes, wRes]) => {
      if (eRes.status === 'fulfilled') {
        setEscrow(eRes.value?.data ?? eRes.value)
      } else {
        setError(eRes.reason?.response?.data?.message || 'Escrow not found')
      }
      if (wRes.status === 'fulfilled') {
        const w = wRes.value?.data ?? wRes.value
        setWalletBalance(w?.balance ?? 0)
      }
    }).finally(() => setLoading(false))
  }, [escrowId])

  const refresh = async () => {
    if (!escrowId) return
    const [eRes, wRes] = await Promise.allSettled([
      escrowService.getEscrow(escrowId),
      walletService.getWallet(),
    ])
    if (eRes.status === 'fulfilled') setEscrow(eRes.value?.data ?? eRes.value)
    if (wRes.status === 'fulfilled') {
      const w = wRes.value?.data ?? wRes.value
      setWalletBalance(w?.balance ?? 0)
    }
  }

  /* ── actions ── */
  async function handleFund() {
    if (!escrow) return
    setActionLoading(true)
    try {
      await escrowService.fundEscrow(escrow.id)
      toast.success('Escrow funded! Freelancer can now begin work.')
      await refresh()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to fund escrow')
    } finally { setActionLoading(false) }
  }

  async function handleRevisionImageSelect(file: File | null) {
    if (!file) return
    setRevImgUploading(true)
    try {
      const url = await uploadService.uploadImage(file)
      setRevisionImage(url)
    } catch {
      toast.error('Failed to upload image')
    } finally { setRevImgUploading(false) }
  }

  async function handleRevision() {
    if (!escrow) return
    if (!revisionNote.trim()) {
      toast.error('Please describe what changes you need before sending the revision request.')
      return
    }
    setActionLoading(true)
    try {
      await escrowService.requestRevision(escrow.id, revisionNote.trim(), revisionImage || undefined)
      toast.success('Revision requested. Freelancer will be notified.')
      setRevisionOpen(false)
      setRevisionNote('')
      setRevisionImage('')
      await refresh()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to request revision')
    } finally { setActionLoading(false) }
  }

  async function handleFileSelect(files: FileList | null) {
    if (!files || files.length === 0) return
    setUploading(true)
    for (const file of Array.from(files)) {
      const idx = uploadedFiles.length
      setUploadedFiles(prev => [...prev, { url: '', originalName: file.name, progress: 0 }])
      try {
        const result = await uploadService.uploadFile(file, (pct) => {
          setUploadedFiles(prev => prev.map((f, i) => i === idx ? { ...f, progress: pct } : f))
        })
        setUploadedFiles(prev => prev.map((f, i) => i === idx ? { ...f, url: result.url, progress: 100 } : f))
      } catch {
        setUploadedFiles(prev => prev.filter((_, i) => i !== idx))
        toast.error(`Failed to upload ${file.name}`)
      }
    }
    setUploading(false)
  }

  async function handleSubmit() {
    if (!escrow) return
    if (!submitNote.trim() && uploadedFiles.length === 0) {
      toast.error('Please add a description or at least one file.')
      return
    }
    setActionLoading(true)
    try {
      await escrowService.submitWork(
        escrow.id,
        submitNote.trim(),
        uploadedFiles.filter(f => f.url).map(f => JSON.stringify({ url: f.url, name: f.originalName })),
      )
      toast.success('Work submitted! Waiting for client review.')
      setSubmitOpen(false)
      setSubmitNote('')
      setUploadedFiles([])
      await refresh()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to submit work')
    } finally { setActionLoading(false) }
  }

  async function handleRelease() {
    if (!escrow) return
    setActionLoading(true)
    try {
      await escrowService.releaseEscrow(escrow.id)
      toast.success('Payment released to freelancer! 🎉')
      setReviewOpen(false)
      setReviewNotes('')
      await refresh()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to release payment')
    } finally { setActionLoading(false) }
  }

  async function handleDispute() {
    if (!escrow || !disputeReason.trim()) return
    setActionLoading(true)
    try {
      await escrowService.openDispute(escrow.id, disputeReason.trim())
      toast.success('Dispute raised. Admin will review shortly.')
      setDisputeOpen(false)
      setDisputeReason('')
      await refresh()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to open dispute')
    } finally { setActionLoading(false) }
  }

  async function handleCancel() {
    if (!escrow) return
    setActionLoading(true)
    try {
      await escrowService.cancelEscrow(escrow.id)
      toast.success('Escrow cancelled.')
      await refresh()
    } catch (e: any) {
      toast.error(e.response?.data?.message || 'Failed to cancel escrow')
    } finally { setActionLoading(false) }
  }

  /* ── derived ── */
  const isClient     = user?.id === escrow?.client.id
  const isFreelancer = user?.id === escrow?.freelancer.id
  const canFund      = isClient     && escrow?.status === 'CREATED'
  const canSubmit    = isFreelancer && ['FUNDED', 'IN_PROGRESS', 'REVISION'].includes(escrow?.status ?? '')
  const canRelease   = isClient     && escrow?.status === 'REVIEW'
  const revisionsUsed = escrow?.revisionCount ?? 0
  const canRevision  = isClient && escrow?.status === 'REVIEW' && revisionsUsed < 2
  const canDispute   = (isClient || isFreelancer) && ['FUNDED', 'IN_PROGRESS', 'REVIEW', 'REVISION'].includes(escrow?.status ?? '')
  const canCancel    = isClient     && escrow?.status === 'CREATED'
  const isTerminal   = ['RELEASED', 'REFUNDED'].includes(escrow?.status ?? '')
  const isDisputed   = escrow?.status === 'DISPUTED'
  const isRevision   = escrow?.status === 'REVISION'

  const insufficientBalance = canFund && walletBalance < (escrow?.amount ?? 0)

  /* ── skeleton ── */
  if (loading) {
    return (
      <div className="ep-page">
        <style>{STYLES}</style>
        <div className="ep-wrap">
          <div className="ep-skel" style={{ height: 18, width: 80, borderRadius: 8, marginBottom: 18 }} />
          <div style={{ background: '#fff', borderRadius: 20, padding: 24, boxShadow: '0 2px 20px rgba(0,0,0,0.08)', marginBottom: 14 }}>
            <div className="ep-skel" style={{ height: 24, width: '55%', borderRadius: 8, marginBottom: 10 }} />
            <div className="ep-skel" style={{ height: 14, width: '75%', borderRadius: 6, marginBottom: 8 }} />
            <div className="ep-skel" style={{ height: 14, width: '40%', borderRadius: 6, marginBottom: 20 }} />
            <div style={{ display: 'flex', gap: 8 }}>
              {[1,2,3,4].map(i => <div key={i} className="ep-skel" style={{ flex: 1, height: 50, borderRadius: 10 }} />)}
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (error || !escrow) {
    return (
      <div className="ep-page">
        <style>{STYLES}</style>
        <div className="ep-wrap">
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 2px 20px rgba(0,0,0,0.08)' }}>
            <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0D1B2A' }}>Escrow not found</h2>
            <p style={{ marginTop: 8, color: '#64748b', fontSize: 14 }}>{error || 'This escrow does not exist or you are not authorized.'}</p>
            <button className="ep-btn ep-btn-ghost" style={{ marginTop: 16, width: 'auto', padding: '10px 20px' }} onClick={() => router.back()}>Go Back</button>
          </div>
        </div>
      </div>
    )
  }

  const clientName     = getPartyName(escrow.client)
  const clientImg      = getPartyImage(escrow.client)
  const freelancerName = getPartyName(escrow.freelancer)
  const freelancerImg  = getPartyImage(escrow.freelancer)
  const platformFee    = escrow.platformFee > 0 ? escrow.platformFee : Math.round(escrow.amount * 0.1)
  const freelancerPayout = Math.max(0, escrow.amount - platformFee)

  /* ── activity history ── */
  const history = [
    { text: 'Escrow created', time: escrow.createdAt, type: 'default' },
    ...(escrow.status !== 'CREATED' ? [{ text: `Escrow funded — ${fmt(escrow.amount)} held from client wallet`, time: escrow.updatedAt, type: 'default' }] : []),
    ...(escrow.status === 'REVIEW' || escrow.status === 'RELEASED' ? [{ text: 'Work submitted by freelancer — awaiting client review', time: escrow.updatedAt, type: 'default' }] : []),
    ...(escrow.status === 'REVISION' ? [{ text: `Revision requested by client: "${escrow.revisionNote?.slice(0, 60)}${(escrow.revisionNote?.length ?? 0) > 60 ? '…' : ''}"`, time: escrow.updatedAt, type: 'warn' }] : []),
    ...(escrow.status === 'RELEASED' ? [{ text: `Payment of ${fmt(freelancerPayout)} released to freelancer. Platform fee kept: ${fmt(platformFee)}`, time: escrow.releasedAt, type: 'success' }] : []),
    ...(escrow.status === 'DISPUTED' ? [{ text: `Dispute raised — "${escrow.disputeReason}"`, time: escrow.updatedAt, type: 'danger' }] : []),
    ...(escrow.status === 'REFUNDED' ? [{ text: `${fmt(escrow.amount)} refunded to client wallet`, time: escrow.updatedAt, type: 'warn' }] : []),
  ]

  return (
    <div className="ep-page">
      <style>{STYLES}</style>

      <div className="ep-wrap">
        {/* back */}
        <button className="ep-back" onClick={() => router.back()}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M20 11H7.83l5.59-5.59L12 4l-8 8 8 8 1.41-1.41L7.83 13H20v-2z"/></svg>
          Back
        </button>

        {/* header card */}
        <div className="ep-hdr">
          <div className="ep-hdr-top">
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 className="ep-task-title">{escrow.task.title}</h1>
              <p className="ep-task-desc">{escrow.task.description}</p>
              <p className="ep-id">Escrow ID: {escrow.id}</p>
            </div>
            <span className={`ep-badge ${escrow.status}`}>
              <span className="ep-badge-dot" />
              {escrow.status === 'IN_PROGRESS' ? 'IN PROGRESS' : escrow.status}
            </span>
          </div>

          {/* Status timeline */}
          <div className="ep-timeline">
            {STATUS_STEPS.map((step, i) => {
              const state = getStepState(escrow.status, step)
              return (
                <>
                  <div key={step} className="ep-tl-step">
                    <div className={`ep-tl-circle ${state}`}>
                      {state === 'done' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                      ) : state === 'dispute' ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                      ) : (i + 1)}
                    </div>
                    <span className={`ep-tl-label ${state}`}>{STEP_LABELS[i]}</span>
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div key={`conn-${i}`} className={`ep-tl-connector ${getStepState(escrow.status, STATUS_STEPS[i + 1]) !== 'pending' ? 'done' : ''}`} />
                  )}
                </>
              )
            })}
          </div>

          {escrow.task.deadline && (
            <div style={{ marginTop: 14 }}>
              <span className="ep-deadline">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67V7z"/></svg>
                Deadline: {fmtDate(escrow.task.deadline)}
              </span>
            </div>
          )}
        </div>

        {/* two-col */}
        <div className="ep-cols">

          {/* LEFT COLUMN */}
          <div>
            {/* Parties */}
            <div className="ep-card">
              <div className="ep-card-hdr">Parties</div>
              <div className="ep-card-body">
                <div className="ep-party">
                  <Avatar src={clientImg} name={clientName} />
                  <div>
                    <p className="ep-party-name">
                      {clientName}
                      {user?.id === escrow.client.id && <span className="ep-party-you">You</span>}
                    </p>
                    <p className="ep-party-role">Client</p>
                  </div>
                </div>
                <div className="ep-divider" />
                <div className="ep-party">
                  <Avatar src={freelancerImg} name={freelancerName} />
                  <div>
                    <p className="ep-party-name">
                      {freelancerName}
                      {user?.id === escrow.freelancer.id && <span className="ep-party-you">You</span>}
                    </p>
                    <p className="ep-party-role">
                      {escrow.freelancer.freelancerProfile?.title ?? 'Freelancer'}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {isFreelancer && (
              <div className="ep-card">
                <div className="ep-card-hdr">Payment Details</div>
                <div className="ep-card-body">
                  <div className="ep-amount-row">
                    <span className="ep-amount-lbl">Client Pays</span>
                    <span className="ep-amount-val">{fmt(escrow.amount)}</span>
                  </div>
                  <div className="ep-amount-row">
                    <span className="ep-amount-lbl">Platform Fee</span>
                    <span className="ep-amount-val">{fmt(platformFee)}</span>
                  </div>
                  <div className="ep-divider" />
                  <div className="ep-amount-row">
                    <span className="ep-amount-lbl">Freelancer Receives</span>
                    <span className="ep-amount-total">{fmt(freelancerPayout)}</span>
                  </div>
                </div>
              </div>
            )}


            {/* Revision request — shown when client has requested changes */}
            {escrow.revisionNote && (
              <div className="ep-revision">
                <p className="ep-revision-title">
                  🔄 Revision Requested by Client
                </p>
                <p className="ep-revision-note">{escrow.revisionNote}</p>
                {escrow.revisionImage && (
                  <div className="ep-revision-img">
                    <img src={escrow.revisionImage} alt="Revision reference" />
                  </div>
                )}
              </div>
            )}

            {/* Submitted deliverables — shown when work has been submitted */}
            {(['REVIEW', 'RELEASED', 'DISPUTED'].includes(escrow.status)) && (
              <div className="ep-card">
                <div className="ep-card-hdr">📦 Submitted Deliverables</div>
                <div className="ep-card-body">
                  {escrow.task.submissionNote && (
                    <div style={{ marginBottom: 14 }}>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 6 }}>Freelancer's Note</p>
                      <p style={{ fontSize: 13, color: '#374151', lineHeight: 1.65, whiteSpace: 'pre-wrap', background: '#f8fafc', borderRadius: 10, padding: '10px 14px', border: '1px solid #e5e7eb' }}>
                        {escrow.task.submissionNote}
                      </p>
                    </div>
                  )}
                  {escrow.task.submissionFiles && escrow.task.submissionFiles.length > 0 ? (
                    <>
                      <p style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.06em', marginBottom: 8 }}>Files</p>
                      {escrow.task.submissionFiles.map((raw, i) => {
                        let name = `File ${i + 1}`
                        let url = raw
                        try { const p = JSON.parse(raw); url = p.url; name = p.name } catch {}
                        const ext = url.split('.').pop()?.toUpperCase() ?? 'FILE'
                        return (
                          <div key={i} className="ep-deliverable">
                            <div className="ep-deliverable-icon">
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="#fff"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                            </div>
                            <span className="ep-deliverable-name">{name}</span>
                            <span style={{ fontSize: 10, fontWeight: 700, color: '#0077b5', background: '#e8f4fd', padding: '2px 7px', borderRadius: 6, flexShrink: 0 }}>{ext}</span>
                            <a href={url} target="_blank" rel="noreferrer" download className="ep-deliverable-dl">Download</a>
                          </div>
                        )
                      })}
                    </>
                  ) : (
                    !escrow.task.submissionNote && (
                      <p style={{ fontSize: 13, color: '#94a3b8' }}>No files were attached to this submission.</p>
                    )
                  )}
                </div>
              </div>
            )}

            {/* Activity history */}
            <div className="ep-card">
              <div className="ep-card-hdr">Activity</div>
              <div className="ep-card-body">
                {history.map((h, i) => (
                  <div key={i} className="ep-history-item">
                    <div className={`ep-history-dot ${h.type}`} />
                    <div>
                      <p className="ep-history-text">{h.text}</p>
                      <p className="ep-history-time">{fmtDateTime(h.time)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN — action panel */}
          <div>
            {/* ─── Action Panel (inlined) ─── */}
            {escrow && (
              isTerminal ? (
                <div className="ep-action-card">
                  <div className={`ep-action-note ${escrow.status === 'RELEASED' ? 'success' : ''}`}>
                    {escrow.status === 'RELEASED'
                      ? `Payment was successfully released on ${fmtDateTime(escrow.releasedAt)}.`
                      : `This escrow was cancelled and ${fmt(escrow.amount)} was refunded to the client's wallet.`
                    }
                  </div>
                  <button type="button" className="ep-btn ep-btn-ghost" onClick={() => router.push('/wallet')}>View Wallet</button>
                </div>
              ) : (isRevision && isClient) ? (
                <div className="ep-action-card">
                  <p className="ep-action-title">Revision Requested</p>
                  <div className="ep-action-note warn">
                    You requested revisions. The freelancer will resubmit once changes are made. You'll be notified when ready.
                  </div>
                  {canDispute && (
                    <button type="button" className="ep-btn ep-btn-danger" onClick={() => setDisputeOpen(true)} disabled={actionLoading}>
                      Raise a Dispute
                    </button>
                  )}
                </div>
              ) : isDisputed ? (
                <div className="ep-action-card">
                  <p className="ep-action-title">Dispute in Progress</p>
                  <div className="ep-action-note dispute">
                    <strong>Reason:</strong> {escrow.disputeReason}
                    <br /><br />
                    An admin will review this dispute and resolve it shortly. Funds remain locked until resolved.
                  </div>
                </div>
              ) : (
                <div className="ep-action-card">
                  <p className="ep-action-title">Actions</p>

                  {canFund && (
                    <>
                      <div className="ep-wallet-row">
                        <span className="ep-wallet-lbl">Wallet Balance</span>
                        <span className="ep-wallet-val">{fmt(walletBalance)}</span>
                      </div>
                      {insufficientBalance ? (
                        <div className="ep-action-note warn">
                          Insufficient balance. You need {fmt(escrow.amount)} but only have {fmt(walletBalance)}.
                          Please add funds to your wallet first.
                        </div>
                      ) : (
                        <div className="ep-action-note">
                          Clicking "Fund Escrow" will hold {fmt(escrow.amount)} from your wallet. The freelancer
                          can start working once funds are secured.
                        </div>
                      )}
                      <button type="button" className="ep-btn ep-btn-primary" onClick={handleFund} disabled={actionLoading || insufficientBalance}>
                        {actionLoading ? <span className="ep-spin" /> : <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M11 17h2v-1h1c.55 0 1-.45 1-1v-3c0-.55-.45-1-1-1h-3v-1h4V8h-2V7h-2v1h-1c-.55 0-1 .45-1 1v3c0 .55.45 1 1 1h3v1H9v2h2v1zm9-13H4c-1.11 0-1.99.89-1.99 2L2 18c0 1.11.89 2 2 2h16c1.11 0 2-.89 2-2V6c0-1.11-.89-2-2-2zm0 14H4V6h16v12z"/></svg>}
                        Fund Escrow — {fmt(escrow.amount)}
                      </button>
                      {canCancel && (
                        <button type="button" className="ep-btn ep-btn-outline" onClick={handleCancel} disabled={actionLoading}>Cancel Escrow</button>
                      )}
                    </>
                  )}

                  {isClient && ['FUNDED', 'IN_PROGRESS'].includes(escrow.status) && (
                    <div className="ep-action-note">
                      Funds are secured. Waiting for the freelancer to submit their work. You'll be notified when it's ready for review.
                    </div>
                  )}

                  {canRelease && (
                    <>
                      <div className="ep-action-note">
                        The freelancer has submitted their work. Review the deliverables, then approve, request changes, or raise a dispute.
                      </div>
                      <button type="button" className="ep-btn ep-btn-success" onClick={() => setReviewOpen(true)} disabled={actionLoading}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                        Approve & Release Payment
                      </button>
                      {canRevision && (
                        <button
                          type="button"
                          className="ep-btn ep-btn-outline"
                          style={{ color: '#c2410c', borderColor: '#fdba74', pointerEvents: 'all' }}
                          onClick={() => setRevisionOpen(true)}
                          disabled={actionLoading}
                        >
                          🔄 Request Revision ({2 - revisionsUsed} left)
                        </button>
                      )}
                      {isClient && escrow.status === 'REVIEW' && revisionsUsed >= 2 && (
                        <div className="ep-action-note warn" style={{ marginBottom: 0 }}>
                          Revision limit reached (2/2). You can approve the work or raise a dispute.
                        </div>
                      )}
                      <button type="button" className="ep-btn ep-btn-danger" onClick={() => setDisputeOpen(true)} disabled={actionLoading}>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z"/></svg>
                        Raise a Dispute
                      </button>
                    </>
                  )}

                  {isFreelancer && escrow.status === 'CREATED' && (
                    <div className="ep-action-note">
                      Waiting for the client to fund the escrow. You'll be notified once funds are secured and you can begin working.
                    </div>
                  )}

                  {isRevision && isFreelancer && (
                    <div className="ep-action-note warn" style={{ marginBottom: 14 }}>
                      🔄 The client requested revisions. Review the details in the deliverables section below, make the changes, then resubmit.
                    </div>
                  )}

                  {canSubmit && (
                    <>
                      {!isRevision && (
                        <div className="ep-action-note">
                          Funds are secured in escrow. Complete the work, upload your deliverable files, and submit for client review.
                        </div>
                      )}
                      <button type="button" className="ep-btn ep-btn-primary" onClick={() => setSubmitOpen(true)} disabled={actionLoading}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/></svg>
                        Submit Work for Review
                      </button>
                      {canDispute && (
                        <button type="button" className="ep-btn ep-btn-danger" onClick={() => setDisputeOpen(true)} disabled={actionLoading}>Raise a Dispute</button>
                      )}
                    </>
                  )}

                  {isFreelancer && escrow.status === 'REVIEW' && (
                    <>
                      <div className="ep-action-note">
                        Work submitted. Waiting for the client to review and release the payment. You'll be notified once it's done.
                      </div>
                      {canDispute && (
                        <button type="button" className="ep-btn ep-btn-danger" onClick={() => setDisputeOpen(true)} disabled={actionLoading}>Raise a Dispute</button>
                      )}
                    </>
                  )}
                </div>
              )
            )}

            {/* Quick info */}
            <div className="ep-card" style={{ marginTop: 0 }}>
              <div className="ep-card-hdr">Escrow Info</div>
              <div className="ep-card-body">
                {[
                  { label: 'Created',  value: fmtDateTime(escrow.createdAt) },
                  { label: 'Status',   value: escrow.status === 'IN_PROGRESS' ? 'In Progress' : escrow.status.charAt(0) + escrow.status.slice(1).toLowerCase() },
                  { label: 'Escrow ID', value: escrow.id.slice(0, 16) + '…' },
                ].map(r => (
                  <div key={r.label} className="ep-amount-row" style={{ borderBottom: '1px solid #f8fafc', paddingBottom: 8, marginBottom: 8 }}>
                    <span className="ep-amount-lbl">{r.label}</span>
                    <span style={{ fontSize: 12, fontWeight: 600, color: '#0D1B2A', textAlign: 'right', maxWidth: 160, wordBreak: 'break-all' }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Submit Work modal ── */}
      {submitOpen && (
        <div className="ep-modal-overlay" onClick={() => !actionLoading && setSubmitOpen(false)}>
          <div className="ep-modal" style={{ maxWidth: 520 }} onClick={e => e.stopPropagation()}>
            <p className="ep-modal-title">Submit Your Work</p>
            <p className="ep-modal-desc">Upload your deliverable files and add a note describing what you built.</p>

            {/* Note */}
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
              Submission note <span style={{ color: '#94a3b8', fontWeight: 400 }}>(what you built / how to use it)</span>
            </label>
            <textarea
              className="ep-modal-textarea"
              placeholder="e.g. School management software with student records, fee management, and attendance modules. Login: admin / admin123"
              value={submitNote}
              onChange={e => setSubmitNote(e.target.value)}
              style={{ marginBottom: 16 }}
            />

            {/* Dropzone */}
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>
              Attach files <span style={{ color: '#94a3b8', fontWeight: 400 }}>(ZIP, PDF, images, docs — up to 50 MB each)</span>
            </label>
            <div
              className="ep-dropzone"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => { e.preventDefault(); e.currentTarget.classList.add('over') }}
              onDragLeave={e => e.currentTarget.classList.remove('over')}
              onDrop={e => { e.preventDefault(); e.currentTarget.classList.remove('over'); void handleFileSelect(e.dataTransfer.files) }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="#94a3b8" style={{ marginBottom: 8 }}><path d="M19.35 10.04A7.49 7.49 0 0 0 12 4C9.11 4 6.6 5.64 5.35 8.04A5.994 5.994 0 0 0 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96zM14 13v4h-4v-4H7l5-5 5 5h-3z"/></svg>
              <p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', margin: 0 }}>Click or drag files here to upload</p>
              <p style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>ZIP, PDF, DOCX, images supported</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              style={{ display: 'none' }}
              onChange={e => void handleFileSelect(e.target.files)}
            />

            {/* File list */}
            {uploadedFiles.length > 0 && (
              <div className="ep-file-list">
                {uploadedFiles.map((f, i) => (
                  <div key={i} className="ep-file-item">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#0077b5"><path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                    <span className="ep-file-name">{f.originalName}</span>
                    {f.progress < 100 && <span className="ep-file-size">{f.progress}%</span>}
                    {f.progress === 100 && <span style={{ fontSize: 11, color: '#16a34a', fontWeight: 700 }}>✓</span>}
                    <button
                      type="button"
                      className="ep-file-remove"
                      onClick={() => setUploadedFiles(prev => prev.filter((_, idx) => idx !== i))}
                      disabled={f.progress < 100}
                    >×</button>
                  </div>
                ))}
              </div>
            )}

            <div className="ep-modal-actions" style={{ marginTop: 20 }}>
              <button
                className="ep-btn ep-btn-outline"
                style={{ flex: 1 }}
                onClick={() => { setSubmitOpen(false); setSubmitNote(''); setUploadedFiles([]) }}
                disabled={actionLoading || uploading}
              >
                Cancel
              </button>
              <button
                className="ep-btn ep-btn-primary"
                style={{ flex: 2, marginBottom: 0 }}
                onClick={handleSubmit}
                disabled={actionLoading || uploading || uploadedFiles.some(f => f.progress < 100)}
              >
                {actionLoading ? <span className="ep-spin" /> : <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M2.01 21 23 12 2.01 3 2 10l15 2-15 2z"/></svg>}
                {uploading ? 'Uploading…' : 'Submit for Review'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Request Revision modal ── */}
      {revisionOpen && (
        <div className="ep-modal-overlay" onClick={() => !actionLoading && setRevisionOpen(false)}>
          <div className="ep-modal" style={{ maxWidth: 500 }} onClick={e => e.stopPropagation()}>
            <p className="ep-modal-title">🔄 Request Revision</p>
            <p className="ep-modal-desc">
              Describe what needs to be changed. The freelancer will be notified and can resubmit after making the changes.
            </p>

            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
              Revision details <span style={{ color: '#dc2626' }}>*</span>
            </label>
            <textarea
              className="ep-modal-textarea"
              placeholder="e.g. The login page is missing the 'Forgot Password' link. Also the student report export should be PDF, not CSV..."
              value={revisionNote}
              onChange={e => setRevisionNote(e.target.value)}
              style={{ marginBottom: 16 }}
            />

            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 8 }}>
              Reference image <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional — screenshot of the issue)</span>
            </label>

            {revisionImage ? (
              <div style={{ position: 'relative', marginBottom: 12 }}>
                <img src={revisionImage} alt="Reference" style={{ width: '100%', maxHeight: 220, objectFit: 'contain', borderRadius: 10, border: '1px solid #fed7aa' }} />
                <button
                  type="button"
                  onClick={() => setRevisionImage('')}
                  style={{ position: 'absolute', top: 8, right: 8, width: 26, height: 26, borderRadius: '50%', background: '#dc2626', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >×</button>
              </div>
            ) : (
              <div
                className="ep-dropzone"
                style={{ marginBottom: 12 }}
                onClick={() => revImgRef.current?.click()}
              >
                {revImgUploading
                  ? <><span className="ep-spin-dark" style={{ margin: '0 auto' }} /><p style={{ fontSize: 12, color: '#94a3b8', marginTop: 8 }}>Uploading…</p></>
                  : <><svg width="28" height="28" viewBox="0 0 24 24" fill="#94a3b8" style={{ marginBottom: 6 }}><path d="M21 19V5c0-1.1-.9-2-2-2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2zM8.5 13.5l2.5 3.01L14.5 12l4.5 6H5l3.5-4.5z"/></svg><p style={{ fontSize: 13, fontWeight: 600, color: '#64748b', margin: 0 }}>Click to attach a screenshot</p></>
                }
              </div>
            )}
            <input
              ref={revImgRef}
              type="file"
              accept="image/*"
              style={{ display: 'none' }}
              onChange={e => void handleRevisionImageSelect(e.target.files?.[0] ?? null)}
            />

            <div className="ep-modal-actions">
              <button
                className="ep-btn ep-btn-outline"
                style={{ flex: 1 }}
                onClick={() => { setRevisionOpen(false); setRevisionNote(''); setRevisionImage('') }}
                disabled={actionLoading || revImgUploading}
              >
                Cancel
              </button>
              <button
                className="ep-btn ep-btn-primary"
                style={{ flex: 2, marginBottom: 0, background: '#ea580c' }}
                onClick={handleRevision}
                disabled={actionLoading || revImgUploading}
              >
                {actionLoading ? <span className="ep-spin" /> : '🔄 Send Revision Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Review & Approve modal ── */}
      {reviewOpen && (
        <div className="ep-modal-overlay" onClick={() => setReviewOpen(false)}>
          <div className="ep-modal" onClick={e => e.stopPropagation()}>
            <p className="ep-modal-title">Approve Work & Release Payment</p>
            <p className="ep-modal-desc">
              Once you release the payment, it will instantly appear in the freelancer's wallet. This action cannot be undone.
            </p>
            <label style={{ fontSize: 12, fontWeight: 600, color: '#64748b', display: 'block', marginBottom: 6 }}>
              Review notes (optional)
            </label>
            <textarea
              className="ep-modal-textarea"
              placeholder="e.g. Great work! Delivered on time and exceeded expectations..."
              value={reviewNotes}
              onChange={e => setReviewNotes(e.target.value)}
            />
            <div className="ep-modal-actions">
              <button
                className="ep-btn ep-btn-outline"
                style={{ flex: 1 }}
                onClick={() => { setReviewOpen(false); setReviewNotes('') }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="ep-btn ep-btn-success"
                style={{ flex: 1, marginBottom: 0 }}
                onClick={handleRelease}
                disabled={actionLoading}
              >
                {actionLoading ? <span className="ep-spin-dark" /> : '✓ Confirm Release'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Dispute modal ── */}
      {disputeOpen && (
        <div className="ep-modal-overlay" onClick={() => setDisputeOpen(false)}>
          <div className="ep-modal" onClick={e => e.stopPropagation()}>
            <p className="ep-modal-title">Raise a Dispute</p>
            <p className="ep-modal-desc">
              Describe the issue clearly. An admin will review both sides and resolve the dispute.
              Funds remain locked until a decision is made.
            </p>
            <textarea
              className="ep-modal-textarea"
              placeholder="Explain the problem in detail..."
              value={disputeReason}
              onChange={e => setDisputeReason(e.target.value)}
            />
            <div className="ep-modal-actions">
              <button
                className="ep-btn ep-btn-outline"
                style={{ flex: 1 }}
                onClick={() => { setDisputeOpen(false); setDisputeReason('') }}
                disabled={actionLoading}
              >
                Cancel
              </button>
              <button
                className="ep-btn ep-btn-danger"
                style={{ flex: 1, marginBottom: 0 }}
                onClick={handleDispute}
                disabled={actionLoading || !disputeReason.trim()}
              >
                {actionLoading ? <span className="ep-spin-dark" /> : 'Submit Dispute'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
