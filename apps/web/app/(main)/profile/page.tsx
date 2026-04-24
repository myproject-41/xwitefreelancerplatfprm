'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import apiClient        from '../../../services/apiClient'
import { authService }  from '../../../services/auth.service'
import { uploadService } from '../../../services/upload.service'
import { walletService } from '../../../services/wallet.service'
import { postService }   from '../../../services/post.service'
import { escrowService } from '../../../services/escrow.service'
import { useAuthStore } from '../../../store/authStore'

/* ═══════════════════════════════════════════
   TYPES
═══════════════════════════════════════════ */
interface Wallet { balance: number; heldBalance?: number }
interface ConnectedUser { id: string; fullName?: string; profileImage?: string; email?: string }
type Panel = 'none' | 'addFunds' | 'withdraw' | 'settings' | 'switch'

/* ═══════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════ */
const INR_COUNTRIES = ['india', 'nepal', 'in', 'np']
const QUICK_AMOUNTS = [100, 500, 1000, 2500]
const NAV_ITEMS = [
  { label: 'Home',    icon: 'home',          href: '/'        },
  { label: 'Network', icon: 'group',          href: '/network' },
  { label: 'Post',    icon: 'add_box',        href: '/post'    },
  { label: 'Alerts',  icon: 'notifications',  href: '/alerts'  },
  { label: 'Profile', icon: 'person',         href: '/profile' },
]

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
function detectCurrency(loc: string): 'INR' | 'USD' {
  return INR_COUNTRIES.includes(loc.toLowerCase().trim()) ? 'INR' : 'USD'
}
function fmt(amount: number, currency: 'INR' | 'USD'): string {
  return new Intl.NumberFormat(currency === 'INR' ? 'en-IN' : 'en-US', {
    style: 'currency', currency, minimumFractionDigits: 2,
  }).format(amount)
}

/* ═══════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════ */
export default function ClientProfile() {
  const router = useRouter()
  const { setUser, logout, user } = useAuthStore()

  useEffect(() => {
    if (!user) { router.replace('/login'); return }
    if (user.role === 'FREELANCER') { router.replace('/profile/freelancer'); return }
    if (user.role === 'COMPANY')    { router.replace('/profile/company');    return }
  }, [user])

  /* profile */
  const [name,           setName]           = useState('')
  const [bio,            setBio]            = useState('')
  const [skills,         setSkills]         = useState<string[]>([])
  const [connections,    setConnections]    = useState(0)
  const [connectedUsers, setConnectedUsers] = useState<ConnectedUser[]>([])
  const [coverSrc,       setCoverSrc]       = useState<string | null>(null)
  const [avatarSrc,      setAvatarSrc]      = useState<string | null>(null)
  const [currency,       setCurrency]       = useState<'INR' | 'USD'>('INR')
  const [pageLoading,    setPageLoading]    = useState(true)
  const [iconsReady,     setIconsReady]     = useState(false)

  /* uploads */
  const [coverUploading,  setCoverUploading]  = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)

  /* image editor */
  const [editorFile,   setEditorFile]   = useState<File | null>(null)
  const [editorField,  setEditorField]  = useState<'coverImage'|'profileImage'>('profileImage')
  const [showEditor,   setShowEditor]   = useState(false)

  /* wallet */
  const [wallet,        setWallet]        = useState<Wallet | null>(null)
  const [walletLoading, setWalletLoading] = useState(true)  // true = show skeleton until first load

  /* bio / profile edit */
  const [showBioModal, setShowBioModal] = useState(false)
  const [bioDraft,     setBioDraft]     = useState('')
  const [nameDraft,    setNameDraft]    = useState('')
  const [bioSaving,    setBioSaving]    = useState(false)

  /* posts + tasks */
  const [myPosts,         setMyPosts]         = useState<any[]>([])
  const [completedTasks,  setCompletedTasks]  = useState<any[]>([])
  const [inProgressTasks, setInProgressTasks] = useState<any[]>([])
  const [requests,        setRequests]        = useState<any[]>([])
  const [postsLoading,    setPostsLoading]    = useState(true)
  const [tasksLoading,    setTasksLoading]    = useState(true)
  const [openCompleted,   setOpenCompleted]   = useState(false)
  const [openInProgress,  setOpenInProgress]  = useState(false)
  const [openRequests,    setOpenRequests]    = useState(false)

  /* panels */
  const [activePanel,    setActivePanel]    = useState<Panel>('none')
  const [addAmount,      setAddAmount]      = useState('')
  const [addingFunds,    setAddingFunds]    = useState(false)
  const [withdrawAmount, setWithdrawAmount] = useState('')
  const [withdrawing,    setWithdrawing]    = useState(false)

  /* settings */
  const [oldPw,     setOldPw]     = useState('')
  const [newPw,     setNewPw]     = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  const coverInputRef  = useRef<HTMLInputElement>(null)
  const avatarInputRef = useRef<HTMLInputElement>(null)

  /* ─── Wait for Material Symbols font before showing icons ─── */
  useEffect(() => {
    if (document.fonts) {
      document.fonts.ready.then(() => setIconsReady(true))
    } else {
      setIconsReady(true)
    }
    loadProfile()
    loadWallet()
    loadMyData()
  }, [])

  /* ─── DATA FETCHING ─── */
  async function loadProfile() {
    setPageLoading(true)
    try {
      const res = await authService.getMe()
      const d   = res.data
      setUser(d)
      const p   = d.clientProfile ?? {}
      const loc = (p.location ?? p.country ?? '').toLowerCase()
      setName(p.fullName ?? d.email ?? '')
      setBio(p.description ?? '')
      setSkills(p.skills ?? [])
      setAvatarSrc(p.profileImage ?? null)
      setCoverSrc(p.coverImage ?? null)
      setConnections(d.connectionsCount ?? 0)
      setCurrency('INR')
      try {
        const cRes = await apiClient.get('/api/network/connections')
        const list = Array.isArray(cRes.data) ? cRes.data : (cRes.data?.connections ?? [])
        setConnectedUsers(list.slice(0, 6))
      } catch {}
    } catch { toast.error('Could not load profile') }
    finally { setPageLoading(false) }
  }

  const loadWallet = useCallback(async () => {
    setWalletLoading(true)
    try {
      const res = await walletService.getTransactions()
      setWallet(res.data.wallet)
    } catch {}
    finally { setWalletLoading(false) }
  }, [])

  async function loadMyData() {
    setPostsLoading(true); setTasksLoading(true)
    const [postsRes, escrowsRes, proposalsRes] = await Promise.allSettled([
      postService.getMyPosts(),
      escrowService.getMyEscrows(),
      postService.getReceivedProposals(),
    ])
    if (postsRes.status === 'fulfilled') {
      const p = postsRes.value
      setMyPosts(Array.isArray(p) ? p : (p?.data ?? p?.posts ?? []))
    }
    if (escrowsRes.status === 'fulfilled') {
      const list: any[] = Array.isArray(escrowsRes.value) ? escrowsRes.value : (escrowsRes.value?.data ?? escrowsRes.value?.escrows ?? [])
      setCompletedTasks(list.filter(e => e.status === 'RELEASED'))
      setInProgressTasks(list.filter(e => ['FUNDED','IN_PROGRESS','REVIEW','REVISION','DISPUTED'].includes(e.status)))
    }
    if (proposalsRes.status === 'fulfilled') {
      const p = proposalsRes.value
      const list: any[] = Array.isArray(p) ? p : (p?.data ?? p?.proposals ?? [])
      setRequests(list.filter(r => ['PENDING', 'ACCEPTED'].includes(r.status)))
    }
    setPostsLoading(false); setTasksLoading(false)
  }

  /* ─── IMAGE UPLOAD ─── */
  async function uploadImage(
    file: File,
    field: 'coverImage' | 'profileImage',
    setBlob: (s: string | null) => void,
    setLoading: (b: boolean) => void,
  ) {
    const blob = URL.createObjectURL(file)
    setBlob(blob); setLoading(true)
    try {
      const url = await uploadService.uploadImage(file)
      URL.revokeObjectURL(blob); setBlob(url)
      await apiClient.put('/api/users/profile/client', { [field]: url })
      const res = await authService.getMe(); setUser(res.data)
      toast.success(field === 'coverImage' ? 'Cover updated' : 'Photo updated')
    } catch {
      URL.revokeObjectURL(blob); setBlob(null)
      toast.error('Upload failed')
    } finally { setLoading(false) }
  }

  function onCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return; e.target.value = ''
    setEditorFile(f); setEditorField('coverImage'); setShowEditor(true)
  }
  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return; e.target.value = ''
    setEditorFile(f); setEditorField('profileImage'); setShowEditor(true)
  }

  /* called by ImageEditorModal after editing — receives a canvas-exported Blob */
  async function onEditorDone(blob: Blob) {
    setShowEditor(false)
    const editedFile = new File([blob], editorFile?.name ?? 'image.webp', { type: blob.type })
    const setBlob    = editorField === 'coverImage' ? setCoverSrc : setAvatarSrc
    const setLoading = editorField === 'coverImage' ? setCoverUploading : setAvatarUploading
    uploadImage(editedFile, editorField, setBlob, setLoading)
  }

  /* ─── PROFILE INFO (name + bio) ─── */
  async function saveBio() {
    setBioSaving(true)
    try {
      await apiClient.put('/api/users/profile/client', {
        description: bioDraft.trim(),
        fullName: nameDraft.trim() || undefined,
      })
      setBio(bioDraft.trim())
      if (nameDraft.trim()) setName(nameDraft.trim())
      const res = await authService.getMe(); setUser(res.data)
      setShowBioModal(false); toast.success('Profile updated')
    } catch { toast.error('Could not save profile') }
    finally { setBioSaving(false) }
  }

  /* ─── WALLET ─── */
  function loadRazorpayScript(): Promise<boolean> {
    return new Promise(resolve => {
      if ((window as any).Razorpay) return resolve(true)
      const script = document.createElement('script')
      script.src = 'https://checkout.razorpay.com/v1/checkout.js'
      script.onload = () => resolve(true)
      script.onerror = () => resolve(false)
      document.body.appendChild(script)
    })
  }

  async function handleAddFunds() {
    const n = Number(addAmount)
    if (!n || n <= 0) return toast.error('Enter a valid amount')
    setAddingFunds(true)
    try {
      const ready = await loadRazorpayScript()
      if (!ready) { toast.error('Could not load Razorpay. Check your internet connection.'); setAddingFunds(false); return }
      const { data: order } = await walletService.createOrder(n)
      const options = {
        key: order.keyId,
        amount: order.amount,
        currency: order.currency,
        name: 'Xwite',
        description: 'Add funds to wallet',
        order_id: order.orderId,
        prefill: { email: user?.email ?? '' },
        theme: { color: '#0077b5' },
        handler: async (response: any) => {
          try {
            await walletService.verifyPayment({
              razorpayOrderId: response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            toast.success(`${fmt(n, currency)} added!`)
            setAddAmount(''); togglePanel('none'); loadWallet()
          } catch { toast.error('Payment verification failed') }
          finally { setAddingFunds(false) }
        },
        modal: { ondismiss: () => { setAddingFunds(false) } },
      }
      const rzp = new (window as any).Razorpay(options)
      rzp.on('payment.failed', () => { toast.error('Payment failed'); setAddingFunds(false) })
      rzp.open()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed to initiate payment'); setAddingFunds(false) }
  }

  async function handleWithdraw() {
    const n = Number(withdrawAmount)
    if (!n || n <= 0) return toast.error('Enter a valid amount')
    if (wallet && n > wallet.balance) return toast.error('Insufficient balance')
    setWithdrawing(true)
    try {
      await walletService.withdrawFunds({ amount: n })
      toast.success('Withdrawal requested!')
      setWithdrawAmount(''); togglePanel('none'); loadWallet()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Withdrawal failed') }
    finally { setWithdrawing(false) }
  }

  /* ─── SETTINGS ─── */
  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault()
    if (newPw !== confirmPw) return toast.error('Passwords do not match')
    if (newPw.length < 8)   return toast.error('Minimum 8 characters')
    setPwLoading(true)
    try {
      await apiClient.put('/api/auth/change-password', { oldPassword: oldPw, newPassword: newPw })
      toast.success('Password changed!'); setOldPw(''); setNewPw(''); setConfirmPw('')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setPwLoading(false) }
  }

  function handleLogout() { logout(); authService.removeToken(); router.push('/login') }
  function togglePanel(p: Panel) { setActivePanel(prev => prev === p ? 'none' : p) }

  const balanceLabel = fmt(wallet?.balance ?? 0, currency)
  const escrowLabel  = wallet?.heldBalance && wallet.heldBalance > 0
    ? `${fmt(wallet.heldBalance, currency)} in escrow` : null

  /* ═══════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════ */
  return (
    <>
      <style>{STYLES}</style>

      {/* hidden inputs */}
      <input ref={coverInputRef}  type="file" accept="image/*" onChange={onCoverChange}  style={{display:'none'}} />
      <input ref={avatarInputRef} type="file" accept="image/*" onChange={onAvatarChange} style={{display:'none'}} />

      {/* image editor modal */}
      {showEditor && editorFile && (
        <ImageEditorModal
          file={editorFile}
          isCover={editorField === 'coverImage'}
          onDone={onEditorDone}
          onCancel={() => setShowEditor(false)}
        />
      )}

      {/* bio modal */}
      {showBioModal && (
        <BioModal
          draft={bioDraft} nameDraft={nameDraft} saving={bioSaving}
          onChange={setBioDraft} onNameChange={setNameDraft} onSave={saveBio}
          onClose={() => setShowBioModal(false)}
        />
      )}

      <div className="cp-root">

        {/* ══════════════════════════
            MOBILE HEADER
        ══════════════════════════ */}
        <header className="cp-header">
          <div className="cp-hdr-left">
            {/* bolt icon as SVG to avoid font flash */}
            <svg width="26" height="26" viewBox="0 0 24 24" fill="#0077b5">
              <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
            </svg>
            <span className="cp-brand">Xwite</span>
          </div>
          <div className="cp-hdr-right">
            <button className="cp-agent-btn" onClick={() => router.push('/agent')}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="m12 2 1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2Z" />
              </svg>
              <span className="cp-agent-text">AI Agent</span>
            </button>
            <button className="cp-msg-btn" onClick={() => router.push('/messages')}>
              {/* chat bubble SVG */}
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0077b5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>
        </header>

        {/* ══════════════════════════
            LEFT SIDEBAR (desktop)
        ══════════════════════════ */}
        <aside className="cp-sidebar-left">
          <div className="cp-sidebar-brand">
            <svg width="26" height="26" viewBox="0 0 24 24" fill="#0077b5">
              <path d="M7 2v11h3v9l7-12h-4l4-8z"/>
            </svg>
            <span className="cp-brand">Xwite</span>
          </div>

          <nav className="cp-sidebar-nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.label}
                className={`cp-nav-item${item.href === '/profile' ? ' active' : ''}`}
                onClick={() => router.push(item.href)}
              >
                {/* Use SVG icons for nav to avoid font flash */}
                <NavIcon name={item.icon} active={item.href === '/profile'} />
                <span className="cp-nav-label">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="cp-sidebar-bottom">
            <button className="cp-nav-item" onClick={() => togglePanel('settings')}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}>
                <path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87a.47.47 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 0 0-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/>
              </svg>
              <span className="cp-nav-label">Settings</span>
            </button>
            <button className="cp-nav-item cp-nav-danger" onClick={handleLogout}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}>
                <path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/>
              </svg>
              <span className="cp-nav-label">Log out</span>
            </button>
          </div>
        </aside>

        {/* ══════════════════════════
            MAIN CONTENT
        ══════════════════════════ */}
        <main className="cp-main">

          {/* ── PROFILE CARD ── */}
          <section className="cp-card">

            {/* COVER — with side margins + rounded corners */}
            <div
              className="cp-cover"
              onClick={() => !coverUploading && coverInputRef.current?.click()}
              role="button"
              aria-label="Change cover photo"
            >
              {pageLoading
                ? <div className="skel cp-cover-inner" />
                : coverSrc
                  ? <img src={coverSrc} alt="Cover" className="cp-cover-img" />
                  : <div className="cp-cover-ph" />
              }
              {coverUploading && <div className="cp-cover-loader"><Spin /></div>}

              {/* Edit Cover pill — top-right of cover */}
              {!pageLoading && (
                <button
                  className="cp-btn-cover"
                  onClick={e => { e.stopPropagation(); coverInputRef.current?.click() }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="#0077b5">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                  Edit Cover
                </button>
              )}
            </div>

            {/* ── BELOW COVER: avatar (left) + Edit Profile (right) ── */}
            {/* This row is BELOW the cover, not overlapping it */}
            <div className="cp-below-cover">

              {/* Avatar — small square, shifted 2px right */}
              <button
                className="cp-avatar"
                onClick={() => !avatarUploading && avatarInputRef.current?.click()}
                aria-label="Change profile photo"
                disabled={avatarUploading}
              >
                {pageLoading
                  ? <div className="skel" style={{width:'100%',height:'100%',borderRadius:12}} />
                  : avatarSrc
                    ? <img src={avatarSrc} alt={name || 'Profile'} />
                    : (
                      <div className="cp-avatar-ph">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="#94a3b8">
                          <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/>
                        </svg>
                      </div>
                    )
                }
                <div className="cp-avatar-hover">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
                    <path d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M20 4h-3.17L15 2H9L7.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/>
                  </svg>
                </div>
                {avatarUploading && <div className="cp-avatar-loader"><Spin light /></div>}
              </button>

              {/* Edit icon — right side, same row as avatar */}
              {!pageLoading && (
                <button
                  className="cp-btn-edit-icon"
                  onClick={() => { setNameDraft(name); setBioDraft(bio); setShowBioModal(true) }}
                  aria-label="Edit profile"
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#0077b5">
                    <path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/>
                  </svg>
                </button>
              )}
            </div>

            {/* Profile info */}
            <div className="cp-profile-info">
              {pageLoading
                ? <ProfileSkeleton />
                : (
                  <>
                    {/* Connections — always visible below avatar */}
                    <p className="cp-conn-count">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#0077b5" style={{flexShrink:0}}>
                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                      </svg>
                      connection. {connections.toLocaleString()}
                    </p>
                    <h1 className="cp-name">{name || 'Your Name'}</h1>

                    {bio && <p className="cp-bio">{bio}</p>}

                    {skills.length > 0 && (
                      <ul className="cp-tags">
                        {skills.map(s => <li key={s} className="cp-tag">{s}</li>)}
                      </ul>
                    )}

                  </>
                )
              }
            </div>
          </section>


          {activePanel === 'settings' && (
            <InlinePanel title="Account Settings" onClose={() => togglePanel('none')}>
              <p className="cp-sec-lbl">Change Password</p>
              <form onSubmit={handleChangePassword} className="cp-form">
                {[
                  { lbl:'Current password', val:oldPw,     set:setOldPw,     ph:'Current password' },
                  { lbl:'New password',      val:newPw,     set:setNewPw,     ph:'Min 8 characters' },
                  { lbl:'Confirm password',  val:confirmPw, set:setConfirmPw, ph:'Repeat new password' },
                ].map(f => (
                  <div key={f.lbl} className="cp-field">
                    <label className="cp-field-lbl">{f.lbl}</label>
                    <input className="cp-input" type="password" value={f.val}
                      onChange={e => f.set(e.target.value)} placeholder={f.ph} />
                  </div>
                ))}
                <PBtn loading={pwLoading} type="submit">Change Password</PBtn>
              </form>
              <div className="cp-divider" />
              <p className="cp-sec-lbl">Session</p>
              <button className="cp-btn-danger" onClick={handleLogout}>Log out</button>
            </InlinePanel>
          )}

          {activePanel === 'addFunds' && (
            <InlinePanel title="Add Funds" onClose={() => togglePanel('none')}>
              <QuickAmounts amounts={QUICK_AMOUNTS} currency={currency} selected={addAmount} onSelect={setAddAmount} />
              <div className="cp-field">
                <label className="cp-field-lbl">Custom amount</label>
                <input className="cp-input" type="number" placeholder={`Amount (${currency})`}
                  value={addAmount} onChange={e => setAddAmount(e.target.value)} min={1} />
              </div>
              <div className="cp-info cp-info-info">Payment gateway opens in production</div>
              <div className="cp-row">
                <PBtn loading={addingFunds} onClick={handleAddFunds}>
                  Add {addAmount ? fmt(Number(addAmount), currency) : 'Funds'}
                </PBtn>
                <SBtn onClick={() => togglePanel('none')}>Cancel</SBtn>
              </div>
            </InlinePanel>
          )}

          {activePanel === 'withdraw' && (
            <InlinePanel title="Withdraw Funds" onClose={() => togglePanel('none')}>
              <div className="cp-bal-row"><span>Available</span><strong>{balanceLabel}</strong></div>
              <QuickAmounts amounts={QUICK_AMOUNTS} currency={currency} selected={withdrawAmount} onSelect={setWithdrawAmount} />
              <div className="cp-field">
                <label className="cp-field-lbl">Amount</label>
                <input className="cp-input" type="number" placeholder="Enter amount"
                  value={withdrawAmount} onChange={e => setWithdrawAmount(e.target.value)}
                  min={1} max={wallet?.balance} />
              </div>
              <div className="cp-info cp-info-warn">Processed within 2–3 business days</div>
              <div className="cp-row">
                <PBtn loading={withdrawing} onClick={handleWithdraw}>Confirm</PBtn>
                <SBtn onClick={() => togglePanel('none')}>Cancel</SBtn>
              </div>
            </InlinePanel>
          )}

          {activePanel === 'switch' && (
            <InlinePanel title="Switch to Freelancer" onClose={() => togglePanel('none')}>
              <p className="cp-panel-desc">Complete freelancer onboarding to set up skills and rates. Your wallet and client profile are preserved.</p>
              <div className="cp-info cp-info-warn">Your balance will be kept safe.</div>
              <div className="cp-row">
                <PBtn onClick={() => router.push('/onboarding/freelancer')}>Continue</PBtn>
                <SBtn onClick={() => togglePanel('none')}>Cancel</SBtn>
              </div>
            </InlinePanel>
          )}

          {/* ── MY POSTS ── */}
          <section className="cp-posts-card">
            <div className="cp-posts-hdr">
              <p className="cp-posts-title">My Posts</p>
              <button className="cp-posts-new" onClick={() => router.push('/post')}>+ New Post</button>
            </div>
            {postsLoading
              ? <div className="skel" style={{height:60,borderRadius:12}} />
              : myPosts.length === 0
                ? (
                  <div className="cp-posts-empty">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="#cbd5e1"><path d="M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-7 3c1.93 0 3.5 1.57 3.5 3.5S13.93 13 12 13s-3.5-1.57-3.5-3.5S10.07 6 12 6zm7 13H5v-.23c0-.62.28-1.2.76-1.58C7.47 15.82 9.64 15 12 15s4.53.82 6.24 2.19c.48.38.76.97.76 1.58V19z"/></svg>
                    <p>No posts yet. Create your first post!</p>
                  </div>
                )
                : (
                  <ul className="cp-posts-list">
                    {myPosts.map((post: any) => (
                      <li key={post.id} className="cp-post-item" onClick={() => router.push(`/post/${post.id}`)}>
                        <div className="cp-post-top">
                          <span className={`cp-post-type ${(post.type ?? '').toLowerCase()}`}>
                            {post.type === 'SKILL_EXCHANGE' ? 'Service' : (post.type ?? 'Post')}
                          </span>
                          <span className="cp-post-date">
                            {post.createdAt ? new Date(post.createdAt).toLocaleDateString('en-IN', {day:'2-digit',month:'short',year:'numeric'}) : ''}
                          </span>
                        </div>
                        <p className="cp-post-title">{post.title}</p>
                        {post.description && <p className="cp-post-desc">{post.description}</p>}
                        <div className="cp-post-meta">
                          {post.budget != null && (
                            <span className="cp-post-budget">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="#0369a1"><path d="M11.8 10.9c-2.27-.59-3-1.2-3-2.15 0-1.09 1.01-1.85 2.7-1.85 1.78 0 2.44.85 2.5 2.1h2.21c-.07-1.72-1.12-3.3-3.21-3.81V3h-3v2.16c-1.94.42-3.5 1.68-3.5 3.61 0 2.31 1.91 3.46 4.7 4.13 2.5.6 3 1.48 3 2.41 0 .69-.49 1.79-2.7 1.79-2.06 0-2.87-.92-2.98-2.1h-2.2c.12 2.19 1.76 3.42 3.68 3.83V21h3v-2.15c1.95-.37 3.5-1.5 3.5-3.55 0-2.84-2.43-3.81-4.7-4.4z"/></svg>
                              {fmt(post.budget, 'INR')}
                            </span>
                          )}
                          {post._count?.proposals != null && (
                            <span className="cp-post-proposals">{post._count.proposals} proposal{post._count.proposals !== 1 ? 's' : ''}</span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )
            }
          </section>
        </main>

        {/* ══════════════════════════
            RIGHT SIDEBAR (desktop)
        ══════════════════════════ */}
        <aside className="cp-sidebar-right">

          {/* Agent + Messaging */}
          <div className="cp-right-hdr">
            <button className="cp-agent-btn" onClick={() => router.push('/agent')}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="m12 2 1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2Z" /></svg>
              AI Agent
            </button>
            <button className="cp-msg-btn" onClick={() => router.push('/messages')}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0077b5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>

          {/* Wallet */}
          <div className="cp-wallet">
            <div className="cp-wallet-head">
              <p className="cp-wallet-lbl">Available Balance</p>
              <button className="cp-wallet-icon" onClick={() => togglePanel('addFunds')}>
                <svg width="22" height="22" viewBox="0 0 24 24" fill="#005d8f">
                  <path d="M21 18v1c0 1.1-.9 2-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14c1.1 0 2 .9 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9zm-9-2h10V8H12v8zm4-2.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/>
                </svg>
              </button>
            </div>
            {walletLoading
              ? <div className="skel" style={{height:36,width:130,marginTop:10,borderRadius:8}} />
              : <p className="cp-wallet-amt">{balanceLabel}</p>
            }
            {!walletLoading && escrowLabel && (
              <p className="cp-wallet-escrow">{escrowLabel}</p>
            )}
            <button className="cp-btn-withdraw" onClick={() => togglePanel('withdraw')}>
              Withdraw Funds
            </button>
            <button className="cp-btn-add" onClick={() => togglePanel('addFunds')}>
              + Add Funds
            </button>
          </div>

          {/* Connected people */}
          <div className="cp-conn-card">
            <p className="cp-conn-title">People Connected</p>
            {connectedUsers.length === 0
              ? <p className="cp-conn-empty">No connections yet</p>
              : (
                <ul className="cp-conn-list">
                  {connectedUsers.map(u => (
                    <li key={u.id} className="cp-conn-item">
                      <div className="cp-conn-av">
                        {u.profileImage
                          ? <img src={u.profileImage} alt={u.fullName ?? ''} />
                          : <svg width="18" height="18" viewBox="0 0 24 24" fill="#94a3b8"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
                        }
                      </div>
                      <span className="cp-conn-name">{u.fullName ?? u.email ?? 'User'}</span>
                    </li>
                  ))}
                </ul>
              )
            }
            {connections > 3 && (
              <button className="cp-conn-more" onClick={() => router.push('/network')}>
                View all
              </button>
            )}
          </div>

          {/* Task Accordions */}
          <div className="cp-accord-wrap">

            {/* Completed Tasks */}
            <div className="cp-accord">
              <button className="cp-accord-hdr" onClick={() => setOpenCompleted(p => !p)}>
                <div className="cp-accord-left">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#16a34a"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                  <span>Completed Tasks</span>
                  <span className="cp-accord-badge">{completedTasks.length}</span>
                </div>
                <svg className={`cp-accord-chev${openCompleted?' open':''}`} width="16" height="16" viewBox="0 0 24 24" fill="#94a3b8"><path d="M7 10l5 5 5-5z"/></svg>
              </button>
              {openCompleted && (
                <div className="cp-accord-body">
                  {tasksLoading
                    ? <div className="skel" style={{height:40,borderRadius:8}} />
                    : completedTasks.length === 0
                      ? <p className="cp-accord-empty">No completed tasks</p>
                      : completedTasks.map((t: any, i: number) => (
                        <div key={t.id ?? i} className="cp-accord-item">
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="#16a34a"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/></svg>
                          <span>{t.task?.title ?? t.title ?? 'Task'}</span>
                        </div>
                      ))
                  }
                </div>
              )}
            </div>

            {/* In Progress Tasks */}
            <div className="cp-accord">
              <button className="cp-accord-hdr" onClick={() => setOpenInProgress(p => !p)}>
                <div className="cp-accord-left">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#d97706"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
                  <span>In Progress</span>
                  <span className="cp-accord-badge inprog">{inProgressTasks.length}</span>
                </div>
                <svg className={`cp-accord-chev${openInProgress?' open':''}`} width="16" height="16" viewBox="0 0 24 24" fill="#94a3b8"><path d="M7 10l5 5 5-5z"/></svg>
              </button>
              {openInProgress && (
                <div className="cp-accord-body">
                  {tasksLoading
                    ? <div className="skel" style={{height:40,borderRadius:8}} />
                    : inProgressTasks.length === 0
                      ? <p className="cp-accord-empty">No tasks in progress</p>
                      : inProgressTasks.map((t: any, i: number) => (
                        <div key={t.id ?? i} className="cp-accord-item">
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="#d97706"><circle cx="12" cy="12" r="10"/></svg>
                          <span>{t.task?.title ?? t.title ?? 'Task'}</span>
                          <span className="cp-accord-status">{t.status}</span>
                        </div>
                      ))
                  }
                </div>
              )}
            </div>

            {/* Requests (received proposals) */}
            <div className="cp-accord">
              <button className="cp-accord-hdr" onClick={() => setOpenRequests(p => !p)}>
                <div className="cp-accord-left">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="#0077b5"><path d="M20 2H4a2 2 0 0 0-2 2v18l4-4h14a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2z"/></svg>
                  <span>Requests</span>
                  <span className="cp-accord-badge req">{requests.length}</span>
                </div>
                <svg className={`cp-accord-chev${openRequests?' open':''}`} width="16" height="16" viewBox="0 0 24 24" fill="#94a3b8"><path d="M7 10l5 5 5-5z"/></svg>
              </button>
              {openRequests && (
                <div className="cp-accord-body">
                  {tasksLoading
                    ? <div className="skel" style={{height:40,borderRadius:8}} />
                    : requests.length === 0
                      ? <p className="cp-accord-empty">No pending proposals</p>
                      : requests.map((r: any, i: number) => (
                        <div key={r.id ?? i} className="cp-accord-item cp-accord-req" onClick={() => r.postId && router.push(`/post/${r.postId}`)}>
                          <div className="cp-accord-req-av">
                            {(r.freelancer?.freelancerProfile?.profileImage || r.freelancer?.companyProfile?.profileImage || r.freelancer?.clientProfile?.profileImage)
                              ? <img src={r.freelancer?.freelancerProfile?.profileImage || r.freelancer?.companyProfile?.profileImage || r.freelancer?.clientProfile?.profileImage} alt="" />
                              : <svg width="14" height="14" viewBox="0 0 24 24" fill="#94a3b8"><path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z"/></svg>
                            }
                          </div>
                          <div style={{flex:1,minWidth:0}}>
                            <p className="cp-accord-req-name">{r.freelancer?.freelancerProfile?.fullName ?? r.freelancer?.companyProfile?.companyName ?? r.freelancer?.clientProfile?.fullName ?? r.freelancer?.email ?? 'Freelancer'}</p>
                            <p className="cp-accord-req-post">{r.post?.title ?? 'Proposal'}</p>
                          </div>
                          {r.proposedRate != null && (
                            <span className="cp-accord-req-rate">{fmt(r.proposedRate, 'INR')}</span>
                          )}
                        </div>
                      ))
                  }
                </div>
              )}
            </div>
          </div>

          {/* Switch Account */}
          <button className="cp-switch" onClick={() => togglePanel('switch')}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#0077b5"><path d="M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/></svg>
            <div>
              <p className="cp-switch-title">Switch Account</p>
              <p className="cp-switch-sub">Switch to Freelancer</p>
            </div>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#94a3b8" style={{marginLeft:'auto'}}><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"/></svg>
          </button>
        </aside>

        {/* ══════════════════════════
            MOBILE BOTTOM NAV
        ══════════════════════════ */}
        <nav className="cp-mobile-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.label}
              className={`cp-mob-item${item.href === '/profile' ? ' active' : ''}`}
              onClick={() => router.push(item.href)}
            >
              <NavIcon name={item.icon} active={item.href === '/profile'} size={item.icon === 'add_box' ? 28 : 22} />
              {item.icon !== 'add_box' && <span className="cp-mob-label">{item.label}</span>}
            </button>
          ))}
        </nav>

      </div>
    </>
  )
}

/* ═══════════════════════════════════════════
   SVG NAV ICONS — no font dependency, no flash
═══════════════════════════════════════════ */
function NavIcon({ name, active = false, size = 22 }: { name: string; active?: boolean; size?: number }) {
  const col = active ? '#0077b5' : 'currentColor'
  const paths: Record<string, string> = {
    home:          active
      ? 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z'
      : 'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    group:         'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    add_box:       'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z',
    notifications: active
      ? 'M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z'
      : 'M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
    person:        active
      ? 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z'
      : 'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  }
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={col} style={{flexShrink:0}}>
      <path d={paths[name] ?? ''} />
    </svg>
  )
}

/* ═══════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════ */
function Spin({ light = false }: { light?: boolean }) {
  return (
    <div style={{
      width:20, height:20, borderRadius:'50%',
      border:`3px solid ${light ? 'rgba(255,255,255,0.25)' : 'rgba(0,119,181,0.18)'}`,
      borderTopColor: light ? '#fff' : '#0077b5',
      animation:'cp-spin .7s linear infinite', flexShrink:0,
    }} />
  )
}

function ProfileSkeleton() {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div className="skel" style={{height:12,width:110,borderRadius:6}} />
      <div className="skel" style={{height:26,width:'55%',borderRadius:6}} />
      <div className="skel" style={{height:13,width:'90%',borderRadius:6}} />
      <div className="skel" style={{height:13,width:'70%',borderRadius:6}} />
      <div style={{display:'flex',gap:8,marginTop:2}}>
        {[80,110,90].map(w=><div key={w} className="skel" style={{height:28,width:w,borderRadius:999}}/>)}
      </div>
      <div className="skel" style={{height:46,borderRadius:12,marginTop:2}} />
    </div>
  )
}

function BioModal({ draft, nameDraft, saving, onChange, onNameChange, onSave, onClose }: {
  draft:string; nameDraft:string; saving:boolean
  onChange:(v:string)=>void; onNameChange:(v:string)=>void; onSave:()=>void; onClose:()=>void
}) {
  return (
    <div className="cp-modal-ov" onClick={e=>{if(e.target===e.currentTarget)onClose()}}
      role="dialog" aria-modal="true">
      <div className="cp-modal">
        <div className="cp-modal-hdr">
          <h2 className="cp-modal-h">Edit Profile</h2>
          <button className="cp-modal-x" onClick={onClose}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#94a3b8">
              <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>
        <div className="cp-field" style={{marginBottom:12}}>
          <label className="cp-field-lbl">Name</label>
          <input className="cp-input" type="text" value={nameDraft} maxLength={80}
            onChange={e=>onNameChange(e.target.value)} placeholder="Your name" />
        </div>
        <div className="cp-field">
          <label className="cp-field-lbl">Bio</label>
          <textarea className="cp-modal-ta" rows={4} value={draft} maxLength={500}
            onChange={e=>onChange(e.target.value)} placeholder="Tell people about yourself..." />
          <p className="cp-modal-count">{draft.length}/500</p>
        </div>
        <div className="cp-row" style={{marginTop:4}}>
          <PBtn loading={saving} onClick={onSave}>Save</PBtn>
          <SBtn onClick={onClose}>Cancel</SBtn>
        </div>
      </div>
    </div>
  )
}

function InlinePanel({ title, children, onClose }: {
  title:string; children:React.ReactNode; onClose:()=>void
}) {
  return (
    <div className="cp-panel">
      <div className="cp-panel-hdr">
        <h3 className="cp-panel-h">{title}</h3>
        <button className="cp-panel-x" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#94a3b8">
            <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      <div className="cp-panel-body">{children}</div>
    </div>
  )
}

function QuickAmounts({ amounts, currency, selected, onSelect }: {
  amounts:number[]; currency:'INR'|'USD'; selected:string; onSelect:(v:string)=>void
}) {
  return (
    <div className="cp-quick-wrap">
      {amounts.map(a=>(
        <button key={a} type="button"
          className={`cp-quick${selected===String(a)?' active':''}`}
          onClick={()=>onSelect(String(a))}>
          {fmt(a,currency)}
        </button>
      ))}
    </div>
  )
}

function PBtn({ children, loading=false, onClick, type='button' as const }: {
  children:React.ReactNode; loading?:boolean; onClick?:()=>void; type?:'button'|'submit'
}) {
  return (
    <button className="cp-btn-p" type={type} onClick={onClick} disabled={loading}>
      {loading ? <><Spin light />&nbsp;Processing…</> : children}
    </button>
  )
}
function SBtn({ children, onClick }: { children:React.ReactNode; onClick:()=>void }) {
  return <button className="cp-btn-s" type="button" onClick={onClick}>{children}</button>
}


/* ═══════════════════════════════════════════
   IMAGE EDITOR MODAL
   — crop (drag to pan), zoom, brightness,
     contrast, saturation, filter presets
═══════════════════════════════════════════ */
/* ═══════════════════════════════════════════════════════════════
   IMAGE EDITOR MODAL  —  LinkedIn-style layout
   Left:  image fills crop window, drag image to reposition,
          rule-of-thirds grid overlay, fixed crop frame border
   Right: Crop / Filter / Adjust tabs
          Zoom + Straighten sliders (Crop tab)
          8 filter swatches (Filter tab)
          Brightness / Contrast / Saturation sliders (Adjust tab)
   Palette: cream / sand / amber — no dark backgrounds
════════════════════════════════════════════════════════════════ */
function ImageEditorModal({ file, isCover, onDone, onCancel }: {
  file:     File
  isCover:  boolean
  onDone:   (blob: Blob) => void
  onCancel: () => void
}) {
  /* ── Output dimensions ── */
  const OUT_W = isCover ? 1584 : 400
  const OUT_H = isCover ? 396  : 400

  /* ── Preview window dimensions (the fixed crop frame on screen) ── */
  const PREV_W = isCover ? 560 : 360
  const PREV_H = isCover ? 210 : 360   // maintains output aspect ratio visually

  /* ── Palette ── */
  const cream  = '#fdf6ee'
  const sand   = '#f0e8dc'
  const sand2  = '#e8ddd0'
  const amber  = '#c9873a'
  const amberD = '#a86e2a'
  const ink    = '#2d1f0e'
  const muted  = '#8c7355'
  const light  = '#f7f0e8'

  /* ── Refs ── */
  const exportCanvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef          = useRef<HTMLImageElement | null>(null)
  const dragging        = useRef(false)
  const lastMouse       = useRef({ x: 0, y: 0 })

  /* ── State ── */
  const [imgUrl,     setImgUrl]     = useState('')
  const [imgNW,      setImgNW]      = useState(0)   // natural width
  const [imgNH,      setImgNH]      = useState(0)
  const [offsetX,    setOffsetX]    = useState(0)   // image pan in screen px
  const [offsetY,    setOffsetY]    = useState(0)
  const [zoom,       setZoom]       = useState(1)   // 1 = fill frame exactly
  const [straighten, setStraighten] = useState(0)   // degrees −45..+45
  const [brightness, setBrightness] = useState(100)
  const [contrast,   setContrast]   = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [filter,     setFilter]     = useState('Normal')
  const [tab,        setTab]        = useState<'crop'|'filter'|'adjust'>('crop')
  const [saving,     setSaving]     = useState(false)

  /* Refs that mirror state for use inside event handlers (avoid stale closures) */
  const offsetXRef    = useRef(0)
  const offsetYRef    = useRef(0)
  const zoomRef       = useRef(1)

  const FILTER_PRESETS = [
    { name:'Normal', css:'' },
    { name:'Vivid',  css:'saturate(1.6) contrast(1.1)' },
    { name:'Warm',   css:'sepia(0.3) saturate(1.4) brightness(1.05)' },
    { name:'Cool',   css:'hue-rotate(20deg) saturate(0.9) brightness(1.05)' },
    { name:'Fade',   css:'brightness(1.1) contrast(0.85) saturate(0.75)' },
    { name:'Mono',   css:'grayscale(1)' },
    { name:'Drama',  css:'contrast(1.3) brightness(0.9) saturate(1.2)' },
    { name:'Matte',  css:'contrast(0.9) brightness(1.05) saturate(0.8)' },
  ]

  /* ── Load image ── */
  useEffect(() => {
    const url = URL.createObjectURL(file)
    setImgUrl(url)
    const img = new Image()
    img.onload = () => {
      imgRef.current = img
      setImgNW(img.naturalWidth)
      setImgNH(img.naturalHeight)
      /* Initial zoom: fill the preview window (cover all of PREV_W × PREV_H) */
      const z = Math.max(PREV_W / img.naturalWidth, PREV_H / img.naturalHeight)
      setZoom(z); zoomRef.current = z
      /* Centre the image in the frame */
      const ox = (PREV_W - img.naturalWidth  * z) / 2
      const oy = (PREV_H - img.naturalHeight * z) / 2
      setOffsetX(ox); offsetXRef.current = ox
      setOffsetY(oy); offsetYRef.current = oy
    }
    img.src = url
    return () => URL.revokeObjectURL(url)
  }, [])

  /* ── Keep refs in sync ── */
  useEffect(() => { offsetXRef.current = offsetX }, [offsetX])
  useEffect(() => { offsetYRef.current = offsetY }, [offsetY])
  useEffect(() => { zoomRef.current    = zoom    }, [zoom])

  /* ── Min zoom: image must always cover the full frame ── */
  function minZoom() {
    if (!imgNW || !imgNH) return 1
    return Math.max(PREV_W / imgNW, PREV_H / imgNH)
  }

  /* ── Clamp offset so image always covers the preview frame ── */
  function clampOffset(ox: number, oy: number, z: number) {
    if (!imgNW || !imgNH) return { ox, oy }
    const scaledW = imgNW * z
    const scaledH = imgNH * z
    const minX = PREV_W - scaledW   // right edge of image at right edge of frame
    const minY = PREV_H - scaledH
    return {
      ox: Math.min(0, Math.max(ox, minX)),
      oy: Math.min(0, Math.max(oy, minY)),
    }
  }

  /* ── Drag image to reposition ── */
  function onImgPointerDown(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current = true
    lastMouse.current = { x: e.clientX, y: e.clientY }
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
    e.preventDefault()
  }
  function onImgPointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return
    const dx = e.clientX - lastMouse.current.x
    const dy = e.clientY - lastMouse.current.y
    lastMouse.current = { x: e.clientX, y: e.clientY }
    const newOx = offsetXRef.current + dx
    const newOy = offsetYRef.current + dy
    const { ox, oy } = clampOffset(newOx, newOy, zoomRef.current)
    setOffsetX(ox); offsetXRef.current = ox
    setOffsetY(oy); offsetYRef.current = oy
  }
  function onImgPointerUp() { dragging.current = false }

  /* ── Zoom change — keep image centred and clamped ── */
  function handleZoom(newZ: number) {
    const z = Math.max(minZoom(), newZ)
    zoomRef.current = z
    /* Re-centre around current visible midpoint */
    const midX = PREV_W / 2
    const midY = PREV_H / 2
    const imgMidX = (midX - offsetXRef.current) / zoomRef.current
    const imgMidY = (midY - offsetYRef.current) / zoomRef.current
    const newOx   = midX - imgMidX * z
    const newOy   = midY - imgMidY * z
    const { ox, oy } = clampOffset(newOx, newOy, z)
    setZoom(z)
    setOffsetX(ox); offsetXRef.current = ox
    setOffsetY(oy); offsetYRef.current = oy
  }

  /* ── CSS filter string ── */
  function cssFilter() {
    let f = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
    if (straighten !== 0) f += ` rotate(${straighten}deg)`
    const p = FILTER_PRESETS.find(p => p.name === filter)
    if (p?.css) f += ' ' + p.css
    return f
  }

  /* ── Export: draw the visible crop region to canvas ── */
  async function handleSave() {
    const img = imgRef.current
    if (!img) return
    setSaving(true)
    const canvas = exportCanvasRef.current!
    canvas.width  = OUT_W
    canvas.height = OUT_H

    /* Convert screen-space offset to source image coordinates */
    const z     = zoomRef.current
    const srcX  = -offsetXRef.current / z
    const srcY  = -offsetYRef.current / z
    const srcW  = PREV_W / z
    const srcH  = PREV_H / z

    const ctx = canvas.getContext('2d')!
    ctx.filter = cssFilter()
    if (straighten !== 0) {
      ctx.translate(OUT_W / 2, OUT_H / 2)
      ctx.rotate((straighten * Math.PI) / 180)
      ctx.translate(-OUT_W / 2, -OUT_H / 2)
    }
    ctx.drawImage(img, srcX, srcY, srcW, srcH, 0, 0, OUT_W, OUT_H)
    ctx.filter = 'none'

    await new Promise(r => setTimeout(r, 40))
    canvas.toBlob(blob => {
      if (blob) onDone(blob)
      else { toast.error('Export failed'); setSaving(false) }
    }, 'image/webp', 0.93)
  }

  /* ── Reset ── */
  function handleReset() {
    if (!imgRef.current || !imgNW) return
    const z = Math.max(PREV_W / imgNW, PREV_H / imgNH)
    const ox = (PREV_W - imgNW * z) / 2
    const oy = (PREV_H - imgNH * z) / 2
    setZoom(z); zoomRef.current = z
    setOffsetX(ox); offsetXRef.current = ox
    setOffsetY(oy); offsetYRef.current = oy
    setStraighten(0); setBrightness(100); setContrast(100); setSaturation(100); setFilter('Normal')
  }

  /* ── Scaled image size ── */
  const scaledW = imgNW * zoom
  const scaledH = imgNH * zoom

  return (
    <div style={{
      position:'fixed', inset:0, zIndex:10000,
      background:'rgba(0,0,0,0.5)',
      display:'flex', alignItems:'center', justifyContent:'center',
      padding:'0',
    }}>
      <canvas ref={exportCanvasRef} style={{display:'none'}} />

      {/* Modal container — full white/cream */}
      <div style={{
        background:'#ffffff',
        borderRadius:16,
        width:'100%',
        maxWidth: isCover ? 900 : 760,
        maxHeight:'95dvh',
        display:'flex',
        flexDirection:'column',
        boxShadow:'0 24px 80px rgba(0,0,0,0.28)',
        overflow:'hidden',
        fontFamily:'Manrope,Inter,sans-serif',
      }}>

        {/* ── Title bar ── */}
        <div style={{
          display:'flex', alignItems:'center', justifyContent:'space-between',
          padding:'16px 20px',
          borderBottom:`1px solid ${sand}`,
          background:'#fff',
          flexShrink:0,
        }}>
          <h3 style={{fontSize:16, fontWeight:700, color:ink, margin:0}}>
            Edit image
          </h3>
          <button onClick={onCancel} style={{
            background:'none', border:'none', cursor:'pointer',
            color:muted, padding:4,
            display:'flex', alignItems:'center', justifyContent:'center',
            borderRadius:6,
          }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill={ink}>
              <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* ── Body: left image + right panel ── */}
        <div style={{display:'flex', flex:1, overflow:'hidden', minHeight:0}}>

          {/* ── LEFT: crop preview window ── */}
          <div style={{
            flex:1, minWidth:0,
            background:'#e8e4de',
            display:'flex', alignItems:'center', justifyContent:'center',
            overflow:'hidden',
            position:'relative',
          }}>
            {/* Fixed-size crop window */}
            <div
              onPointerDown={onImgPointerDown}
              onPointerMove={onImgPointerMove}
              onPointerUp={onImgPointerUp}
              onPointerCancel={onImgPointerUp}
              style={{
                position:'relative',
                width: PREV_W,
                height: PREV_H,
                overflow:'hidden',
                cursor: dragging.current ? 'grabbing' : 'grab',
                flexShrink:0,
                userSelect:'none',
              }}
            >
              {/* The image — draggable, positioned by offset */}
              {imgUrl && (
                <img
                  src={imgUrl}
                  alt=""
                  draggable={false}
                  style={{
                    position:'absolute',
                    left: offsetX,
                    top:  offsetY,
                    width:  scaledW,
                    height: scaledH,
                    filter: cssFilter(),
                    transformOrigin:'center center',
                    userSelect:'none',
                    pointerEvents:'none',
                  }}
                />
              )}

              {/* Rule-of-thirds grid — 2 horizontal + 2 vertical lines */}
              {[1,2].map(i => (
                <div key={`h${i}`} style={{
                  position:'absolute',
                  left:0, right:0,
                  top: `${(i/3)*100}%`,
                  height:1,
                  background:'rgba(255,255,255,0.55)',
                  pointerEvents:'none',
                }}/>
              ))}
              {[1,2].map(i => (
                <div key={`v${i}`} style={{
                  position:'absolute',
                  top:0, bottom:0,
                  left: `${(i/3)*100}%`,
                  width:1,
                  background:'rgba(255,255,255,0.55)',
                  pointerEvents:'none',
                }}/>
              ))}

              {/* Crop frame border */}
              <div style={{
                position:'absolute', inset:0,
                border:`2px solid rgba(255,255,255,0.85)`,
                borderRadius: isCover ? 0 : 0,
                pointerEvents:'none',
                boxSizing:'border-box',
              }}/>
            </div>
          </div>

          {/* ── RIGHT: tab panel ── */}
          <div style={{
            width:220,
            flexShrink:0,
            background:'#ffffff',
            borderLeft:`1px solid ${sand}`,
            display:'flex',
            flexDirection:'column',
            overflow:'hidden',
          }}>

            {/* Tab bar */}
            <div style={{
              display:'flex',
              borderBottom:`1px solid ${sand}`,
              flexShrink:0,
            }}>
              {(['crop','filter','adjust'] as const).map(t => (
                <button key={t} onClick={()=>setTab(t)} style={{
                  flex:1, padding:'14px 4px',
                  border:'none', background:'none',
                  fontSize:13, fontWeight:700,
                  color: tab===t ? ink : muted,
                  cursor:'pointer',
                  borderBottom: tab===t ? `2.5px solid ${ink}` : '2.5px solid transparent',
                  fontFamily:'Manrope,sans-serif',
                  transition:'color .15s',
                }}>
                  {t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>

            {/* Tab content — scrollable */}
            <div style={{flex:1, overflowY:'auto', padding:'16px 16px 20px'}}>

              {/* ── CROP TAB ── */}
              {tab==='crop' && (
                <div style={{display:'flex',flexDirection:'column',gap:20}}>

                  {/* Action icons row */}
                  <div style={{display:'flex',gap:8,justifyContent:'center'}}>
                    {[
                      { title:'Rotate left',  path:'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z', action:()=>setStraighten(p=>Math.max(-45,p-90)) },
                      { title:'Rotate right', path:'M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z', action:()=>setStraighten(p=>Math.min(45,p+90)) },
                      { title:'Flip H',       path:'M15 21h2v-2h-2v2zm4-12h2V7h-2v2zM3 5v14a2 2 0 0 0 2 2h4v-2H5V5h4V3H5a2 2 0 0 0-2 2zm16-2v2h2a2 2 0 0 0-2-2zm-8 20h2V1h-2v22zm8-6h2v-2h-2v2zM15 5h2V3h-2v2zm4 8h2v-2h-2v2zm0 8a2 2 0 0 0 2-2h-2v2z', action:()=>{} },
                      { title:'Reset',        path:'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z', action:handleReset },
                    ].map((btn,i)=>(
                      <button key={i} title={btn.title} onClick={btn.action} style={{
                        width:36,height:36,borderRadius:8,
                        border:`1px solid ${sand2}`,background:light,
                        cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center',
                        transition:'background .15s',
                      }}>
                        <svg width="18" height="18" viewBox="0 0 24 24" fill={muted}><path d={btn.path}/></svg>
                      </button>
                    ))}
                  </div>

                  {/* Zoom */}
                  <div>
                    <p style={{fontSize:13,fontWeight:600,color:ink,margin:'0 0 10px',fontFamily:'Manrope,sans-serif'}}>Zoom</p>
                    <input type="range"
                      min={Math.round(minZoom()*100)}
                      max={400}
                      step={1}
                      value={Math.round(zoom*100)}
                      onChange={e=>handleZoom(Number(e.target.value)/100)}
                      style={{
                        width:'100%',height:4,borderRadius:999,
                        appearance:'none',WebkitAppearance:'none',
                        background:`linear-gradient(to right,${ink} ${((zoom*100-minZoom()*100)/(400-minZoom()*100))*100}%,${sand2} ${((zoom*100-minZoom()*100)/(400-minZoom()*100))*100}%)`,
                        cursor:'pointer',outline:'none',
                      }}
                    />
                  </div>

                  {/* Straighten */}
                  <div>
                    <p style={{fontSize:13,fontWeight:600,color:ink,margin:'0 0 10px',fontFamily:'Manrope,sans-serif'}}>Straighten</p>
                    <input type="range"
                      min={-45} max={45} step={0.5}
                      value={straighten}
                      onChange={e=>setStraighten(Number(e.target.value))}
                      style={{
                        width:'100%',height:4,borderRadius:999,
                        appearance:'none',WebkitAppearance:'none',
                        background:`linear-gradient(to right,${sand2} ${((straighten+45)/90)*100}%,${ink} ${((straighten+45)/90)*100}%)`,
                        cursor:'pointer',outline:'none',
                      }}
                    />
                    <p style={{fontSize:11,color:muted,margin:'6px 0 0',textAlign:'right',fontFamily:'Manrope,sans-serif'}}>
                      {straighten > 0 ? `+${straighten}°` : `${straighten}°`}
                    </p>
                  </div>
                </div>
              )}

              {/* ── FILTER TAB ── */}
              {tab==='filter' && (
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10}}>
                  {FILTER_PRESETS.map(p=>(
                    <button key={p.name} onClick={()=>setFilter(p.name)} style={{
                      padding:'8px 6px',borderRadius:10,cursor:'pointer',
                      border:filter===p.name ? `2px solid ${amber}` : `1.5px solid ${sand2}`,
                      background:filter===p.name ? '#fef3e2' : '#fafaf8',
                      display:'flex',flexDirection:'column',alignItems:'center',gap:6,
                      transition:'all .15s',
                    }}>
                      <div style={{
                        width:'100%',height:44,borderRadius:6,
                        background:'linear-gradient(135deg,#d4b896 0%,#a8c4a8 50%,#8ab0c8 100%)',
                        filter:p.css||'none',
                        border:filter===p.name?`1.5px solid ${amber}`:`1px solid ${sand2}`,
                      }}/>
                      <span style={{
                        fontSize:10,fontWeight:800,letterSpacing:'.04em',textTransform:'uppercase',
                        color:filter===p.name?amber:muted,fontFamily:'Manrope,sans-serif',
                      }}>{p.name}</span>
                    </button>
                  ))}
                </div>
              )}

              {/* ── ADJUST TAB ── */}
              {tab==='adjust' && (
                <div style={{display:'flex',flexDirection:'column',gap:20}}>
                  {([
                    {label:'Brightness',val:brightness,set:setBrightness,min:40,max:200},
                    {label:'Contrast',  val:contrast,  set:setContrast,  min:40,max:200},
                    {label:'Saturation',val:saturation,set:setSaturation,min:0, max:200},
                  ] as {label:string,val:number,set:(n:number)=>void,min:number,max:number}[]).map(sl=>(
                    <div key={sl.label}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:10}}>
                        <span style={{fontSize:13,fontWeight:600,color:ink,fontFamily:'Manrope,sans-serif'}}>{sl.label}</span>
                        <span style={{fontSize:12,fontWeight:700,color:amber,fontFamily:'Manrope,sans-serif'}}>{sl.val}%</span>
                      </div>
                      <input type="range" min={sl.min} max={sl.max} step={1} value={sl.val}
                        onChange={e=>sl.set(Number(e.target.value))}
                        style={{
                          width:'100%',height:4,borderRadius:999,
                          appearance:'none',WebkitAppearance:'none',
                          background:`linear-gradient(to right,${amber} ${((sl.val-sl.min)/(sl.max-sl.min))*100}%,${sand2} ${((sl.val-sl.min)/(sl.max-sl.min))*100}%)`,
                          cursor:'pointer',outline:'none',
                        }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ── Footer ── */}
        <div style={{
          display:'flex',justifyContent:'flex-end',gap:10,
          padding:'12px 20px',
          borderTop:`1px solid ${sand}`,
          background:'#fff',
          flexShrink:0,
        }}>
          <button onClick={onCancel} style={{
            padding:'10px 22px',background:'#f1f1ef',color:ink,
            border:'none',borderRadius:8,fontSize:14,fontWeight:600,
            cursor:'pointer',fontFamily:'Manrope,sans-serif',
          }}>
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving} style={{
            padding:'10px 28px',background:saving?amberD:amber,
            color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:700,
            cursor:saving?'not-allowed':'pointer',fontFamily:'Manrope,sans-serif',
            display:'flex',alignItems:'center',gap:8,
            opacity:saving?0.85:1,transition:'all .15s',
          }}>
            {saving
              ? <><div style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.35)',borderTopColor:'#fff',animation:'cp-spin .7s linear infinite'}}/> Saving…</>
              : 'Save'
            }
          </button>
        </div>
      </div>
    </div>
  )
}

/* Reusable slider row for the editor */
function Slider({ label, icon, value, min, max, step, display, onChange }: {
  label:string; icon:string; value:number; min:number; max:number; step:number
  display:string; onChange:(v:number)=>void
}) {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:6}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
        <span style={{fontSize:12,fontWeight:700,color:'#475569',fontFamily:'Manrope,sans-serif',display:'flex',alignItems:'center',gap:5}}>
          {icon} {label}
        </span>
        <span style={{fontSize:12,fontWeight:700,color:'#0077b5',fontFamily:'Manrope,sans-serif',minWidth:40,textAlign:'right'}}>
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min} max={max} step={step}
        value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{
          width:'100%', height:4, borderRadius:999,
          appearance:'none', WebkitAppearance:'none',
          background:`linear-gradient(to right, #0077b5 ${((value-min)/(max-min))*100}%, #e2e8f0 ${((value-min)/(max-min))*100}%)`,
          cursor:'pointer', outline:'none',
        }}
      />
    </div>
  )
}

/* ═══════════════════════════════════════════
   STYLES
═══════════════════════════════════════════ */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600&family=Manrope:wght@400;500;600;700;800&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

@keyframes cp-spin{to{transform:rotate(360deg);}}
@keyframes cp-shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
.skel{background:linear-gradient(90deg,#e8eaed 25%,#f5f5f5 50%,#e8eaed 75%);background-size:1200px 100%;animation:cp-shimmer 1.4s ease infinite;}

/* ── ROOT GRID ── */
.cp-root{
  display:grid;
  grid-template-areas:"header""main""mobile-nav";
  grid-template-rows:60px 1fr 60px;
  grid-template-columns:1fr;
  background:#f1f5f9;
  min-height:100dvh;
  font-family:'Manrope','Inter',sans-serif;
  color:#0f172a;
}
@media(min-width:900px){
  .cp-root{
    grid-template-areas:"left-sidebar main right-sidebar";
    grid-template-columns:230px 1fr 260px;
    grid-template-rows:1fr;
  }
}

/* ── MOBILE HEADER ── */
.cp-header{
  grid-area:header;
  display:flex;align-items:center;justify-content:space-between;
  padding:0 18px;background:#fff;
  border-bottom:1px solid #e2e8f0;
  box-shadow:0 1px 4px rgba(0,0,0,0.05);
  position:sticky;top:0;z-index:100;
}
@media(min-width:900px){.cp-header{display:none;}}
.cp-hdr-left{display:flex;align-items:center;gap:7px;}
.cp-brand{font-size:19px;font-weight:800;color:#0077b5;letter-spacing:-0.02em;}
.cp-hdr-right{display:flex;align-items:center;gap:10px;}

/* ── AGENT BUTTON ── */
.cp-agent-btn{
  display:flex;align-items:center;gap:6px;
  background:linear-gradient(135deg,#0077b5,#005d8f);
  color:#fff;border:none;border-radius:999px;
  padding:8px 14px;font-size:13px;font-weight:700;
  cursor:pointer;font-family:'Manrope',sans-serif;
  box-shadow:0 2px 8px rgba(0,119,181,0.3);
  transition:transform .15s;
}
.cp-agent-btn:active{transform:scale(.95);}
.cp-agent-text{display:none;}
@media(min-width:380px){.cp-agent-text{display:inline;}}

/* ── MSG BUTTON ── */
.cp-msg-btn{
  position:relative;width:40px;height:40px;border-radius:50%;
  border:1.5px solid #e2e8f0;background:#fff;
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;box-shadow:0 1px 5px rgba(0,0,0,0.07);
  transition:transform .15s;
}
.cp-msg-btn:active{transform:scale(.93);}
.cp-msg-dot{
  position:absolute;top:6px;right:7px;width:8px;height:8px;
  border-radius:50%;background:transparent;border:1.5px solid #94a3b8;
}

/* ── LEFT SIDEBAR ── */
.cp-sidebar-left{display:none;grid-area:left-sidebar;}
@media(min-width:900px){
  .cp-sidebar-left{
    display:flex;flex-direction:column;
    background:#fff;border-right:1px solid #e2e8f0;
    padding:24px 14px;
    position:sticky;top:0;height:100dvh;overflow-y:auto;
  }
}
.cp-sidebar-brand{display:flex;align-items:center;gap:8px;padding:0 8px;margin-bottom:24px;}
.cp-sidebar-nav{display:flex;flex-direction:column;gap:3px;flex:1;}
.cp-nav-item{
  display:flex;align-items:center;gap:12px;
  padding:11px 12px;border-radius:12px;border:none;background:transparent;
  color:#475569;font-size:14px;font-weight:600;
  cursor:pointer;font-family:'Manrope',sans-serif;text-align:left;width:100%;
  transition:background .15s,color .15s;
}
.cp-nav-item:hover{background:#f0f9ff;color:#0077b5;}
.cp-nav-item.active{background:linear-gradient(135deg,#e8f4fd,#dbeffe);color:#0077b5;font-weight:700;box-shadow:inset 0 0 0 1px rgba(0,119,181,0.15);}
.cp-nav-label{flex:1;}
.cp-sidebar-bottom{display:flex;flex-direction:column;gap:3px;border-top:1px solid #f1f5f9;padding-top:10px;}
.cp-nav-danger{color:#dc2626!important;}
.cp-nav-danger:hover{background:#fef2f2!important;color:#dc2626!important;}

/* ── MAIN ── */
.cp-main{grid-area:main;min-width:0;padding-bottom:70px;}
@media(min-width:900px){.cp-main{padding:28px 24px 40px;display:flex;flex-direction:column;gap:16px;}}

/* ── PROFILE CARD ── */
.cp-card{background:#fff;border-radius:0 0 24px 24px;overflow:visible;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 6px 20px rgba(0,0,0,0.08);}
@media(min-width:900px){.cp-card{border-radius:20px;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 8px 32px rgba(0,0,0,0.1);border:1px solid rgba(0,0,0,0.04);}}

/* ── COVER — matches freelancer exactly ── */
.cp-cover{
  position:relative;
  margin:0;
  border-radius:20px 20px 0 0;
  overflow:hidden;
  height:120px;
  cursor:pointer;
}
.cp-cover-inner{width:100%;height:100%;}
.cp-cover-img{width:100%;height:100%;object-fit:cover;object-position:center;display:block;transition:transform .35s ease;}
.cp-cover:hover .cp-cover-img{transform:scale(1.03);}
.cp-cover-ph{
  width:100%;height:100%;
  background:linear-gradient(135deg,#0f4c75 0%,#1b6ca8 30%,#0077b5 55%,#2196c4 80%,#4db8d9 100%);
}
.cp-cover-ph::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 20% 50%,rgba(255,255,255,0.15) 0%,transparent 55%),radial-gradient(ellipse at 80% 30%,rgba(255,255,255,0.08) 0%,transparent 45%);pointer-events:none;}
.cp-cover::after{
  content:'';position:absolute;inset:0;
  background:linear-gradient(to bottom,transparent 35%,rgba(0,0,0,0.22) 100%);
  pointer-events:none;
}
.cp-cover-loader{
  position:absolute;inset:0;z-index:6;
  background:rgba(255,255,255,0.72);
  display:flex;align-items:center;justify-content:center;
}
@media(min-width:900px){.cp-cover{height:150px;border-radius:20px 20px 0 0;}}

/* Edit Cover pill — bottom-right, same as freelancer */
.cp-btn-cover{
  position:absolute;bottom:12px;right:12px;z-index:30;
  background:rgba(255,255,255,0.92);
  color:#0077b5;border:none;
  padding:7px 14px;border-radius:999px;
  font-size:12px;font-weight:700;
  display:flex;align-items:center;gap:6px;
  cursor:pointer;
  backdrop-filter:blur(12px);
  box-shadow:0 2px 12px rgba(0,0,0,0.18);
  font-family:'Manrope',sans-serif;
  transition:all .15s;
}
.cp-btn-cover:hover{background:#fff;box-shadow:0 4px 16px rgba(0,0,0,0.22);}
.cp-btn-cover:active{transform:scale(.95);}

/* ── BELOW COVER ROW — avatar left, Edit Profile right ── */
.cp-below-cover{
  display:flex;
  align-items:flex-end;
  justify-content:space-between;
  padding:0 18px;
  margin-top:-42px;
  margin-bottom:10px;
  position:relative;
  z-index:20;
  pointer-events:none;
}
@media(min-width:900px){.cp-below-cover{padding:0 22px;margin-top:-46px;margin-bottom:16px;}}

/* Re-enable pointer events for the interactive children inside below-cover */
.cp-below-cover .cp-avatar,
.cp-below-cover .cp-btn-edit-icon{pointer-events:auto;}

/* ── AVATAR — small square, shifted 2px right ── */
.cp-avatar{
  position:relative;
  margin-left:2px;           /* 2px right shift */
  width:80px;height:80px;    /* smaller than before */
  border-radius:14px;        /* rounded square */
  overflow:hidden;
  background:#e2e5e9;
  border:3px solid #ffffff;  /* white border */
  box-shadow:0 2px 12px rgba(0,0,0,0.18);
  cursor:pointer;padding:0;flex-shrink:0;
  display:block;
  transition:box-shadow .2s;
}
.cp-avatar:hover{box-shadow:0 4px 18px rgba(0,0,0,0.26);}
.cp-avatar img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block;}
.cp-avatar-ph{
  width:100%;height:100%;
  display:flex;align-items:center;justify-content:center;
  background:#dde4ea;
}
.cp-avatar-hover{
  position:absolute;inset:0;
  background:rgba(0,0,0,0.32);
  display:flex;align-items:center;justify-content:center;
  opacity:0;transition:opacity .2s;border-radius:11px;
}
.cp-avatar:hover .cp-avatar-hover{opacity:1;}
.cp-avatar-loader{
  position:absolute;inset:0;background:rgba(255,255,255,0.8);
  display:flex;align-items:center;justify-content:center;
}
@media(min-width:900px){.cp-avatar{width:92px;height:92px;border-radius:16px;}}

/* ── EDIT PROFILE BUTTON ── */
.cp-btn-edit-profile{
  background:linear-gradient(135deg,#0284c7,#0077b5);color:#fff;border:none;
  padding:11px 20px;border-radius:999px;
  font-size:13px;font-weight:800;
  display:flex;align-items:center;gap:7px;
  cursor:pointer;font-family:'Manrope',sans-serif;
  box-shadow:0 3px 14px rgba(0,119,181,0.38);
  transition:transform .15s,box-shadow .15s;
}
.cp-btn-edit-profile:hover{box-shadow:0 5px 20px rgba(0,119,181,0.48);transform:translateY(-1px);}
.cp-btn-edit-profile:active{transform:scale(.96);}
@media(min-width:900px){.cp-btn-edit-profile{padding:12px 22px;font-size:14px;}}

/* ── PROFILE INFO ── */
.cp-profile-info{padding:2px 18px 22px 20px;display:flex;flex-direction:column;gap:6px;}
@media(min-width:900px){.cp-profile-info{padding:2px 22px 22px 24px;}}

.cp-conn-count{
  font-size:12px;font-weight:700;color:#0077b5;
  display:flex;align-items:center;gap:4px;
  opacity:0.85;
}
.cp-name{font-size:22px;font-weight:800;line-height:1.15;color:#0f172a;letter-spacing:-0.02em;}
@media(min-width:900px){.cp-name{font-size:28px;}}
.cp-bio{font-size:14px;font-weight:500;color:#475569;line-height:1.75;}
.cp-tags{display:flex;flex-wrap:wrap;gap:6px;list-style:none;margin-top:2px;}
.cp-tag{
  background:linear-gradient(135deg,#e0f2fe,#dbeffe);color:#0369a1;
  padding:5px 13px;border-radius:999px;
  font-size:10.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;border:1px solid #bae6fd;
}
.cp-btn-edit-bio{
  width:100%;background:linear-gradient(135deg,#0284c7,#0077b5);color:#fff;border:none;
  padding:13px;border-radius:14px;font-size:14px;font-weight:800;
  cursor:pointer;font-family:'Manrope',sans-serif;
  box-shadow:0 4px 16px rgba(0,119,181,0.35);
  transition:transform .15s,box-shadow .15s;
  margin-top:2px;
}
.cp-btn-edit-bio:active{transform:scale(.98);}
.cp-btn-edit-bio:hover{box-shadow:0 6px 22px rgba(0,119,181,0.45);}

/* ── INLINE PANELS ── */
.cp-panel{background:#fff;border-radius:18px;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 8px 24px rgba(0,0,0,0.09);overflow:hidden;border:1px solid rgba(0,0,0,0.04);}
.cp-panel-hdr{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:15px 18px 12px;border-bottom:1px solid #f1f5f9;border-left:3px solid #0077b5;}
.cp-panel-h{font-size:15px;font-weight:800;color:#0f172a;}
.cp-panel-x{background:none;border:none;cursor:pointer;padding:3px;display:flex;transition:opacity .15s;}
.cp-panel-x:hover{opacity:.7;}
.cp-panel-body{padding:15px 18px 18px;display:flex;flex-direction:column;gap:12px;}
.cp-sec-lbl{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;}
.cp-panel-desc{font-size:14px;color:#64748b;line-height:1.65;}
.cp-form{display:flex;flex-direction:column;gap:10px;}
.cp-field{display:flex;flex-direction:column;gap:5px;}
.cp-field-lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;}
.cp-input{width:100%;border:1.5px solid #e2e8f0;border-radius:10px;padding:11px 13px;
  font-size:14px;font-family:'Manrope',sans-serif;color:#0D1B2A;outline:none;
  background:#f8fafc;transition:border-color .15s;}
.cp-input:focus{border-color:#0077b5;background:#fff;box-shadow:0 0 0 3px rgba(0,119,181,0.1);}
.cp-bal-row{display:flex;justify-content:space-between;align-items:center;
  background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:11px 14px;
  font-size:14px;color:#0369a1;font-weight:600;}
.cp-bal-row strong{font-size:15px;font-weight:800;color:#0D1B2A;}
.cp-info{border-radius:10px;padding:10px 13px;font-size:13px;font-weight:600;line-height:1.5;}
.cp-info-info{background:#f0f9ff;border:1px solid #bae6fd;color:#0369a1;}
.cp-info-warn{background:#fffbeb;border:1px solid #fde68a;color:#92400e;}
.cp-quick-wrap{display:flex;flex-wrap:wrap;gap:8px;}
.cp-quick{background:#f0f9ff;border:1.5px solid #bae6fd;border-radius:999px;padding:7px 13px;
  font-size:13px;font-weight:700;color:#0369a1;cursor:pointer;
  font-family:'Manrope',sans-serif;transition:all .15s;}
.cp-quick.active,.cp-quick:hover{background:#0077b5;border-color:#0077b5;color:#fff;}
.cp-row{display:flex;gap:10px;}
.cp-row>*{flex:1;}
.cp-divider{height:1px;background:#f1f5f9;}
.cp-btn-p{
  background:linear-gradient(135deg,#0284c7,#0077b5);color:#fff;border:none;border-radius:12px;
  padding:12px 16px;font-size:14px;font-weight:800;
  cursor:pointer;font-family:'Manrope',sans-serif;width:100%;
  display:flex;align-items:center;justify-content:center;gap:7px;
  box-shadow:0 3px 12px rgba(0,119,181,0.3);transition:all .15s;
}
.cp-btn-p:disabled{opacity:.6;cursor:not-allowed;}
.cp-btn-p:not(:disabled):hover{box-shadow:0 5px 18px rgba(0,119,181,0.4);}
.cp-btn-p:not(:disabled):active{filter:brightness(.88);}
.cp-btn-s{
  background:#f8fafc;color:#64748b;border:1.5px solid #e2e8f0;border-radius:12px;
  padding:12px 16px;font-size:14px;font-weight:700;cursor:pointer;
  font-family:'Manrope',sans-serif;width:100%;transition:background .15s;
}
.cp-btn-s:active{background:#f1f5f9;}
.cp-btn-danger{
  background:transparent;color:#dc2626;border:1.5px solid #fca5a5;border-radius:12px;
  padding:12px 16px;font-size:14px;font-weight:700;cursor:pointer;
  font-family:'Manrope',sans-serif;width:100%;
  display:flex;align-items:center;justify-content:center;gap:7px;transition:background .15s;
}
.cp-btn-danger:active{background:#fef2f2;}

/* ── RIGHT SIDEBAR ── */
.cp-sidebar-right{display:none;grid-area:right-sidebar;}
@media(min-width:900px){
  .cp-sidebar-right{
    display:flex;flex-direction:column;gap:14px;
    padding:20px 12px 40px;background:#EDF1F7;
    position:sticky;top:0;height:100dvh;
    overflow-y:auto;overflow-x:hidden;
    min-width:0;width:100%;
    align-items:stretch;
    scrollbar-width:thin;scrollbar-color:#cbd5e1 transparent;
  }
}
.cp-sidebar-right>*{flex-shrink:0;}
.cp-sidebar-right::-webkit-scrollbar{width:4px;}
.cp-sidebar-right::-webkit-scrollbar-track{background:transparent;}
.cp-sidebar-right::-webkit-scrollbar-thumb{background:#cbd5e1;border-radius:999px;}
.cp-right-hdr{
  display:flex;align-items:center;justify-content:space-between;
  gap:8px;background:#fff;border-radius:14px;padding:10px 12px;
  border:0.5px solid #e8edf2;
  box-shadow:0 1px 4px rgba(0,0,0,0.05);
  min-width:0;overflow:hidden;
}
.cp-wallet{background:linear-gradient(145deg,#cce8ff 0%,#d4eeff 45%,#e4f3ff 100%);border-radius:18px;padding:18px;min-width:0;overflow:hidden;border:1px solid rgba(147,197,253,0.6);flex-shrink:0;}
.cp-wallet-head{display:flex;justify-content:space-between;align-items:flex-start;}
.cp-wallet-lbl{font-size:10px;font-weight:800;letter-spacing:.08em;text-transform:uppercase;color:#0369a1;}
.cp-wallet-icon{background:rgba(3,105,161,0.12);border:none;border-radius:12px;
  width:40px;height:40px;display:flex;align-items:center;justify-content:center;
  cursor:pointer;transition:background .15s,transform .15s;flex-shrink:0;}
.cp-wallet-icon:hover{background:rgba(3,105,161,0.2);}
.cp-wallet-icon:active{transform:scale(.93);}
.cp-wallet-amt{font-size:24px;font-weight:800;letter-spacing:-.03em;line-height:1;color:#0f172a;margin-top:10px;}
.cp-wallet-escrow{font-size:11px;font-weight:700;color:#0369a1;margin-top:5px;}
.cp-btn-withdraw{width:100%;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-weight:800;font-size:14px;
  padding:12px;border-radius:12px;border:none;cursor:pointer;margin-top:14px;
  font-family:'Manrope',sans-serif;box-shadow:0 3px 12px rgba(34,197,94,0.35);transition:transform .15s,box-shadow .15s;}
.cp-btn-withdraw:active{transform:scale(.97);}
.cp-btn-withdraw:hover{box-shadow:0 5px 18px rgba(34,197,94,0.45);}
.cp-btn-add{width:100%;background:linear-gradient(135deg,#0077b5,#005d8f);color:#fff;border:none;
  font-weight:800;font-size:13px;padding:10px;border-radius:12px;cursor:pointer;margin-top:8px;
  font-family:'Manrope',sans-serif;box-shadow:0 2px 10px rgba(0,119,181,0.3);transition:all .15s;}
.cp-btn-add:hover{box-shadow:0 4px 16px rgba(0,119,181,0.4);}
.cp-conn-card{background:#fff;border-radius:16px;padding:16px;border:1px solid #e2e8f0;min-width:0;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.05);flex-shrink:0;}
.cp-conn-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;margin-bottom:14px;}
.cp-conn-empty{font-size:13px;color:#94a3b8;}
.cp-spend-grid{display:grid;grid-template-columns:1fr;gap:10px;}
.cp-spend-box{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px;}
.cp-spend-lbl{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.07em;color:#94a3b8;margin-bottom:6px;}
.cp-spend-val{font-size:17px;font-weight:800;color:#0f172a;line-height:1.2;}
.cp-conn-list{list-style:none;display:flex;flex-direction:column;gap:10px;}
.cp-conn-item{display:flex;align-items:center;gap:10px;min-width:0;}
.cp-conn-av{width:34px;height:34px;border-radius:50%;overflow:hidden;background:#e2e5e9;
  flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.cp-conn-av img{width:100%;height:100%;object-fit:cover;}
.cp-conn-name{font-size:13px;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cp-conn-more{width:100%;background:none;border:none;cursor:pointer;color:#0077b5;
  font-size:12px;font-weight:700;padding:8px 0 0;font-family:'Manrope',sans-serif;text-align:left;}
.cp-conn-more:hover{opacity:.75;}
.cp-switch{background:linear-gradient(135deg,#f8fafc,#f0f9ff);border-radius:16px;padding:12px 14px;border:1px solid #e2e8f0;cursor:pointer;
  display:flex;align-items:center;gap:10px;font-family:'Manrope',sans-serif;
  text-align:left;width:100%;min-width:0;overflow:hidden;
  box-shadow:0 1px 4px rgba(0,0,0,0.05);transition:box-shadow .15s;}
.cp-switch:hover{box-shadow:0 3px 14px rgba(0,0,0,0.1);}
.cp-switch-title{font-size:13px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.cp-switch-sub{font-size:12px;color:#94a3b8;margin-top:2px;}

/* ── MOBILE BOTTOM NAV ── */
.cp-mobile-nav{
  grid-area:mobile-nav;
  display:flex;justify-content:space-around;align-items:center;
  background:#fff;border-top:1px solid #e2e8f0;z-index:100;
  position:sticky;bottom:0;
  box-shadow:0 -2px 12px rgba(0,0,0,0.06);
}
@media(min-width:900px){.cp-mobile-nav{display:none;}}
.cp-mob-item{
  display:flex;flex-direction:column;align-items:center;gap:2px;
  background:none;border:none;cursor:pointer;
  color:#94a3b8;font-size:9px;font-weight:700;
  text-transform:uppercase;letter-spacing:.04em;
  font-family:'Manrope',sans-serif;padding:6px 8px;transition:color .15s;
}
.cp-mob-item.active{color:#0077b5;}
.cp-mob-label{font-size:9px;}

/* ── BIO MODAL ── */
.cp-modal-ov{
  position:fixed;inset:0;z-index:9999;
  background:rgba(0,0,0,0.46);backdrop-filter:blur(4px);
  display:flex;align-items:flex-end;justify-content:center;
}
@media(min-width:768px){.cp-modal-ov{align-items:center;padding:24px;}}
.cp-modal{
  background:#fff;border-radius:22px 22px 14px 14px;
  width:100%;max-width:500px;padding:20px 20px 26px;
  box-shadow:0 -6px 30px rgba(0,0,0,0.13);
}
@media(min-width:768px){.cp-modal{border-radius:18px;box-shadow:0 12px 48px rgba(0,0,0,0.18);}}
.cp-modal-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px;}
.cp-modal-h{font-size:16px;font-weight:800;color:#0D1B2A;}
.cp-modal-x{background:none;border:none;cursor:pointer;padding:3px;display:flex;}
.cp-modal-ta{width:100%;border:1.5px solid #e2e8f0;border-radius:12px;
  padding:12px 14px;font-size:14px;font-family:'Manrope',sans-serif;
  color:#0D1B2A;resize:none;outline:none;line-height:1.65;
  background:#f8fafc;transition:border-color .15s;}
.cp-modal-ta:focus{border-color:#0077b5;background:#fff;}
.cp-modal-count{text-align:right;font-size:11px;color:#94a3b8;margin-top:4px;margin-bottom:12px;}

/* ── EDIT ICON BUTTON ── */
.cp-btn-edit-icon{
  background:none;border:none;padding:4px;
  display:flex;align-items:center;justify-content:center;
  cursor:pointer;transition:opacity .15s,transform .15s;flex-shrink:0;
}
.cp-btn-edit-icon:hover{opacity:.7;transform:scale(1.1);}
.cp-btn-edit-icon:active{transform:scale(.93);}

/* ── MY POSTS CARD ── */
.cp-posts-card{
  background:#fff;border-radius:18px;overflow:hidden;
  box-shadow:0 1px 3px rgba(0,0,0,0.04),0 6px 20px rgba(0,0,0,0.08);
  border:1px solid rgba(0,0,0,0.04);
}
.cp-posts-hdr{
  display:flex;align-items:center;justify-content:space-between;
  padding:16px 20px 12px;border-bottom:1px solid #f1f5f9;
}
.cp-posts-title{font-size:13px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;}
.cp-posts-new{
  background:linear-gradient(135deg,#0284c7,#0077b5);color:#fff;border:none;
  border-radius:999px;padding:7px 14px;font-size:12px;font-weight:700;
  cursor:pointer;font-family:'Manrope',sans-serif;
  box-shadow:0 2px 8px rgba(0,119,181,0.3);transition:transform .15s;
}
.cp-posts-new:active{transform:scale(.95);}
.cp-posts-empty{
  display:flex;flex-direction:column;align-items:center;gap:8px;
  padding:28px 20px;color:#94a3b8;font-size:13px;font-weight:500;text-align:center;
}
.cp-posts-list{
  list-style:none;
  display:flex;flex-direction:row;gap:12px;
  overflow-x:auto;padding:12px 20px 16px;
  scrollbar-width:none;
}
.cp-posts-list::-webkit-scrollbar{display:none;}
.cp-post-item{
  flex-shrink:0;width:220px;
  padding:14px;border-radius:14px;
  border:1px solid #e2e8f0;background:#f8fafc;
  cursor:pointer;transition:all .18s;
  display:flex;flex-direction:column;gap:6px;
}
.cp-post-item:hover{background:#f0f9ff;border-color:#bae6fd;box-shadow:0 4px 14px rgba(0,119,181,0.1);transform:translateY(-2px);}
.cp-post-top{display:flex;align-items:center;gap:8px;}
.cp-post-type{
  font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;
  padding:3px 9px;border-radius:999px;background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;
}
.cp-post-type.task{background:#f3e8ff;color:#7c3aed;border-color:#ddd6fe;}
.cp-post-type.service,.cp-post-type.skill_exchange{background:#dcfce7;color:#15803d;border-color:#bbf7d0;}
.cp-post-date{font-size:10px;color:#94a3b8;font-weight:500;}
.cp-post-title{font-size:14px;font-weight:700;color:#0f172a;line-height:1.4;}
.cp-post-desc{font-size:12px;color:#64748b;line-height:1.55;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden;}
.cp-post-meta{display:flex;align-items:center;gap:10px;margin-top:2px;}
.cp-post-budget{display:flex;align-items:center;gap:4px;font-size:12px;font-weight:700;color:#0369a1;background:#f0f9ff;border:1px solid #bae6fd;padding:3px 9px;border-radius:999px;}
.cp-post-proposals{font-size:11px;font-weight:600;color:#64748b;}

/* ── TASK ACCORDIONS ── */
.cp-accord-wrap{display:flex;flex-direction:column;gap:8px;}
.cp-accord{
  background:#fff;border-radius:14px;overflow:hidden;
  border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.04);
}
.cp-accord-hdr{
  width:100%;display:flex;align-items:center;justify-content:space-between;
  padding:12px 14px;background:none;border:none;cursor:pointer;
  font-family:'Manrope',sans-serif;font-size:13px;font-weight:700;color:#0f172a;
  transition:background .15s;
}
.cp-accord-hdr:hover{background:#f8fafc;}
.cp-accord-left{display:flex;align-items:center;gap:7px;flex:1;}
.cp-accord-badge{
  font-size:10px;font-weight:800;background:#f0f9ff;color:#0369a1;
  border:1px solid #bae6fd;border-radius:999px;padding:1px 7px;
}
.cp-accord-badge.inprog{background:#fffbeb;color:#d97706;border-color:#fde68a;}
.cp-accord-badge.req{background:#eff6ff;color:#0077b5;border-color:#bfdbfe;}
.cp-accord-chev{transition:transform .2s;flex-shrink:0;}
.cp-accord-chev.open{transform:rotate(180deg);}
.cp-accord-body{
  padding:8px 14px 12px;display:flex;flex-direction:column;gap:6px;
  border-top:1px solid #f1f5f9;
}
.cp-accord-empty{font-size:12px;color:#94a3b8;padding:4px 0;}
.cp-accord-item{
  display:flex;align-items:center;gap:7px;
  font-size:12px;font-weight:600;color:#374151;
  padding:6px 8px;border-radius:8px;background:#f8fafc;
}
.cp-accord-item span:last-child{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;flex:1;}
.cp-accord-status{
  font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;
  color:#d97706;background:#fffbeb;border:1px solid #fde68a;
  border-radius:999px;padding:2px 6px;flex-shrink:0;
}
.cp-accord-req{cursor:pointer;gap:9px;padding:7px 8px;}
.cp-accord-req:hover{background:#f0f9ff;}
.cp-accord-req-av{
  width:30px;height:30px;border-radius:50%;overflow:hidden;background:#e2e5e9;
  flex-shrink:0;display:flex;align-items:center;justify-content:center;
}
.cp-accord-req-av img{width:100%;height:100%;object-fit:cover;}
.cp-accord-req-name{font-size:12px;font-weight:700;color:#0f172a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cp-accord-req-post{font-size:11px;color:#64748b;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.cp-accord-req-rate{font-size:11px;font-weight:700;color:#0369a1;flex-shrink:0;}
`
