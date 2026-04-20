'use client'

/**
 * FreelancerProfile — page.tsx
 * Full freelancer profile: cover + avatar (with image editor), all required
 * fields, multi-language selector, multi-portfolio links, wallet, connections.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import apiClient        from '../../../../services/apiClient'
import { authService }  from '../../../../services/auth.service'
import { uploadService } from '../../../../services/upload.service'
import { walletService } from '../../../../services/wallet.service'
import { escrowService } from '../../../../services/escrow.service'
import { postService }   from '../../../../services/post.service'
import { useAuthStore }  from '../../../../store/authStore'

/* ═══════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════ */
interface Wallet { balance: number; heldBalance?: number }
interface ConnectedUser { id: string; fullName?: string; profileImage?: string; email?: string }
interface PortfolioUrl { label: string; url: string }
interface Language    { language: string; proficiency: string }
interface Experience  { title: string; company: string; from: string; to: string; current: boolean; description: string }
interface Qualification { degree: string; institution: string; year: string }

type ImageField = 'coverImage' | 'profileImage'
type Panel = 'none' | 'addFunds' | 'withdraw' | 'settings' | 'switch'
type EditSection = 'none' | 'basic' | 'rates' | 'skills' | 'languages' | 'portfolio' | 'experience' | 'qualifications'

/* ═══════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════ */
const NAV_ITEMS = [
  { label: 'Home',    icon: 'home',         href: '/'        },
  { label: 'Network', icon: 'group',        href: '/network' },
  { label: 'Post',    icon: 'add_box',      href: '/post'    },
  { label: 'Alerts',  icon: 'notifications',href: '/alerts'  },
  { label: 'Profile', icon: 'person',       href: '/profile' },
]
const QUICK_AMOUNTS   = [100, 500, 1000, 2500]
const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Expert']
const NOTICE_PERIODS    = ['IMMEDIATELY', '1_WEEK', '2_WEEKS', '1_MONTH']
const PROFICIENCIES     = ['BASIC', 'CONVERSATIONAL', 'FLUENT', 'NATIVE']
const ALL_LANGUAGES     = [
  'English','Hindi','Bengali','Tamil','Telugu','Marathi','Gujarati','Kannada',
  'Malayalam','Punjabi','Urdu','Nepali','Spanish','French','German','Arabic',
  'Portuguese','Russian','Japanese','Chinese','Korean','Italian','Dutch','Turkish',
]
const TIMEZONES = [
  'Asia/Kolkata','Asia/Dubai','Asia/Singapore','Asia/Tokyo','Europe/London',
  'Europe/Paris','America/New_York','America/Los_Angeles','America/Chicago',
  'Australia/Sydney','Pacific/Auckland',
]
const CURRENCIES = ['INR','USD','EUR','GBP','AED','SGD','AUD']
const SKILL_SUGGESTIONS = [
  'React','Next.js','TypeScript','Node.js','Python','Django','FastAPI',
  'Flutter','React Native','iOS','Android','UI/UX Design','Figma',
  'GraphQL','PostgreSQL','MongoDB','AWS','Docker','Kubernetes','Machine Learning',
]

function fmt(n: number, cur: string) {
  return new Intl.NumberFormat('en-IN', { style:'currency', currency: cur, minimumFractionDigits: 0 }).format(n)
}
function fmtBalance(n: number, cur: string) {
  return new Intl.NumberFormat('en-IN', { style:'currency', currency: cur, minimumFractionDigits: 2 }).format(n)
}

/* ═══════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════ */
export default function FreelancerProfile() {
  const router = useRouter()
  const { setUser, logout, user } = useAuthStore()

  useEffect(() => {
    if (!user) { router.replace('/login'); return }
    if (user.role === 'COMPANY') { router.replace('/profile/company'); return }
    if (user.role === 'CLIENT')  { router.replace('/profile');         return }
  }, [user])

  /* ── Profile fields ── */
  const [fullName,        setFullName]        = useState('')
  const [title,           setTitle]           = useState('')
  const [bio,             setBio]             = useState('')
  const [country,         setCountry]         = useState('')
  const [city,            setCity]            = useState('')
  const [timezone,        setTimezone]        = useState('Asia/Kolkata')
  const [currency,        setCurrency]        = useState('INR')
  const [experienceLevel, setExperienceLevel] = useState('Intermediate')
  const [noticePeriod,    setNoticePeriod]    = useState('IMMEDIATELY')
  const [skills,          setSkills]          = useState<string[]>([])
  const [languages,       setLanguages]       = useState<Language[]>([{ language:'English', proficiency:'FLUENT' }])
  const [portfolioUrls,   setPortfolioUrls]   = useState<PortfolioUrl[]>([{ label:'GitHub', url:'' }])
  const [hourlyRate,      setHourlyRate]      = useState<number>(0)
  const [minBudget,       setMinBudget]       = useState<number>(0)
  const [fixedPrice,      setFixedPrice]      = useState(false)
  const [availability,    setAvailability]    = useState(true)
  const [experience,      setExperience]      = useState<Experience[]>([])
  const [qualifications,  setQualifications]  = useState<Qualification[]>([])
  const [connections,     setConnections]     = useState(0)
  const [connectedUsers,  setConnectedUsers]  = useState<ConnectedUser[]>([])
  const [coverSrc,        setCoverSrc]        = useState<string | null>(null)
  const [avatarSrc,       setAvatarSrc]       = useState<string | null>(null)

  /* ── UI state ── */
  const [pageLoading,     setPageLoading]     = useState(true)
  const [coverUploading,  setCoverUploading]  = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [saving,          setSaving]          = useState(false)
  const [editSection,     setEditSection]     = useState<EditSection>('none')

  /* ── Image editor ── */
  const [showEditor,  setShowEditor]  = useState(false)
  const [editorFile,  setEditorFile]  = useState<File | null>(null)
  const [editorField, setEditorField] = useState<ImageField>('profileImage')

  /* ── Wallet ── */
  const [wallet,        setWallet]        = useState<Wallet | null>(null)
  const [walletLoading, setWalletLoading] = useState(true)
  const [activePanel,   setActivePanel]   = useState<Panel>('none')
  const [addAmount,     setAddAmount]     = useState('')
  const [addingFunds,   setAddingFunds]   = useState(false)
  const [withdrawAmt,   setWithdrawAmt]   = useState('')
  const [withdrawing,   setWithdrawing]   = useState(false)

  /* ── Settings ── */
  const [oldPw,     setOldPw]     = useState('')
  const [newPw,     setNewPw]     = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [pwLoading, setPwLoading] = useState(false)

  /* ── Posts & completed tasks ── */
  const [myPosts,         setMyPosts]         = useState<any[]>([])
  const [completedTasks,  setCompletedTasks]  = useState<any[]>([])

  /* ── Skill input ── */
  const [skillInput, setSkillInput] = useState('')

  /* ── Refs ── */
  const coverRef  = useRef<HTMLInputElement>(null)
  const avatarRef = useRef<HTMLInputElement>(null)

  /* ═══════════════════
     DATA FETCHING
  ═══════════════════ */
  useEffect(() => { loadProfile(); loadWallet() }, [])

  async function loadProfile() {
    setPageLoading(true)
    try {
      const res = await authService.getMe()
      const d   = res.data
      setUser(d)
      const p   = d.freelancerProfile ?? {}
      setFullName(p.fullName        ?? d.email ?? '')
      setTitle(p.title              ?? '')
      setBio(p.bio                  ?? '')
      setCountry(p.country          ?? '')
      setCity(p.city                ?? '')
      setTimezone(p.timezone        ?? 'Asia/Kolkata')
      setCurrency(p.currency        ?? 'INR')
      setExperienceLevel(p.experienceLevel ?? 'Intermediate')
      setNoticePeriod(p.noticePeriod       ?? 'IMMEDIATELY')
      setSkills(p.skills            ?? [])
      setLanguages(p.languages?.length ? p.languages : [{ language:'English', proficiency:'FLUENT' }])
      setPortfolioUrls(p.portfolioUrls?.length ? p.portfolioUrls : [{ label:'GitHub', url:'' }])
      setHourlyRate(p.hourlyRate    ?? 0)
      setMinBudget(p.minBudget      ?? 0)
      setFixedPrice(p.fixedPrice    ?? false)
      setAvailability(p.availability ?? true)
      setExperience((p.experience ?? []).map((e: any) => ({
        title:       e.title       ?? e.role        ?? '',
        company:     e.company     ?? '',
        from:        e.from        ?? e.startDate   ?? '',
        to:          e.to          ?? e.endDate     ?? '',
        current:     e.current     ?? false,
        description: e.description ?? '',
      })))
      setQualifications(p.qualifications ?? [])
      setAvatarSrc(p.profileImage ?? null)
      setCoverSrc(p.coverImage       ?? null)
      setConnections(d.connectionsCount ?? 0)
      try {
        const cRes = await apiClient.get('/api/network/connections')
        const list = Array.isArray(cRes.data) ? cRes.data : (cRes.data?.connections ?? [])
        setConnectedUsers(list.slice(0, 6))
      } catch {}
      loadPostsAndTasks(d.id)
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

  async function loadPostsAndTasks(userId: string) {
    const [postsRes, tasksRes] = await Promise.allSettled([
      postService.getUserPosts(userId),
      escrowService.getFreelancerCompletedTasks(userId),
    ])
    if (postsRes.status === 'fulfilled') setMyPosts(postsRes.value?.data ?? [])
    if (tasksRes.status === 'fulfilled') setCompletedTasks(tasksRes.value?.data ?? [])
  }

  /* ═══════════════════
     SAVE PROFILE
  ═══════════════════ */
  async function saveProfile(patch: Record<string, unknown>) { 
    console.log("CLICKED");
    setSaving(true)
    try {
      await apiClient.put('/api/users/profile/freelancer', patch)
      const res = await authService.getMe(); setUser(res.data)
      toast.success('Profile updated')
      setEditSection('none')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Save failed') }
    finally { setSaving(false) }
  }

  /* ═══════════════════
     IMAGE UPLOAD
  ═══════════════════ */
  async function uploadImage(file: File, field: ImageField,
    setBlob: (s: string | null) => void, setLoading: (b: boolean) => void) {
    /* Show local preview immediately */
    const localUrl = URL.createObjectURL(file)
    setBlob(localUrl)
    setLoading(true)
    try {
      /* Upload to CDN */
      const cdnUrl = await uploadService.uploadImage(file)
      /* Set CDN url BEFORE revoking the local blob so React re-renders with CDN url first */
      setBlob(cdnUrl)
      /* Now safe to revoke the blob */
      URL.revokeObjectURL(localUrl)
      /* Save CDN url to profile */
      await apiClient.put('/api/users/profile/freelancer', { [field]: cdnUrl })
      const res = await authService.getMe(); setUser(res.data)
      toast.success(field === 'coverImage' ? 'Cover updated' : 'Photo updated')
    } catch (err) {
      /* On error — revoke blob and clear preview */
      URL.revokeObjectURL(localUrl)
      setBlob(null)
      toast.error('Upload failed — please try again')
    } finally {
      setLoading(false)
    }
  }

  function onCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return; e.target.value = ''
    setEditorFile(f); setEditorField('coverImage'); setShowEditor(true)
  }
  function onAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return; e.target.value = ''
    setEditorFile(f); setEditorField('profileImage'); setShowEditor(true)
  }
  async function onEditorDone(blob: Blob) {
    setShowEditor(false)
    const file     = new File([blob], editorFile?.name ?? 'image.webp', { type: blob.type })
    const setBlob  = editorField === 'coverImage' ? setCoverSrc : setAvatarSrc
    const setLoad  = editorField === 'coverImage' ? setCoverUploading : setAvatarUploading
    uploadImage(file, editorField, setBlob, setLoad)
  }

  /* ═══════════════════
     SKILLS
  ═══════════════════ */
  function addSkill(s: string) {
    const trimmed = s.trim()
    if (!trimmed || skills.includes(trimmed)) return
    setSkills(prev => [...prev, trimmed])
    setSkillInput('')
  }
  function removeSkill(s: string) { setSkills(prev => prev.filter(x => x !== s)) }

  /* ═══════════════════
     LANGUAGES
  ═══════════════════ */
  function addLanguage() { setLanguages(prev => [...prev, { language:'', proficiency:'FLUENT' }]) }
  function updateLanguage(i: number, key: keyof Language, val: string) {
    setLanguages(prev => prev.map((l, idx) => idx === i ? { ...l, [key]: val } : l))
  }
  function removeLanguage(i: number) { setLanguages(prev => prev.filter((_, idx) => idx !== i)) }

  /* ═══════════════════
     PORTFOLIO URLS
  ═══════════════════ */
  function addPortfolio()  { setPortfolioUrls(prev => [...prev, { label:'', url:'' }]) }
  function updatePortfolio(i: number, key: keyof PortfolioUrl, val: string) {
    setPortfolioUrls(prev => prev.map((p, idx) => idx === i ? { ...p, [key]: val } : p))
  }
  function removePortfolio(i: number) { setPortfolioUrls(prev => prev.filter((_, idx) => idx !== i)) }

  /* ═══════════════════
     EXPERIENCE
  ═══════════════════ */
  function addExp() {
    setExperience(prev => [...prev, { title:'', company:'', from:'', to:'', current:false, description:'' }])
  }
  function updateExp(i: number, key: keyof Experience, val: string | boolean) {
    setExperience(prev => prev.map((e, idx) => idx === i ? { ...e, [key]: val } : e))
  }
  function removeExp(i: number) { setExperience(prev => prev.filter((_, idx) => idx !== i)) }

  /* ═══════════════════
     QUALIFICATIONS
  ═══════════════════ */
  function addQual() { setQualifications(prev => [...prev, { degree:'', institution:'', year:'' }]) }
  function updateQual(i: number, key: keyof Qualification, val: string) {
    setQualifications(prev => prev.map((q, idx) => idx === i ? { ...q, [key]: val } : q))
  }
  function removeQual(i: number) { setQualifications(prev => prev.filter((_, idx) => idx !== i)) }

  /* ═══════════════════
     WALLET ACTIONS
  ═══════════════════ */
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
      if (!ready) {
        toast.error('Could not load Razorpay. Check your internet connection.')
        setAddingFunds(false)
        return
      }

      const { data: order } = await walletService.createOrder(n)

      const options = {
        key:         order.keyId,
        amount:      order.amount,
        currency:    order.currency,
        name:        'Xwite',
        description: 'Add funds to wallet',
        order_id:    order.orderId,
        prefill: {
          email: user?.email ?? '',
        },
        theme: { color: '#0077b5' },
        handler: async (response: any) => {
          try {
            await walletService.verifyPayment({
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            toast.success(`${fmtBalance(n, currency)} added to wallet!`)
            setAddAmount('')
            setActivePanel('none')
            loadWallet()
          } catch {
            toast.error('Payment verification failed. Contact support if money was deducted.')
          }
        },
        modal: {
          ondismiss: () => { setAddingFunds(false) },
        },
      }

      const rzp = new (window as any).Razorpay(options)
      rzp.on('payment.failed', (resp: any) => {
        toast.error(resp.error?.description ?? 'Payment failed')
        setAddingFunds(false)
      })
      rzp.open()
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not initiate payment')
      setAddingFunds(false)
    }
  }
  async function handleWithdraw() {
    const n = Number(withdrawAmt); if (!n || n <= 0) return toast.error('Enter a valid amount')
    if (wallet && n > wallet.balance) return toast.error('Insufficient balance')
    setWithdrawing(true)
    try {
      await walletService.withdrawFunds({ amount: n }); toast.success('Withdrawal requested!')
      setWithdrawAmt(''); setActivePanel('none'); loadWallet()
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Failed') }
    finally { setWithdrawing(false) }
  }

  /* ═══════════════════
     SETTINGS
  ═══════════════════ */
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

  const balanceLabel = fmtBalance(wallet?.balance ?? 0, currency)

  /* ═══════════════════
     RENDER
  ═══════════════════ */
  return (
    <>
      <style>{STYLES}</style>

      <input ref={coverRef}  type="file" accept="image/*" onChange={onCoverChange}  style={{display:'none'}} />
      <input ref={avatarRef} type="file" accept="image/*" onChange={onAvatarChange} style={{display:'none'}} />

      {showEditor && editorFile && (
        <ImageEditorModal
          file={editorFile}
          isCover={editorField === 'coverImage'}
          onDone={onEditorDone}
          onCancel={() => setShowEditor(false)}
        />
      )}

      <div className="fp-root">

        {/* ══ MOBILE HEADER ══ */}
        <header className="fp-header">
          <div className="fp-hdr-left">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#0077b5"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
            <span className="fp-brand">Xwite</span>
          </div>
          <div className="fp-hdr-right">
            <button className="fp-agent-btn" onClick={() => router.push('/agent')}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="m12 2 1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2Z" />
              </svg>
              <span className="fp-agent-text">AI Agent</span>
            </button>
            <button className="fp-msg-btn" onClick={() => router.push('/messages')}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0077b5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>
        </header>

        {/* ══ LEFT SIDEBAR ══ */}
        <aside className="fp-sidebar-left">
          <div className="fp-sidebar-brand">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#0077b5"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
            <span className="fp-brand">Xwite</span>
          </div>
          <nav className="fp-sidebar-nav">
            {NAV_ITEMS.map(item => (
              <button key={item.label}
                className={`fp-nav-item${item.href === '/profile' ? ' active' : ''}`}
                onClick={() => router.push(item.href)}>
                <NavIcon name={item.icon} active={item.href === '/profile'} />
                <span className="fp-nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="fp-sidebar-bottom">
            <button className="fp-nav-item" onClick={() => togglePanel('settings')}>
              <SettingsIcon /><span className="fp-nav-label">Settings</span>
            </button>
            <button className="fp-nav-item fp-nav-danger" onClick={handleLogout}>
              <LogoutIcon /><span className="fp-nav-label">Log out</span>
            </button>
          </div>
        </aside>

        {/* ══ MAIN ══ */}
        <main className="fp-main">

          {/* ── PROFILE CARD ── */}
          <section className="fp-card">

            {/* Cover */}
            <div className="fp-cover" onClick={() => !coverUploading && coverRef.current?.click()}
              role="button" aria-label="Change cover">
              {pageLoading
                ? <div className="skel fp-cover-inner" />
                : coverSrc
                  ? <img src={coverSrc} alt="Cover" className="fp-cover-img" />
                  : <div className="fp-cover-ph" />
              }
              {coverUploading && <div className="fp-cover-loader"><Spin /></div>}
              {!pageLoading && (
                <button className="fp-btn-cover"
                  onClick={e => { e.stopPropagation(); coverRef.current?.click() }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#0077b5"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                  Edit Cover
                </button>
              )}
            </div>

            {/* Avatar row */}
            <div className="fp-below-cover">
              <button className="fp-avatar" onClick={() => !avatarUploading && avatarRef.current?.click()}
                disabled={avatarUploading}>
                {pageLoading
                  ? <div className="skel" style={{position:'absolute',inset:0,borderRadius:12}} />
                  : avatarSrc
                    ? <img src={avatarSrc} alt={fullName} style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',objectPosition:'center top',display:'block'}} />
                    : <div className="fp-avatar-ph" style={{position:'absolute',inset:0}}><PersonIcon /></div>
                }
                <div className="fp-avatar-hover"><CameraIcon /></div>
                {avatarUploading && <div className="fp-avatar-loader"><Spin light /></div>}
              </button>

            </div>

            {/* Profile info */}
            <div className="fp-profile-info">
              {pageLoading
                ? <ProfileSkeleton />
                : <>
                    <p className="fp-conn-count">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="#0077b5"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                      connection. {connections.toLocaleString()}
                    </p>

                    <div className="fp-name-row">
                      <div>
                        <h1 className="fp-name">{fullName || 'Your Name'}</h1>
                        {title && (
                          <p className="fp-title">
                            {experienceLevel && <span className="fp-title-level">{experienceLevel} · </span>}
                            {title}
                          </p>
                        )}
                        {(country || city) && (
                          <p className="fp-location">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#94a3b8"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                            {[city, country].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                      <button className="fp-edit-icon-btn" onClick={() => setEditSection('basic')} title="Edit basic info">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#0077b5"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                      </button>
                    </div>

                    {bio && <p className="fp-bio">{bio}</p>}

                    {/* Notice period only */}
                    <div className="fp-badges-row">
                      <span className="fp-badge fp-badge-notice">
                        {noticePeriod === 'IMMEDIATELY' ? 'Available Now' : noticePeriod.replace('_', ' ')}
                      </span>
                    </div>

                    {/* Skills */}
                    {skills.length > 0 && (
                      <ul className="fp-tags">
                        {skills.map(s => <li key={s} className="fp-tag">{s}</li>)}
                      </ul>
                    )}

                    {/* Rates */}
                    <div className="fp-rates-row">
                      {hourlyRate > 0 && (
                        <div className="fp-rate-chip">
                          <span className="fp-rate-lbl">Hourly</span>
                          <span className="fp-rate-val">{fmt(hourlyRate, currency)}/hr</span>
                        </div>
                      )}
                      {minBudget > 0 && (
                        <div className="fp-rate-chip">
                          <span className="fp-rate-lbl">Min. Project</span>
                          <span className="fp-rate-val">{fmt(minBudget, currency)}</span>
                        </div>
                      )}
                      {fixedPrice && <span className="fp-badge fp-badge-fixed">Fixed Price</span>}
                    </div>

                    {/* Portfolio links — visible below rates */}
                    {portfolioUrls.filter(p => p.url).length > 0 && (
                      <div className="fp-portfolio-inline">
                        <div className="fp-portfolio-inline-hdr">
                          <p className="fp-portfolio-inline-lbl">Portfolio & Links</p>
                        </div>
                        <div className="fp-portfolio-inline-links">
                          {portfolioUrls.filter(p => p.url).map((p, i) => (
                            <a key={i} href={p.url} target="_blank" rel="noopener noreferrer"
                              className="fp-portfolio-inline-link">
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="#0077b5"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
                              <span>{p.label || p.url}</span>
                            </a>
                          ))}
                          <button className="fp-portfolio-inline-edit"
                            onClick={() => setEditSection('portfolio')}>
                            <svg width="11" height="11" viewBox="0 0 24 24" fill="#0077b5"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                            Edit
                          </button>
                        </div>
                      </div>
                    )}
                    {portfolioUrls.filter(p => p.url).length === 0 && (
                      <button className="fp-btn-add-portfolio" onClick={() => setEditSection('portfolio')}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                        Add Portfolio Links
                      </button>
                    )}
                  </>
              }
            </div>
          </section>

          {/* ── EDIT SECTIONS ── */}

          {/* Basic Info */}
          {editSection === 'basic' && (
            <EditCard title="Basic Information" onClose={() => setEditSection('none')}>
              <div className="fp-form">
                <FormRow label="Full Name">
                  <input className="fp-input" value={fullName} onChange={e => setFullName(e.target.value)} placeholder="Your full name" />
                </FormRow>
                <FormRow label="Professional Title">
                  <input className="fp-input" value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Frontend Developer" />
                </FormRow>
                <FormRow label="Bio (min. 50 characters)">
                  <textarea className="fp-input fp-textarea" rows={4} value={bio}
                    onChange={e => setBio(e.target.value)}
                    placeholder="Describe your expertise, experience and what makes you unique..." />
                  <p className="fp-char-count" style={{color: bio.length < 50 ? '#dc2626' : '#94a3b8'}}>
                    {bio.length}/50 min
                  </p>
                </FormRow>
                <div className="fp-form-2col">
                  <FormRow label="Country">
                    <input className="fp-input" value={country} onChange={e => setCountry(e.target.value)} placeholder="India" />
                  </FormRow>
                  <FormRow label="City">
                    <input className="fp-input" value={city} onChange={e => setCity(e.target.value)} placeholder="Mumbai" />
                  </FormRow>
                </div>
                <div className="fp-form-2col">
                  <FormRow label="Timezone">
                    <select className="fp-input" value={timezone} onChange={e => setTimezone(e.target.value)}>
                      {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                    </select>
                  </FormRow>
                  <FormRow label="Currency">
                    <select className="fp-input" value={currency} onChange={e => setCurrency(e.target.value)}>
                      {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                  </FormRow>
                </div>
                <div className="fp-form-2col">
                  <FormRow label="Experience Level">
                    <select className="fp-input" value={experienceLevel} onChange={e => setExperienceLevel(e.target.value)}>
                      {EXPERIENCE_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                  </FormRow>
                  <FormRow label="Notice Period">
                    <select className="fp-input" value={noticePeriod} onChange={e => setNoticePeriod(e.target.value)}>
                      {NOTICE_PERIODS.map(n => <option key={n} value={n}>{n.replace('_', ' ')}</option>)}
                    </select>
                  </FormRow>
                </div>
              </div>
              <SaveRow saving={saving}
                onSave={() => saveProfile({ fullName, title, bio, country, city, timezone, currency, experienceLevel, noticePeriod })}
                onCancel={() => setEditSection('none')} />
            </EditCard>
          )}

          {/* Rates */}
          {editSection === 'rates' && (
            <EditCard title="Rates & Pricing" onClose={() => setEditSection('none')}>
              <div className="fp-form">
                <div className="fp-form-2col">
                  <FormRow label="Hourly Rate">
                    <div className="fp-input-prefix-wrap">
                      <span className="fp-input-prefix">{currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency}</span>
                      <input className="fp-input fp-input-with-prefix" type="number" value={hourlyRate || ''} min={0}
                        onChange={e => setHourlyRate(Number(e.target.value))}
                        placeholder="e.g. 1500" />
                    </div>
                  </FormRow>
                  <FormRow label="Min. Budget">
                    <div className="fp-input-prefix-wrap">
                      <span className="fp-input-prefix">{currency === 'INR' ? '₹' : currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency}</span>
                      <input className="fp-input fp-input-with-prefix" type="number" value={minBudget || ''} min={0}
                        onChange={e => setMinBudget(Number(e.target.value))}
                        placeholder="e.g. 5000" />
                    </div>
                  </FormRow>
                </div>
                <div className="fp-toggle-row">
                  <span className="fp-toggle-label">Accept Fixed Price Projects</span>
                  <button className={`fp-toggle${fixedPrice ? ' on' : ''}`}
                    onClick={() => setFixedPrice(!fixedPrice)}>
                    <span className="fp-toggle-thumb" />
                  </button>
                </div>
                <div className="fp-toggle-row">
                  <span className="fp-toggle-label">Currently Available for Work</span>
                  <button className={`fp-toggle${availability ? ' on' : ''}`}
                    onClick={() => setAvailability(!availability)}>
                    <span className="fp-toggle-thumb" />
                  </button>
                </div>
              </div>
              <SaveRow saving={saving}
                onSave={() => saveProfile({ hourlyRate, minBudget, fixedPrice, availability })}
                onCancel={() => setEditSection('none')} />
            </EditCard>
          )}

          {/* Skills */}
          {editSection === 'skills' && (
            <EditCard title="Skills" onClose={() => setEditSection('none')}>
              <div className="fp-form">
                <p className="fp-section-note">Add at least 3 skills. Type and press Enter or click a suggestion.</p>
                <div className="fp-skill-input-row">
                  <input className="fp-input" value={skillInput}
                    onChange={e => setSkillInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSkill(skillInput) } }}
                    placeholder="Type a skill and press Enter" />
                  <button className="fp-btn-add-item" onClick={() => addSkill(skillInput)}>Add</button>
                </div>
                {/* Suggestions */}
                <div className="fp-suggestions">
                  {SKILL_SUGGESTIONS.filter(s => !skills.includes(s) &&
                    (skillInput === '' || s.toLowerCase().includes(skillInput.toLowerCase()))
                  ).slice(0, 10).map(s => (
                    <button key={s} className="fp-suggestion" onClick={() => addSkill(s)}>{s}</button>
                  ))}
                </div>
                {/* Current skills */}
                {skills.length > 0 && (
                  <ul className="fp-skills-edit-list">
                    {skills.map(s => (
                      <li key={s} className="fp-skill-edit-item">
                        {s}
                        <button onClick={() => removeSkill(s)} className="fp-remove-btn" aria-label={`Remove ${s}`}>
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
                {skills.length < 3 && (
                  <p className="fp-warn">Add {3 - skills.length} more skill{3 - skills.length > 1 ? 's' : ''} (minimum 3 required)</p>
                )}
              </div>
              <SaveRow saving={saving} disabled={skills.length < 3}
                onSave={() => saveProfile({ skills })}
                onCancel={() => setEditSection('none')} />
            </EditCard>
          )}

          {/* Languages */}
          {editSection === 'languages' && (
            <EditCard title="Languages" onClose={() => setEditSection('none')}>
              <div className="fp-form">
                {languages.map((lang, i) => (
                  <div key={i} className="fp-lang-row">
                    <select className="fp-input fp-lang-select"
                      value={lang.language} onChange={e => updateLanguage(i, 'language', e.target.value)}>
                      <option value="">Select language</option>
                      {ALL_LANGUAGES.map(l => <option key={l} value={l}>{l}</option>)}
                    </select>
                    <select className="fp-input fp-lang-prof"
                      value={lang.proficiency} onChange={e => updateLanguage(i, 'proficiency', e.target.value)}>
                      {PROFICIENCIES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                    {languages.length > 1 && (
                      <button className="fp-remove-btn" onClick={() => removeLanguage(i)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                      </button>
                    )}
                  </div>
                ))}
                <button className="fp-btn-add-row" onClick={addLanguage}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                  Add Language
                </button>
              </div>
              <SaveRow saving={saving}
                onSave={() => saveProfile({ languages })}
                onCancel={() => setEditSection('none')} />
            </EditCard>
          )}

          {/* Portfolio URLs */}
          {editSection === 'portfolio' && (
            <EditCard title="Portfolio & Links" onClose={() => setEditSection('none')}>
              <div className="fp-form">
                <p className="fp-section-note">Add links to your GitHub, portfolio, LinkedIn, or any other relevant work.</p>
                {portfolioUrls.map((p, i) => (
                  <div key={i} className="fp-portfolio-row">
                    <input className="fp-input fp-portfolio-label" value={p.label}
                      onChange={e => updatePortfolio(i, 'label', e.target.value)}
                      placeholder="Label (e.g. GitHub)" />
                    <input className="fp-input fp-portfolio-url" value={p.url}
                      onChange={e => updatePortfolio(i, 'url', e.target.value)}
                      placeholder="https://github.com/username" type="url" />
                    {portfolioUrls.length > 1 && (
                      <button className="fp-remove-btn" onClick={() => removePortfolio(i)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
                      </button>
                    )}
                  </div>
                ))}
                <button className="fp-btn-add-row" onClick={addPortfolio}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                  Add Link
                </button>
              </div>
              <SaveRow saving={saving}
                onSave={() => saveProfile({ portfolioUrls })}
                onCancel={() => setEditSection('none')} />
            </EditCard>
          )}

          {/* Experience */}
          {editSection === 'experience' && (
            <EditCard title="Work Experience" onClose={() => setEditSection('none')}>
              <div className="fp-form">
                {experience.map((exp, i) => (
                  <div key={i} className="fp-exp-block">
                    <div className="fp-exp-header">
                      <span className="fp-exp-num">Position {i + 1}</span>
                      <button className="fp-remove-btn" onClick={() => removeExp(i)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm3-8h2v6H9v-6zm4 0h2v6h-2v-6zm2.5-7-1-1h-5l-1 1H5v2h14V4h-3.5z"/></svg>
                      </button>
                    </div>
                    <div className="fp-form-2col">
                      <FormRow label="Job Title">
                        <input className="fp-input" value={exp.title} onChange={e => updateExp(i,'title',e.target.value)} placeholder="e.g. Senior Developer" />
                      </FormRow>
                      <FormRow label="Company">
                        <input className="fp-input" value={exp.company} onChange={e => updateExp(i,'company',e.target.value)} placeholder="Company name" />
                      </FormRow>
                    </div>
                    <div className="fp-form-2col">
                      <FormRow label="From">
                        <input className="fp-input" type="month" value={exp.from} onChange={e => updateExp(i,'from',e.target.value)} />
                      </FormRow>
                      <FormRow label="To">
                        <input className="fp-input" type="month" value={exp.to} disabled={exp.current} onChange={e => updateExp(i,'to',e.target.value)} />
                      </FormRow>
                    </div>
                    <div className="fp-toggle-row">
                      <span className="fp-toggle-label">Currently working here</span>
                      <button className={`fp-toggle${exp.current ? ' on' : ''}`} onClick={() => updateExp(i,'current',!exp.current)}>
                        <span className="fp-toggle-thumb" />
                      </button>
                    </div>
                    <FormRow label="Description">
                      <textarea className="fp-input fp-textarea" rows={3} value={exp.description}
                        onChange={e => updateExp(i,'description',e.target.value)}
                        placeholder="Describe your role and achievements..." />
                    </FormRow>
                  </div>
                ))}
                <button className="fp-btn-add-row" onClick={addExp}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                  Add Position
                </button>
              </div>
              <SaveRow saving={saving}
                onSave={() => saveProfile({ experience })}
                onCancel={() => setEditSection('none')} />
            </EditCard>
          )}

          {/* Qualifications */}
          {editSection === 'qualifications' && (
            <EditCard title="Education & Qualifications" onClose={() => setEditSection('none')}>
              <div className="fp-form">
                {qualifications.map((q, i) => (
                  <div key={i} className="fp-exp-block">
                    <div className="fp-exp-header">
                      <span className="fp-exp-num">Qualification {i + 1}</span>
                      <button className="fp-remove-btn" onClick={() => removeQual(i)}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor"><path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zm3-8h2v6H9v-6zm4 0h2v6h-2v-6zm2.5-7-1-1h-5l-1 1H5v2h14V4h-3.5z"/></svg>
                      </button>
                    </div>
                    <FormRow label="Degree / Certificate">
                      <input className="fp-input" value={q.degree} onChange={e => updateQual(i,'degree',e.target.value)} placeholder="e.g. B.Tech Computer Science" />
                    </FormRow>
                    <div className="fp-form-2col">
                      <FormRow label="Institution">
                        <input className="fp-input" value={q.institution} onChange={e => updateQual(i,'institution',e.target.value)} placeholder="University / College" />
                      </FormRow>
                      <FormRow label="Year">
                        <input className="fp-input" value={q.year} onChange={e => updateQual(i,'year',e.target.value)} placeholder="2022" maxLength={4} />
                      </FormRow>
                    </div>
                  </div>
                ))}
                <button className="fp-btn-add-row" onClick={addQual}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                  Add Qualification
                </button>
              </div>
              <SaveRow saving={saving}
                onSave={() => saveProfile({ qualifications })}
                onCancel={() => setEditSection('none')} />
            </EditCard>
          )}

          {/* Settings Panel */}
          {activePanel === 'settings' && (
            <EditCard title="Account Settings" onClose={() => togglePanel('none')}>
              <div className="fp-form">
                <p className="fp-sec-lbl">Change Password</p>
                <form onSubmit={handleChangePassword} style={{display:'flex',flexDirection:'column',gap:10}}>
                  {[
                    { lbl:'Current password', val:oldPw,     set:setOldPw,     ph:'Current password' },
                    { lbl:'New password',      val:newPw,     set:setNewPw,     ph:'Min 8 characters' },
                    { lbl:'Confirm password',  val:confirmPw, set:setConfirmPw, ph:'Repeat new password' },
                  ].map(f => (
                    <FormRow key={f.lbl} label={f.lbl}>
                      <input className="fp-input" type="password" value={f.val}
                        onChange={e => f.set(e.target.value)} placeholder={f.ph} />
                    </FormRow>
                  ))}
                  <button className="fp-btn-primary" type="submit" disabled={pwLoading}>
                    {pwLoading ? 'Changing…' : 'Change Password'}
                  </button>
                </form>
                <div className="fp-divider" />
                <button className="fp-btn-danger" onClick={handleLogout}>Log out</button>
              </div>
            </EditCard>
          )}

          {/* Add Funds Panel */}
          {activePanel === 'addFunds' && (
            <EditCard title="Add Funds" onClose={() => togglePanel('none')}>
              <div className="fp-form">
                <div className="fp-quick-wrap">
                  {QUICK_AMOUNTS.map(a => (
                    <button key={a} className={`fp-quick${addAmount===String(a)?' active':''}`}
                      onClick={() => setAddAmount(String(a))} type="button">
                      {fmtBalance(a, currency)}
                    </button>
                  ))}
                </div>
                <FormRow label="Amount">
                  <input className="fp-input" type="number" placeholder={`Amount (${currency})`}
                    value={addAmount} onChange={e => setAddAmount(e.target.value)} min={1} />
                </FormRow>
                <div className="fp-form-row">
                  <button className="fp-btn-primary" onClick={handleAddFunds} disabled={addingFunds}>
                    {addingFunds ? 'Adding…' : `Add ${addAmount ? fmtBalance(Number(addAmount), currency) : 'Funds'}`}
                  </button>
                  <button className="fp-btn-sec" onClick={() => togglePanel('none')}>Cancel</button>
                </div>
              </div>
            </EditCard>
          )}

          {/* Withdraw Panel */}
          {activePanel === 'withdraw' && (
            <EditCard title="Withdraw Funds" onClose={() => togglePanel('none')}>
              <div className="fp-form">
                <div className="fp-bal-row">
                  <span>Available</span><strong>{balanceLabel}</strong>
                </div>
                <FormRow label="Amount">
                  <input className="fp-input" type="number" placeholder="Enter amount"
                    value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)}
                    min={1} max={wallet?.balance} />
                </FormRow>
                <div className="fp-form-row">
                  <button className="fp-btn-primary" onClick={handleWithdraw} disabled={withdrawing}>
                    {withdrawing ? 'Processing…' : 'Confirm Withdrawal'}
                  </button>
                  <button className="fp-btn-sec" onClick={() => togglePanel('none')}>Cancel</button>
                </div>
              </div>
            </EditCard>
          )}

          {/* READ-ONLY profile sections */}
          {!pageLoading && (
            <>
              {/* Rates section */}
              <ProfileSection
                title="Rates & Pricing"
                onEdit={() => setEditSection('rates')}
                empty={!hourlyRate && !minBudget}>
                <div className="fp-rates-display">
                  {hourlyRate > 0 && <div className="fp-rate-display-chip"><span>Hourly Rate</span><strong>{fmt(hourlyRate, currency)}/hr</strong></div>}
                  {minBudget  > 0 && <div className="fp-rate-display-chip"><span>Min. Budget</span><strong>{fmt(minBudget, currency)}</strong></div>}
                  <div className="fp-rate-display-chip"><span>Fixed Price</span><strong>{fixedPrice ? 'Yes' : 'No'}</strong></div>
                </div>
              </ProfileSection>

              {/* Skills section */}
              <ProfileSection title="Skills" onEdit={() => setEditSection('skills')} empty={skills.length === 0}>
                <ul className="fp-tags">{skills.map(s => <li key={s} className="fp-tag">{s}</li>)}</ul>
              </ProfileSection>

              {/* Languages section */}
              <ProfileSection title="Languages" onEdit={() => setEditSection('languages')} empty={languages.length === 0}>
                <div className="fp-lang-display">
                  {languages.map((l, i) => (
                    <div key={i} className="fp-lang-chip">
                      <span className="fp-lang-name">{l.language}</span>
                      <span className="fp-lang-prof-badge">{l.proficiency}</span>
                    </div>
                  ))}
                </div>
              </ProfileSection>

              {/* Portfolio section */}
              <ProfileSection
                title="Portfolio & Links"
                onEdit={() => setEditSection('portfolio')}
                empty={portfolioUrls.filter(p => p.url).length === 0}>
                <div className="fp-portfolio-display">
                  {portfolioUrls.filter(p => p.url).map((p, i) => (
                    <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="fp-portfolio-link">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="#0077b5"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
                      <span>{p.label || p.url}</span>
                    </a>
                  ))}
                </div>
              </ProfileSection>

              {/* Experience section */}
              <ProfileSection title="Work Experience" onEdit={() => setEditSection('experience')} empty={experience.length === 0}>
                <div className="fp-timeline">
                  {experience.map((exp, i) => (
                    <div key={i} className="fp-timeline-item">
                      <div className="fp-timeline-dot" />
                      <div className="fp-timeline-body">
                        <p className="fp-timeline-title">{exp.title}</p>
                        <p className="fp-timeline-sub">{exp.company} · {exp.from}{exp.current ? ' – Present' : exp.to ? ` – ${exp.to}` : ''}</p>
                        {exp.description && <p className="fp-timeline-desc">{exp.description}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </ProfileSection>

              {/* Qualifications section */}
              <ProfileSection title="Education & Qualifications" onEdit={() => setEditSection('qualifications')} empty={qualifications.length === 0}>
                <div className="fp-timeline">
                  {qualifications.map((q, i) => (
                    <div key={i} className="fp-timeline-item">
                      <div className="fp-timeline-dot" />
                      <div className="fp-timeline-body">
                        <p className="fp-timeline-title">{q.degree}</p>
                        <p className="fp-timeline-sub">{q.institution}{q.year ? ` · ${q.year}` : ''}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </ProfileSection>

              {/* My Posts */}
              {myPosts.length > 0 && (() => {
                const POST_COLORS: Record<string, { bg: string; text: string }> = {
                  JOB: { bg: '#dbeafe', text: '#1e40af' }, TASK: { bg: '#dcfce7', text: '#166534' },
                  COLLAB: { bg: '#fef9c3', text: '#854d0e' }, SKILL_EXCHANGE: { bg: '#fae8ff', text: '#7e22ce' },
                }
                const scrollRef = { current: null as HTMLDivElement | null }
                return (
                  <div className="fp-section-card" style={{ marginTop: 14 }}>
                    <div className="fp-section-hdr">
                      <h3 className="fp-section-title">My Posts</h3>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(['left', 'right'] as const).map(d => (
                          <button key={d} onClick={() => scrollRef.current?.scrollBy({ left: d === 'right' ? 260 : -260, behavior: 'smooth' })}
                            style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 16 }}>
                            {d === 'left' ? '‹' : '›'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="fp-section-body">
                      <div ref={(el) => { scrollRef.current = el }} style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', paddingBottom: 4 }}>
                        {myPosts.map((p: any) => {
                          const col = POST_COLORS[p.type] ?? { bg: '#f1f5f9', text: '#475569' }
                          const skills: string[] = Array.isArray(p.skills) ? p.skills : []
                          return (
                            <div key={p.id} style={{ flex: '0 0 230px', scrollSnapAlign: 'start', borderRadius: 14, border: '1px solid #e2e8f0', background: '#f8fbfe', padding: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                                <span style={{ ...col, padding: '3px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' }}>{p.type?.replace('_', ' ')}</span>
                                {p._count?.proposals != null && <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{p._count.proposals} proposals</span>}
                              </div>
                              <p style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.4, color: '#0f172a' }}>{p.title}</p>
                              {skills.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                  {skills.slice(0, 3).map((s: string) => <span key={s} style={{ padding: '2px 8px', borderRadius: 999, background: '#eff6ff', color: '#1d4f73', fontSize: 10, fontWeight: 600 }}>{s}</span>)}
                                  {skills.length > 3 && <span style={{ padding: '2px 8px', borderRadius: 999, background: '#f1f5f9', color: '#64748b', fontSize: 10, fontWeight: 600 }}>+{skills.length - 3}</span>}
                                </div>
                              )}
                              {p.status && <span style={{ marginTop: 'auto', fontSize: 10, color: p.status === 'OPEN' ? '#16a34a' : '#64748b', fontWeight: 700 }}>{p.status}</span>}
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })()}

              {/* Completed Tasks */}
              {completedTasks.length > 0 && (() => {
                const scrollRef = { current: null as HTMLDivElement | null }
                return (
                  <div className="fp-section-card" style={{ marginTop: 14 }}>
                    <div className="fp-section-hdr">
                      <h3 className="fp-section-title">Completed Tasks</h3>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {(['left', 'right'] as const).map(d => (
                          <button key={d} onClick={() => scrollRef.current?.scrollBy({ left: d === 'right' ? 260 : -260, behavior: 'smooth' })}
                            style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 16 }}>
                            {d === 'left' ? '‹' : '›'}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="fp-section-body">
                      <div ref={(el) => { scrollRef.current = el }} style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', paddingBottom: 4 }}>
                        {completedTasks.map((t: any) => {
                          const clientName = t.client?.clientProfile?.fullName ?? t.client?.companyProfile?.companyName ?? 'Client'
                          const skills: string[] = Array.isArray(t.task?.skills) ? t.task.skills : []
                          const postId: string | undefined = t.task?.post?.id
                          return (
                            <div key={t.id} style={{ flex: '0 0 230px', scrollSnapAlign: 'start', borderRadius: 14, border: '1px solid #e2e8f0', background: '#f0fdf4', padding: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                                <span style={{ background: '#dcfce7', color: '#166534', padding: '3px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700 }}>COMPLETED</span>
                                {t.amount > 0 && <span style={{ fontSize: 11, color: '#15803d', fontWeight: 700 }}>₹{t.amount.toLocaleString()}</span>}
                              </div>
                              <p style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.4, color: '#0f172a' }}>{t.task?.title || 'Task'}</p>
                              {skills.length > 0 && (
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                                  {skills.slice(0, 3).map((s: string) => <span key={s} style={{ padding: '2px 8px', borderRadius: 999, background: '#eff6ff', color: '#1d4f73', fontSize: 10, fontWeight: 600 }}>{s}</span>)}
                                  {skills.length > 3 && <span style={{ padding: '2px 8px', borderRadius: 999, background: '#f1f5f9', color: '#64748b', fontSize: 10, fontWeight: 600 }}>+{skills.length - 3}</span>}
                                </div>
                              )}
                              <div style={{ marginTop: 'auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                <p style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>by {clientName}</p>
                                {postId && (
                                  <button
                                    onClick={() => router.push(`/posts/${postId}`)}
                                    title="View post"
                                    style={{ width: 26, height: 26, borderRadius: '50%', border: '1px solid #86efac', background: '#dcfce7', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="#15803d"><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"/></svg>
                                  </button>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  </div>
                )
              })()}
            </>
          )}
        </main>

        {/* ══ RIGHT SIDEBAR ══ */}
        <aside className="fp-sidebar-right">

          {/* Agent + Messaging */}
          <div className="fp-right-hdr">
            <button className="fp-agent-btn" onClick={() => router.push('/agent')}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16">
                <path d="m12 2 1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2Z" />
              </svg>
              AI Agent
            </button>
            <button className="fp-msg-btn" onClick={() => router.push('/messages')}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0077b5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>

          {/* Wallet */}
          <div className="fp-wallet">
            <div className="fp-wallet-head">
              <p className="fp-wallet-lbl">Available Balance</p>
              <button className="fp-wallet-icon" onClick={() => togglePanel('addFunds')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#005d8f"><path d="M21 18v1c0 1.1-.9 2-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14c1.1 0 2 .9 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9zm-9-2h10V8H12v8zm4-2.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>
              </button>
            </div>
            {walletLoading
              ? <div className="skel" style={{height:34,width:130,marginTop:10,borderRadius:8}} />
              : <p className="fp-wallet-amt">{balanceLabel}</p>
            }
            <button className="fp-btn-withdraw" onClick={() => togglePanel('withdraw')}>Withdraw Funds</button>
            <button className="fp-btn-add" onClick={() => togglePanel('addFunds')}>+ Add Funds</button>
          </div>

          {/* Connected people */}
          <div className="fp-conn-card">
            <p className="fp-conn-title">People Connected</p>
            {connectedUsers.length === 0
              ? <p className="fp-conn-empty">No connections yet</p>
              : (
                <ul className="fp-conn-list">
                  {connectedUsers.map(u => (
                    <li key={u.id} className="fp-conn-item">
                      <div className="fp-conn-av">
                        {u.profileImage
                          ? <img src={u.profileImage} alt={u.fullName ?? ''} />
                          : <PersonIcon size={16} color="#94a3b8" />
                        }
                      </div>
                      <span className="fp-conn-name">{u.fullName ?? u.email ?? 'User'}</span>
                    </li>
                  ))}
                </ul>
              )
            }
            {connections > 3 && (
              <button className="fp-conn-more" onClick={() => router.push('/network')}>
                View all
              </button>
            )}
          </div>

          {/* Switch Account */}
          <button className="fp-switch" onClick={() => router.push('/profile/client')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#0077b5"><path d="M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/></svg>
            <div style={{flex:1,minWidth:0}}>
              <p className="fp-switch-title">Switch Account</p>
              <p className="fp-switch-sub">Switch to Client</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#94a3b8"><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"/></svg>
          </button>
        </aside>

        {/* ══ MOBILE BOTTOM NAV ══ */}
        <nav className="fp-mobile-nav">
          {NAV_ITEMS.map(item => (
            <button key={item.label}
              className={`fp-mob-item${item.href === '/profile' ? ' active' : ''}`}
              onClick={() => router.push(item.href)}>
              <NavIcon name={item.icon} active={item.href === '/profile'}
                size={item.icon === 'add_box' ? 28 : 22} />
              {item.icon !== 'add_box' && <span className="fp-mob-label">{item.label}</span>}
            </button>
          ))}
        </nav>

      </div>
    </>
  )
}


/* ═══════════════════════════════════════════════
   SUB-COMPONENTS
═══════════════════════════════════════════════ */

function Spin({ light = false }: { light?: boolean }) {
  return (
    <div style={{
      width:18, height:18, borderRadius:'50%',
      border:`2.5px solid ${light ? 'rgba(255,255,255,0.25)' : 'rgba(0,119,181,0.18)'}`,
      borderTopColor: light ? '#fff' : '#0077b5',
      animation:'fp-spin .7s linear infinite', flexShrink:0,
    }} aria-hidden />
  )
}

function ProfileSkeleton() {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      {[110,180,90,70].map((w,i) => <div key={i} className="skel" style={{height:i===1?28:14,width:w,borderRadius:6}} />)}
      <div style={{display:'flex',gap:8}}>{[80,110,90].map(w => <div key={w} className="skel" style={{height:28,width:w,borderRadius:999}} />)}</div>
      <div className="skel" style={{height:46,borderRadius:12,marginTop:4}} />
    </div>
  )
}

function EditCard({ title, onClose, children }: { title:string; onClose:()=>void; children:React.ReactNode }) {
  return (
    <div className="fp-edit-card">
      <div className="fp-edit-card-hdr">
        <h3 className="fp-edit-card-title">{title}</h3>
        <button className="fp-edit-close" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#94a3b8"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
        </button>
      </div>
      <div className="fp-edit-card-body">{children}</div>
    </div>
  )
}

function ProfileSection({ title, onEdit, onAiClick, empty, children }: {
  title:string; onEdit:()=>void; onAiClick?:()=>void; empty:boolean; children:React.ReactNode
}) {
  return (
    <section className="fp-section-card">
      <div className="fp-section-hdr">
        <h3 className="fp-section-title">{title}</h3>
        <div style={{display:'flex',alignItems:'center',gap:6}}>
          {onAiClick && (
            <button className="fp-ai-inline-btn" onClick={onAiClick} title="Generate with AI">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="white"><path d="M12 2a2 2 0 0 1 2 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 0 1 7 7H3a7 7 0 0 1 7-7h1V5.73A2 2 0 0 1 10 4a2 2 0 0 1 2-2M5 15v5h14v-5H5m2 2h2v2H7v-2m4 0h2v2h-2v-2m4 0h2v2h-2v-2z"/></svg>
              Generate
            </button>
          )}
          <button className="fp-edit-icon-btn" onClick={onEdit} title={`Edit ${title}`}>
            <svg width="15" height="15" viewBox="0 0 24 24" fill="#0077b5"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </button>
        </div>
      </div>
      {empty
        ? (
          <button className="fp-section-empty" onClick={onEdit}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#94a3b8"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
            Add {title}
          </button>
        )
        : <div className="fp-section-body">{children}</div>
      }
    </section>
  )
}

function FormRow({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div className="fp-field">
      <label className="fp-field-lbl">{label}</label>
      {children}
    </div>
  )
}

function SaveRow({ onSave, onCancel, saving, disabled = false }: {
  onSave:()=>void; onCancel:()=>void; saving:boolean; disabled?:boolean
}) {
  return (
    <div className="fp-save-row">
      <button className="fp-btn-primary" onClick={onSave} disabled={saving || disabled}>
        {saving ? <><Spin light /> Saving…</> : 'Save Changes'}
      </button>
      <button className="fp-btn-sec" onClick={onCancel}>Cancel</button>
    </div>
  )
}

/* ── SVG Icons ── */
function NavIcon({ name, active=false, size=22 }: { name:string; active?:boolean; size?:number }) {
  const col = active ? '#0077b5' : 'currentColor'
  const paths: Record<string,string> = {
    home:          'M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z',
    group:         'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
    add_box:       'M19 3H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2zm-2 10h-4v4h-2v-4H7v-2h4V7h2v4h4v2z',
    notifications: 'M12 22c1.1 0 2-.9 2-2h-4a2 2 0 0 0 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z',
    person:        'M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z',
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={col} style={{flexShrink:0}}><path d={paths[name]??''}/></svg>
}
function PersonIcon({ size=32, color='#94a3b8' }: { size?:number; color?:string }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill={color}><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
}
function CameraIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M20 4h-3.17L15 2H9L7.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/></svg>
}
function SettingsIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87a.47.47 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 0 0-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
}
function LogoutIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
}

/* ═══════════════════════════════════════════════
   IMAGE EDITOR MODAL (LinkedIn-style)
═══════════════════════════════════════════════ */
function ImageEditorModal({ file, isCover, onDone, onCancel }: {
  file:File; isCover:boolean; onDone:(blob:Blob)=>void; onCancel:()=>void
}) {
  const OUT_W = isCover ? 3840 : 1200
  const OUT_H = isCover ? 960  : 1200
  const PREV_W = isCover ? 520 : 380
  const PREV_H = isCover ? 195 : 380

  const sand2 = '#e8ddd0'; const amber = '#c9873a'; const amberD = '#a86e2a'; const ink = '#2d1f0e'

  const exportCanvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef          = useRef<HTMLImageElement | null>(null)
  const dragging        = useRef(false)
  const lastMouse       = useRef({ x:0, y:0 })

  const [imgUrl,     setImgUrl]     = useState('')
  const [imgNW,      setImgNW]      = useState(0)
  const [imgNH,      setImgNH]      = useState(0)
  const [offsetX,    setOffsetX]    = useState(0)
  const [offsetY,    setOffsetY]    = useState(0)
  const [zoom,       setZoom]       = useState(1)
  const [straighten, setStraighten] = useState(0)
  const [brightness, setBrightness] = useState(100)
  const [contrast,   setContrast]   = useState(100)
  const [saturation, setSaturation] = useState(100)
  const [filter,     setFilter]     = useState('Normal')
  const [tab,        setTab]        = useState<'crop'|'filter'|'adjust'>('crop')
  const [saving,     setSaving]     = useState(false)

  const offsetXRef = useRef(0); const offsetYRef = useRef(0); const zoomRef = useRef(1)

  const FILTERS = [
    {name:'Normal',css:''},{name:'Vivid',css:'saturate(1.6) contrast(1.1)'},
    {name:'Warm',css:'sepia(0.3) saturate(1.4) brightness(1.05)'},{name:'Cool',css:'hue-rotate(20deg) saturate(0.9) brightness(1.05)'},
    {name:'Fade',css:'brightness(1.1) contrast(0.85) saturate(0.75)'},{name:'Mono',css:'grayscale(1)'},
    {name:'Drama',css:'contrast(1.3) brightness(0.9) saturate(1.2)'},{name:'Matte',css:'contrast(0.9) brightness(1.05) saturate(0.8)'},
  ]

  useEffect(() => {
    const url = URL.createObjectURL(file); setImgUrl(url)
    const img = new Image()
    img.onload = () => {
      imgRef.current = img; setImgNW(img.naturalWidth); setImgNH(img.naturalHeight)
      const z = Math.max(PREV_W/img.naturalWidth, PREV_H/img.naturalHeight)
      setZoom(z); zoomRef.current = z
      const ox = (PREV_W - img.naturalWidth*z)/2; const oy = (PREV_H - img.naturalHeight*z)/2
      setOffsetX(ox); offsetXRef.current = ox; setOffsetY(oy); offsetYRef.current = oy
    }; img.src = url
    return () => URL.revokeObjectURL(url)
  }, [])

  useEffect(() => { offsetXRef.current = offsetX }, [offsetX])
  useEffect(() => { offsetYRef.current = offsetY }, [offsetY])
  useEffect(() => { zoomRef.current    = zoom    }, [zoom])

  function minZ() { return imgNW && imgNH ? Math.max(PREV_W/imgNW, PREV_H/imgNH) : 1 }
  function clamp(ox:number,oy:number,z:number) {
    const sw = imgNW*z; const sh = imgNH*z
    return { ox: Math.min(0,Math.max(ox,PREV_W-sw)), oy: Math.min(0,Math.max(oy,PREV_H-sh)) }
  }

  function onPD(e: React.PointerEvent<HTMLDivElement>) {
    dragging.current=true; lastMouse.current={x:e.clientX,y:e.clientY}
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); e.preventDefault()
  }
  function onPM(e: React.PointerEvent<HTMLDivElement>) {
    if (!dragging.current) return
    const dx=e.clientX-lastMouse.current.x; const dy=e.clientY-lastMouse.current.y
    lastMouse.current={x:e.clientX,y:e.clientY}
    const {ox,oy}=clamp(offsetXRef.current+dx,offsetYRef.current+dy,zoomRef.current)
    setOffsetX(ox); offsetXRef.current=ox; setOffsetY(oy); offsetYRef.current=oy
  }
  function onPU() { dragging.current=false }

  function handleZoom(nz:number) {
    const z=Math.max(minZ(),nz); zoomRef.current=z
    const {ox,oy}=clamp(offsetXRef.current,offsetYRef.current,z)
    setZoom(z); setOffsetX(ox); offsetXRef.current=ox; setOffsetY(oy); offsetYRef.current=oy
  }

  function cssF() {
    let f=`brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
    if (straighten!==0) f+=` rotate(${straighten}deg)`
    const p=FILTERS.find(p=>p.name===filter); if(p?.css) f+=' '+p.css; return f
  }

  async function handleSave() {
    if(!imgRef.current) return; setSaving(true)
    const canvas=exportCanvasRef.current!; canvas.width=OUT_W; canvas.height=OUT_H
    const ctx=canvas.getContext('2d')!; ctx.filter=cssF()
    const z=zoomRef.current; const srcX=-offsetXRef.current/z; const srcY=-offsetYRef.current/z
    ctx.drawImage(imgRef.current,srcX,srcY,PREV_W/z,PREV_H/z,0,0,OUT_W,OUT_H); ctx.filter='none'
    await new Promise(r=>setTimeout(r,40))
    canvas.toBlob(b=>{if(b)onDone(b);else{toast.error('Export failed');setSaving(false)}},'image/webp',0.98)
  }

  function handleReset() {
    if(!imgRef.current||!imgNW) return
    const z=Math.max(PREV_W/imgNW,PREV_H/imgNH); const ox=(PREV_W-imgNW*z)/2; const oy=(PREV_H-imgNH*z)/2
    setZoom(z);zoomRef.current=z;setOffsetX(ox);offsetXRef.current=ox;setOffsetY(oy);offsetYRef.current=oy
    setStraighten(0);setBrightness(100);setContrast(100);setSaturation(100);setFilter('Normal')
  }

  return (
    <div style={{position:'fixed',inset:0,zIndex:10000,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
      <canvas ref={exportCanvasRef} style={{display:'none'}}/>
      <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:isCover?780:620,maxHeight:'95dvh',display:'flex',flexDirection:'column',boxShadow:'0 24px 80px rgba(0,0,0,0.28)',overflow:'hidden',fontFamily:'Inter,sans-serif'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'15px 20px',borderBottom:'1px solid #f1f5f9',flexShrink:0}}>
          <h3 style={{fontSize:15,fontWeight:700,color:ink,margin:0}}>Edit image</h3>
          <button onClick={onCancel} style={{background:'none',border:'none',cursor:'pointer',color:'#94a3b8',display:'flex'}}><svg width="20" height="20" viewBox="0 0 24 24" fill={ink}><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
        </div>
        <div style={{display:'flex',flex:1,overflow:'hidden',minHeight:0}}>
          <div style={{flex:1,background:'#e8e4de',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden'}}>
            <div onPointerDown={onPD} onPointerMove={onPM} onPointerUp={onPU} onPointerCancel={onPU}
              style={{position:'relative',width:PREV_W,height:PREV_H,overflow:'hidden',cursor:'grab',flexShrink:0,userSelect:'none'}}>
              {imgUrl&&<img src={imgUrl} alt="" draggable={false} style={{position:'absolute',left:offsetX,top:offsetY,width:imgNW*zoom,height:imgNH*zoom,filter:cssF(),pointerEvents:'none'}}/>}
              {[1,2].map(i=><div key={`h${i}`} style={{position:'absolute',left:0,right:0,top:`${i/3*100}%`,height:1,background:'rgba(255,255,255,0.55)',pointerEvents:'none'}}/>)}
              {[1,2].map(i=><div key={`v${i}`} style={{position:'absolute',top:0,bottom:0,left:`${i/3*100}%`,width:1,background:'rgba(255,255,255,0.55)',pointerEvents:'none'}}/>)}
              <div style={{position:'absolute',inset:0,border:'2px solid rgba(255,255,255,0.85)',boxSizing:'border-box',pointerEvents:'none'}}/>
            </div>
          </div>
          <div style={{width:200,flexShrink:0,background:'#fff',borderLeft:'1px solid #f1f5f9',display:'flex',flexDirection:'column',overflow:'hidden'}}>
            <div style={{display:'flex',borderBottom:'1px solid #f1f5f9',flexShrink:0}}>
              {(['crop','filter','adjust'] as const).map(t=>(
                <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'13px 2px',border:'none',background:'none',fontSize:12,fontWeight:700,color:tab===t?ink:'#94a3b8',cursor:'pointer',borderBottom:tab===t?`2.5px solid ${ink}`:'2.5px solid transparent',fontFamily:'Inter,sans-serif'}}>
                  {t.charAt(0).toUpperCase()+t.slice(1)}
                </button>
              ))}
            </div>
            <div style={{flex:1,overflowY:'auto',padding:'14px 14px 18px'}}>
              {tab==='crop'&&(
                <div style={{display:'flex',flexDirection:'column',gap:18}}>
                  <div style={{display:'flex',gap:6,justifyContent:'center'}}>
                    {[
                      {t:'Rotate L',p:'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z',a:()=>setStraighten(p=>Math.max(-45,p-15))},
                      {t:'Rotate R',p:'M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z',a:()=>setStraighten(p=>Math.min(45,p+15))},
                      {t:'Reset',p:'M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z',a:handleReset},
                    ].map((btn,i)=>(
                      <button key={i} title={btn.t} onClick={btn.a} style={{width:34,height:34,borderRadius:7,border:`1px solid ${sand2}`,background:'#fafaf8',cursor:'pointer',display:'flex',alignItems:'center',justifyContent:'center'}}>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="#64748b"><path d={btn.p}/></svg>
                      </button>
                    ))}
                  </div>
                  {[
                    {label:'Zoom',val:Math.round(zoom*100),min:Math.round(minZ()*100),max:400,onChange:(v:number)=>handleZoom(v/100)},
                    {label:'Straighten',val:straighten,min:-45,max:45,onChange:setStraighten},
                  ].map(sl=>(
                    <div key={sl.label}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                        <span style={{fontSize:12,fontWeight:600,color:ink}}>{sl.label}</span>
                        <span style={{fontSize:11,fontWeight:700,color:'#64748b'}}>{sl.label==='Straighten'&&sl.val>0?'+':''}{sl.val}{sl.label==='Straighten'?'°':'%'}</span>
                      </div>
                      <input type="range" min={sl.min} max={sl.max} step={sl.label==='Straighten'?0.5:1} value={sl.val}
                        onChange={e=>sl.onChange(Number(e.target.value))}
                        style={{width:'100%',height:4,borderRadius:999,appearance:'none',WebkitAppearance:'none',background:`linear-gradient(to right,${ink} ${((sl.val-sl.min)/(sl.max-sl.min))*100}%,${sand2} ${((sl.val-sl.min)/(sl.max-sl.min))*100}%)`,cursor:'pointer',outline:'none'}}/>
                    </div>
                  ))}
                </div>
              )}
              {tab==='filter'&&(
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {FILTERS.map(p=>(
                    <button key={p.name} onClick={()=>setFilter(p.name)} style={{padding:'8px 4px',borderRadius:8,cursor:'pointer',border:filter===p.name?`2px solid ${amber}`:'1.5px solid #e8e4de',background:filter===p.name?'#fef3e2':'#fafaf8',display:'flex',flexDirection:'column',alignItems:'center',gap:5}}>
                      <div style={{width:'100%',height:36,borderRadius:5,background:'linear-gradient(135deg,#d4b896 0%,#a8c4a8 50%,#8ab0c8 100%)',filter:p.css||'none'}}/>
                      <span style={{fontSize:9,fontWeight:800,textTransform:'uppercase',letterSpacing:'.04em',color:filter===p.name?amber:'#64748b'}}>{p.name}</span>
                    </button>
                  ))}
                </div>
              )}
              {tab==='adjust'&&(
                <div style={{display:'flex',flexDirection:'column',gap:18}}>
                  {[
                    {l:'Brightness',v:brightness,s:setBrightness,mn:40,mx:200},
                    {l:'Contrast',  v:contrast,  s:setContrast,  mn:40,mx:200},
                    {l:'Saturation',v:saturation,s:setSaturation,mn:0, mx:200},
                  ].map(sl=>(
                    <div key={sl.l}>
                      <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                        <span style={{fontSize:12,fontWeight:600,color:ink}}>{sl.l}</span>
                        <span style={{fontSize:11,fontWeight:700,color:amber}}>{sl.v}%</span>
                      </div>
                      <input type="range" min={sl.mn} max={sl.mx} step={1} value={sl.v}
                        onChange={e=>sl.s(Number(e.target.value))}
                        style={{width:'100%',height:4,borderRadius:999,appearance:'none',WebkitAppearance:'none',background:`linear-gradient(to right,${amber} ${((sl.v-sl.mn)/(sl.mx-sl.mn))*100}%,${sand2} ${((sl.v-sl.mn)/(sl.mx-sl.mn))*100}%)`,cursor:'pointer',outline:'none'}}/>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
        <div style={{display:'flex',justifyContent:'flex-end',gap:10,padding:'12px 20px',borderTop:'1px solid #f1f5f9',background:'#fff',flexShrink:0}}>
          <button onClick={onCancel} style={{padding:'10px 20px',background:'#f1f5f9',color:ink,border:'none',borderRadius:8,fontSize:14,fontWeight:600,cursor:'pointer',fontFamily:'Inter,sans-serif'}}>Cancel</button>
          <button onClick={handleSave} disabled={saving} style={{padding:'10px 26px',background:saving?amberD:amber,color:'#fff',border:'none',borderRadius:8,fontSize:14,fontWeight:700,cursor:saving?'not-allowed':'pointer',fontFamily:'Inter,sans-serif',display:'flex',alignItems:'center',gap:8,opacity:saving?0.85:1}}>
            {saving?<><div style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'fp-spin .7s linear infinite'}}/> Saving…</>:'Save'}
          </button>
        </div>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════ */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

@keyframes fp-spin{to{transform:rotate(360deg);}}
@keyframes fp-shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
.skel{background:linear-gradient(90deg,#e8eaed 25%,#f5f5f5 50%,#e8eaed 75%);background-size:1200px 100%;animation:fp-shimmer 1.4s ease infinite;}

/* ── ROOT ── */
.fp-root{display:grid;grid-template-areas:"header""main""mobile-nav";grid-template-rows:60px 1fr 60px;grid-template-columns:1fr;background:#f1f5f9;min-height:100dvh;font-family:'Inter',sans-serif;color:#0f172a;}
@media(min-width:900px){.fp-root{grid-template-areas:"left-sidebar main right-sidebar";grid-template-columns:230px 1fr 260px;grid-template-rows:1fr;}}

/* ── MOBILE HEADER ── */
.fp-header{grid-area:header;display:flex;align-items:center;justify-content:space-between;padding:0 18px;background:#fff;border-bottom:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.05);position:sticky;top:0;z-index:100;}
@media(min-width:900px){.fp-header{display:none;}}
.fp-hdr-left{display:flex;align-items:center;gap:7px;}
.fp-brand{font-size:19px;font-weight:800;color:#0077b5;letter-spacing:-0.03em;font-family:'Inter',sans-serif;}
.fp-hdr-right{display:flex;align-items:center;gap:10px;}
.fp-agent-btn{display:flex;align-items:center;gap:6px;background:linear-gradient(135deg,#0077b5,#005d8f);color:#fff;border:none;border-radius:999px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 2px 8px rgba(0,119,181,0.3);transition:transform .15s;}
.fp-agent-btn:active{transform:scale(.95);}
.fp-agent-text{display:none;}
@media(min-width:380px){.fp-agent-text{display:inline;}}
.fp-msg-btn{position:relative;width:40px;height:40px;border-radius:50%;border:1.5px solid #e2e8f0;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;box-shadow:0 1px 5px rgba(0,0,0,0.07);transition:transform .15s;}
.fp-msg-btn:active{transform:scale(.93);}

/* ── LEFT SIDEBAR ── */
.fp-sidebar-left{display:none;grid-area:left-sidebar;}
@media(min-width:900px){.fp-sidebar-left{display:flex;flex-direction:column;background:#fff;border-right:1px solid #e2e8f0;padding:24px 14px;position:sticky;top:0;height:100dvh;overflow-y:auto;}}
.fp-sidebar-brand{display:flex;align-items:center;gap:8px;padding:0 8px;margin-bottom:24px;}
.fp-sidebar-nav{display:flex;flex-direction:column;gap:3px;flex:1;}
.fp-nav-item{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:12px;border:none;background:transparent;color:#475569;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;text-align:left;width:100%;transition:background .15s,color .15s;}
.fp-nav-item:hover{background:#f0f9ff;color:#0077b5;}
.fp-nav-item.active{background:linear-gradient(135deg,#e8f4fd,#dbeffe);color:#0077b5;font-weight:700;box-shadow:inset 0 1px 3px rgba(0,119,181,0.1);}
.fp-nav-label{flex:1;}
.fp-sidebar-bottom{display:flex;flex-direction:column;gap:3px;border-top:1px solid #f1f5f9;padding-top:10px;}
.fp-nav-danger{color:#dc2626!important;}
.fp-nav-danger:hover{background:#fef2f2!important;color:#dc2626!important;}

/* ── MAIN ── */
.fp-main{grid-area:main;min-width:0;padding-bottom:70px;display:flex;flex-direction:column;gap:0;}
@media(min-width:900px){.fp-main{padding:24px 22px 40px;gap:14px;}}

/* ── PROFILE CARD ── */
.fp-card{background:#fff;border-radius:0 0 24px 24px;overflow:visible;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.08);border:1px solid rgba(0,0,0,0.04);}
@media(min-width:900px){.fp-card{border-radius:20px;box-shadow:0 2px 8px rgba(0,0,0,0.05),0 8px 28px rgba(0,0,0,0.09);}}

/* ── COVER ── */
.fp-cover{position:relative;margin:14px 14px 0;border-radius:18px;overflow:hidden;height:155px;cursor:pointer;}
.fp-cover-inner{width:100%;height:100%;}
.fp-cover-img{width:100%;height:100%;object-fit:cover;object-position:center;display:block;}
.fp-cover-ph{width:100%;height:100%;background:linear-gradient(120deg,#b8cfd8 0%,#c8d9e4 30%,#d5e2e8 55%,#dce5db 80%,#e2ddd0 100%);}
.fp-cover::after{content:'';position:absolute;inset:0;background:rgba(0,0,0,0.04);pointer-events:none;}
.fp-cover-loader{position:absolute;inset:0;z-index:6;background:rgba(255,255,255,0.72);display:flex;align-items:center;justify-content:center;}
@media(min-width:900px){.fp-cover{height:200px;border-radius:18px 18px 0 0;}}
.fp-btn-cover{position:absolute;top:12px;right:12px;z-index:10;background:rgba(255,255,255,0.93);color:#0077b5;border:1.5px solid rgba(255,255,255,0.93);padding:7px 16px;border-radius:999px;font-size:12px;font-weight:600;display:flex;align-items:center;gap:6px;cursor:pointer;backdrop-filter:blur(10px);box-shadow:0 2px 10px rgba(0,0,0,0.12);font-family:'Inter',sans-serif;transition:transform .15s;}
.fp-btn-cover:active{transform:scale(.95);}

/* ── BELOW COVER (avatar + availability + edit profile) ── */
.fp-below-cover{display:flex;align-items:flex-end;justify-content:space-between;padding:0 18px;margin-top:-42px;margin-bottom:10px;position:relative;z-index:20;pointer-events:none;}
@media(min-width:900px){.fp-below-cover{padding:0 22px;margin-top:-46px;margin-bottom:16px;}}
.fp-avatar{position:relative;margin-left:2px;width:80px;height:80px;border-radius:14px;overflow:hidden;background:#e2e5e9;border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,0.18);cursor:pointer;padding:0;flex-shrink:0;display:block;transition:box-shadow .2s;pointer-events:auto;}
.fp-avatar:hover{box-shadow:0 4px 18px rgba(0,0,0,0.26);}
.fp-avatar img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block;}
.fp-avatar-ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#dde4ea;}
.fp-avatar-hover{position:absolute;inset:0;background:rgba(0,0,0,0.32);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;border-radius:11px;}
.fp-avatar:hover .fp-avatar-hover{opacity:1;}
.fp-avatar-loader{position:absolute;inset:0;background:rgba(255,255,255,0.8);display:flex;align-items:center;justify-content:center;}
@media(min-width:900px){.fp-avatar{width:92px;height:92px;border-radius:16px;}}

.fp-avail-badge{display:flex;align-items:center;gap:5px;padding:6px 12px;border-radius:999px;font-size:11px;font-weight:800;cursor:pointer;border:1.5px solid;transition:all .15s;font-family:'Inter',sans-serif;}
.fp-avail-badge.available{background:#dcfce7;color:#15803d;border-color:#86efac;}
.fp-avail-badge.unavailable{background:#f1f5f9;color:#64748b;border-color:#cbd5e1;}
.fp-avail-dot{width:7px;height:7px;border-radius:50%;background:currentColor;}
.fp-btn-edit-profile{background:linear-gradient(135deg,#0284c7,#0077b5);color:#fff;border:none;padding:10px 18px;border-radius:999px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:7px;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 3px 12px rgba(0,119,181,0.3);transition:transform .15s,box-shadow .15s;}
.fp-btn-edit-profile:hover{box-shadow:0 5px 18px rgba(0,119,181,0.4);}
.fp-btn-edit-profile:active{transform:scale(.96);}

/* ── PROFILE INFO ── */
.fp-profile-info{padding:2px 18px 22px 20px;display:flex;flex-direction:column;gap:7px;}
@media(min-width:900px){.fp-profile-info{padding:2px 24px 22px;}}
.fp-conn-count{font-size:12px;font-weight:700;color:#0077b5;display:flex;align-items:center;gap:4px;opacity:.85;}
.fp-name-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
.fp-name{font-size:22px;font-weight:800;line-height:1.15;color:#0f172a;letter-spacing:-0.03em;font-family:'Inter',sans-serif;}
@media(min-width:900px){.fp-name{font-size:26px;}}
.fp-title{font-size:14px;font-weight:500;color:#0077b5;margin-top:2px;font-family:'Inter',sans-serif;}
.fp-title-level{color:#475569;font-weight:700;}
.fp-input-prefix-wrap{position:relative;display:flex;align-items:center;}
.fp-input-prefix{position:absolute;left:13px;font-size:14px;font-weight:700;color:#64748b;pointer-events:none;z-index:1;}
.fp-input-with-prefix{padding-left:32px!important;}
.fp-location{font-size:12px;color:#94a3b8;display:flex;align-items:center;gap:3px;margin-top:2px;}
.fp-bio{font-size:14px;font-weight:400;color:#475569;line-height:1.7;font-family:'Inter',sans-serif;}
.fp-badges-row{display:flex;flex-wrap:wrap;gap:6px;}
.fp-badge{padding:4px 10px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;}
.fp-badge-level{background:#e8f4fd;color:#005d8f;}
.fp-badge-notice{background:#dcfce7;color:#15803d;}
.fp-badge-tz{background:#f1f5f9;color:#475569;}
.fp-badge-fixed{background:#fef3c7;color:#92400e;}
.fp-tags{display:flex;flex-wrap:wrap;gap:6px;list-style:none;}
.fp-tag{background:linear-gradient(135deg,#e0f2fe,#dbeffe);color:#0369a1;border:1px solid #bae6fd;padding:5px 12px;border-radius:999px;font-size:10.5px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;font-family:'Inter',sans-serif;}
.fp-rates-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;}
.fp-rate-chip{display:flex;flex-direction:column;gap:1px;background:linear-gradient(135deg,#f0f9ff,#e8f4fd);border:1px solid #bae6fd;padding:6px 12px;border-radius:10px;}
.fp-rate-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;}
.fp-rate-val{font-size:14px;font-weight:800;color:#0f172a;}
.fp-edit-icon-btn{background:none;border:none;cursor:pointer;padding:6px;border-radius:8px;display:flex;align-items:center;justify-content:center;transition:background .15s;flex-shrink:0;}
.fp-edit-icon-btn:hover{background:#f0f9ff;}
.fp-btn-edit-bio{width:100%;background:linear-gradient(135deg,#0284c7,#0077b5);color:#fff;border:none;padding:13px;border-radius:14px;font-size:14px;font-weight:800;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 4px 18px rgba(0,119,181,0.32);transition:transform .15s,box-shadow .15s;margin-top:4px;}
.fp-btn-edit-bio:hover{box-shadow:0 6px 22px rgba(0,119,181,0.42);transform:translateY(-1px);}
.fp-btn-edit-bio:active{transform:scale(.98);}

/* ── SECTION CARDS ── */
.fp-section-card{background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 14px rgba(0,0,0,0.07);border:1px solid rgba(0,0,0,0.04);overflow:hidden;margin-top:0;}
.fp-section-hdr{display:flex;align-items:center;justify-content:space-between;padding:16px 18px 12px;border-bottom:1px solid #f1f5f9;border-left:3px solid #0077b5;}
.fp-section-title{font-size:15px;font-weight:700;color:#0f172a;font-family:'Inter',sans-serif;}
.fp-section-body{padding:14px 18px 18px;}
.fp-section-empty{width:100%;background:none;border:none;cursor:pointer;padding:18px;font-size:13px;color:#94a3b8;display:flex;align-items:center;justify-content:center;gap:8px;font-family:'Inter',sans-serif;font-weight:600;transition:background .15s;}
.fp-section-empty:hover{background:#f8fafc;}

/* ── EDIT CARDS ── */
.fp-edit-card{background:#fff;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.06),0 8px 28px rgba(0,0,0,0.09);border:1px solid rgba(0,0,0,0.04);overflow:visible;position:relative;z-index:2;}
.fp-edit-card-hdr{display:flex;align-items:center;justify-content:space-between;padding:15px 18px 12px;border-bottom:1px solid #f1f5f9;}
.fp-edit-card-title{font-size:15px;font-weight:700;color:#0f172a;font-family:'Inter',sans-serif;}
.fp-edit-close{background:none;border:none;cursor:pointer;padding:3px;display:flex;transition:opacity .15s;}
.fp-edit-close:hover{opacity:.7;}
.fp-edit-card-body{padding:16px 18px 20px;}

/* ── FORMS ── */
.fp-form{display:flex;flex-direction:column;gap:12px;}
.fp-form-2col{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
@media(max-width:500px){.fp-form-2col{grid-template-columns:1fr;}}
.fp-field{display:flex;flex-direction:column;gap:5px;}
.fp-field-lbl{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#64748b;font-family:'Inter',sans-serif;}
.fp-input{width:100%;border:1.5px solid #e2e8f0;border-radius:10px;padding:10px 13px;font-size:14px;font-family:'Inter',sans-serif;color:#0f172a;outline:none;background:#f8fafc;transition:border-color .15s;}
.fp-input:focus{border-color:#0077b5;background:#fff;box-shadow:0 0 0 3px rgba(0,119,181,0.1);}
.fp-textarea{resize:vertical;min-height:80px;}
.fp-char-count{font-size:11px;text-align:right;margin-top:3px;}
.fp-section-note{font-size:12px;color:#94a3b8;line-height:1.5;}
.fp-warn{font-size:12px;color:#dc2626;font-weight:600;}
.fp-sec-lbl{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;}
.fp-divider{height:1px;background:#f1f5f9;margin:4px 0;}
.fp-save-row{display:flex;gap:10px;margin-top:4px;}
.fp-save-row>*{flex:1;}
.fp-form-row{display:flex;gap:10px;}
.fp-form-row>*{flex:1;}
.fp-toggle-row{display:flex;align-items:center;justify-content:space-between;padding:4px 0;}
.fp-toggle-label{font-size:13px;font-weight:600;color:#0f172a;}
.fp-toggle{width:44px;height:24px;border-radius:999px;border:none;background:#e2e8f0;cursor:pointer;position:relative;transition:background .2s;flex-shrink:0;}
.fp-toggle.on{background:#0077b5;}
.fp-toggle-thumb{position:absolute;top:3px;left:3px;width:18px;height:18px;border-radius:50%;background:#fff;transition:transform .2s;box-shadow:0 1px 4px rgba(0,0,0,0.18);}
.fp-toggle.on .fp-toggle-thumb{transform:translateX(20px);}

/* ── SKILL EDITOR ── */
.fp-skill-input-row{display:flex;gap:8px;}
.fp-skill-input-row .fp-input{flex:1;}
.fp-btn-add-item{background:#0077b5;color:#fff;border:none;border-radius:10px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;white-space:nowrap;transition:filter .15s;}
.fp-btn-add-item:active{filter:brightness(.88);}
.fp-suggestions{display:flex;flex-wrap:wrap;gap:6px;}
.fp-suggestion{background:#f0f9ff;color:#0077b5;border:1px solid #bae6fd;border-radius:999px;padding:5px 12px;font-size:11px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;}
.fp-suggestion:hover{background:#0077b5;color:#fff;border-color:#0077b5;}
.fp-skills-edit-list{display:flex;flex-wrap:wrap;gap:7px;list-style:none;}
.fp-skill-edit-item{display:flex;align-items:center;gap:5px;background:#dbeeff;color:#005d8f;border-radius:999px;padding:5px 10px 5px 13px;font-size:11px;font-weight:800;}
.fp-remove-btn{background:none;border:none;cursor:pointer;color:#94a3b8;padding:1px;display:flex;line-height:1;transition:color .15s;}
.fp-remove-btn:hover{color:#dc2626;}

/* ── LANGUAGE EDITOR ── */
.fp-lang-row{display:flex;align-items:center;gap:8px;}
.fp-lang-select{flex:1;}
.fp-lang-prof{width:130px;flex-shrink:0;}
.fp-btn-add-row{display:flex;align-items:center;gap:6px;background:none;border:1.5px dashed #e2e8f0;border-radius:10px;padding:10px 14px;font-size:13px;font-weight:500;color:#64748b;cursor:pointer;width:100%;font-family:'Inter',sans-serif;transition:border-color .15s,color .15s;}
.fp-btn-add-row:hover{border-color:#0077b5;color:#0077b5;}

/* ── PORTFOLIO EDITOR ── */
.fp-portfolio-row{display:flex;align-items:center;gap:8px;}
.fp-portfolio-label{width:120px;flex-shrink:0;}
.fp-portfolio-url{flex:1;}

/* ── EXPERIENCE EDITOR ── */
.fp-exp-block{border:1px solid #f1f5f9;border-radius:12px;padding:14px;display:flex;flex-direction:column;gap:10px;}
.fp-exp-header{display:flex;align-items:center;justify-content:space-between;}
.fp-exp-num{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;}

/* ── DISPLAY SECTIONS ── */
.fp-rates-display{display:flex;flex-wrap:wrap;gap:10px;}
.fp-rate-display-chip{display:flex;flex-direction:column;gap:2px;background:#f8fafc;border:1px solid #e2e8f0;padding:10px 16px;border-radius:12px;min-width:100px;}
.fp-rate-display-chip span{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;}
.fp-rate-display-chip strong{font-size:16px;font-weight:800;color:#0f172a;}
.fp-lang-display{display:flex;flex-wrap:wrap;gap:8px;}
.fp-lang-chip{display:flex;align-items:center;gap:6px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:7px 12px;}
.fp-lang-name{font-size:13px;font-weight:700;color:#0f172a;}
.fp-lang-prof-badge{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;background:linear-gradient(135deg,#e0f2fe,#dbeffe);color:#0369a1;border:1px solid #bae6fd;padding:2px 7px;border-radius:999px;}
.fp-portfolio-display{display:flex;flex-direction:column;gap:8px;}
.fp-portfolio-link{display:flex;align-items:center;gap:8px;color:#0077b5;text-decoration:none;font-size:13px;font-weight:600;padding:8px 12px;background:linear-gradient(135deg,#f0f9ff,#e8f4fd);border:1px solid #bae6fd;border-radius:10px;transition:background .15s;}
.fp-portfolio-link:hover{background:#e8f4fd;}
.fp-portfolio-link span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.fp-timeline{display:flex;flex-direction:column;gap:14px;}
.fp-timeline-item{display:flex;gap:12px;align-items:flex-start;}
.fp-timeline-dot{width:10px;height:10px;border-radius:50%;background:#0077b5;flex-shrink:0;margin-top:4px;box-shadow:0 0 0 3px rgba(0,119,181,0.18);}
.fp-timeline-body{flex:1;min-width:0;}
.fp-timeline-title{font-size:14px;font-weight:700;color:#0f172a;}
.fp-timeline-sub{font-size:12px;color:#64748b;margin-top:2px;}
.fp-timeline-desc{font-size:13px;color:#536279;line-height:1.6;margin-top:4px;}

/* ── BUTTONS ── */
.fp-btn-primary{background:linear-gradient(135deg,#0284c7,#0077b5);color:#fff;border:none;border-radius:12px;padding:12px 16px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;width:100%;display:flex;align-items:center;justify-content:center;gap:7px;transition:filter .15s,box-shadow .15s;box-shadow:0 3px 12px rgba(0,119,181,0.28);}
.fp-btn-primary:not(:disabled):hover{box-shadow:0 5px 18px rgba(0,119,181,0.38);}
.fp-btn-primary:disabled{opacity:.6;cursor:not-allowed;}
.fp-btn-primary:not(:disabled):active{filter:brightness(.88);}
.fp-btn-sec{background:#f8fafc;color:#64748b;border:1.5px solid #e2e8f0;border-radius:12px;padding:12px 16px;font-size:14px;font-weight:500;cursor:pointer;font-family:'Inter',sans-serif;width:100%;transition:background .15s;}
.fp-btn-sec:active{background:#f1f5f9;}
.fp-btn-danger{background:transparent;color:#dc2626;border:1.5px solid #fca5a5;border-radius:12px;padding:12px 16px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;width:100%;display:flex;align-items:center;justify-content:center;gap:7px;transition:background .15s;}
.fp-btn-danger:active{background:#fef2f2;}

/* ── QUICK AMOUNTS ── */
.fp-quick-wrap{display:flex;flex-wrap:wrap;gap:8px;}
.fp-quick{background:#f0f9ff;border:1.5px solid #bae6fd;border-radius:999px;padding:7px 13px;font-size:13px;font-weight:600;color:#0369a1;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;}
.fp-quick.active,.fp-quick:hover{background:#0077b5;border-color:#0077b5;color:#fff;}
.fp-bal-row{display:flex;justify-content:space-between;align-items:center;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:11px 14px;font-size:14px;color:#0369a1;font-weight:600;}
.fp-bal-row strong{font-size:15px;font-weight:800;color:#0f172a;}

/* ── RIGHT SIDEBAR ── */
.fp-sidebar-right{display:none;grid-area:right-sidebar;}
@media(min-width:900px){.fp-sidebar-right{display:flex;flex-direction:column;gap:14px;padding:24px 14px 40px;background:#f1f5f9;position:sticky;top:0;height:100dvh;overflow-y:auto;overflow-x:hidden;min-width:0;width:100%;}}
.fp-right-hdr{display:flex;align-items:center;justify-content:space-between;gap:8px;background:#fff;border-radius:14px;padding:10px 12px;border:0.5px solid #e8edf2;box-shadow:0 1px 4px rgba(0,0,0,0.05);min-width:0;overflow:hidden;}
.fp-wallet{background:linear-gradient(145deg,#cce8ff 0%,#d4eeff 45%,#e4f3ff 100%);border:1px solid #93c5fd;border-radius:16px;padding:16px;min-width:0;}
.fp-wallet-head{display:flex;justify-content:space-between;align-items:flex-start;}
.fp-wallet-lbl{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#0369a1;font-family:'Inter',sans-serif;}
.fp-wallet-icon{background:rgba(0,93,143,0.1);border:none;border-radius:10px;width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s;}
.fp-wallet-icon:hover{background:rgba(0,93,143,0.18);}
.fp-wallet-amt{font-size:24px;font-weight:700;letter-spacing:-.02em;line-height:1;color:#0f172a;margin-top:8px;font-family:'Inter',sans-serif;}
.fp-btn-withdraw{width:100%;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-weight:800;font-size:14px;padding:11px;border-radius:12px;border:none;cursor:pointer;margin-top:12px;font-family:'Inter',sans-serif;box-shadow:0 3px 12px rgba(34,197,94,0.3);transition:transform .15s,box-shadow .15s;}
.fp-btn-withdraw:hover{box-shadow:0 5px 16px rgba(34,197,94,0.42);}
.fp-btn-withdraw:active{transform:scale(.97);}
.fp-btn-add{width:100%;background:linear-gradient(135deg,#0077b5,#005d8f);color:#fff;border:none;font-weight:800;font-size:13px;padding:8px;border-radius:12px;cursor:pointer;margin-top:8px;font-family:'Inter',sans-serif;box-shadow:0 2px 8px rgba(0,119,181,0.22);transition:box-shadow .15s;}
.fp-btn-add:hover{box-shadow:0 4px 14px rgba(0,119,181,0.34);}
.fp-conn-card{background:#fff;border-radius:16px;padding:16px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.06);min-width:0;overflow:hidden;}
.fp-conn-title{font-size:11px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:12px;}
.fp-conn-empty{font-size:13px;color:#94a3b8;}
.fp-conn-list{list-style:none;display:flex;flex-direction:column;gap:10px;}
.fp-conn-item{display:flex;align-items:center;gap:10px;min-width:0;}
.fp-conn-av{width:32px;height:32px;border-radius:50%;overflow:hidden;background:#e2e5e9;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.fp-conn-av img{width:100%;height:100%;object-fit:cover;}
.fp-conn-name{font-size:13px;font-weight:600;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.fp-conn-more{width:100%;background:none;border:none;cursor:pointer;color:#0077b5;font-size:12px;font-weight:700;padding:8px 0 0;font-family:'Inter',sans-serif;text-align:left;}
.fp-conn-more:hover{opacity:.75;}
.fp-switch{background:linear-gradient(135deg,#f8fafc,#f0f9ff);border-radius:16px;padding:12px 14px;border:1px solid #e2e8f0;cursor:pointer;display:flex;align-items:center;gap:10px;font-family:'Inter',sans-serif;text-align:left;width:100%;min-width:0;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.05);transition:box-shadow .15s;}
.fp-switch:hover{box-shadow:0 3px 14px rgba(0,0,0,0.1);}
.fp-switch-title{font-size:13px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.fp-switch-sub{font-size:12px;color:#94a3b8;margin-top:2px;}

/* ── MOBILE BOTTOM NAV ── */
.fp-mobile-nav{grid-area:mobile-nav;display:flex;justify-content:space-around;align-items:center;background:#fff;border-top:1px solid #e2e8f0;z-index:100;position:sticky;bottom:0;box-shadow:0 -2px 12px rgba(0,0,0,0.06);}
@media(min-width:900px){.fp-mobile-nav{display:none;}}
.fp-mob-item{display:flex;flex-direction:column;align-items:center;gap:2px;background:none;border:none;cursor:pointer;color:#94a3b8;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;font-family:'Inter',sans-serif;padding:6px 8px;transition:color .15s;}
.fp-mob-item.active{color:#0077b5;}
.fp-mob-label{font-size:9px;}

/* ── PORTFOLIO INLINE (replaces Edit Profile button) ── */
.fp-portfolio-inline{display:flex;flex-direction:column;gap:7px;margin-top:2px;}
.fp-portfolio-inline-lbl{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;font-family:'Inter',sans-serif;}
.fp-portfolio-inline-links{display:flex;flex-wrap:wrap;gap:6px;align-items:center;}
.fp-portfolio-inline-link{display:flex;align-items:center;gap:5px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:999px;padding:5px 11px;font-size:12px;font-weight:500;color:#0077b5;text-decoration:none;font-family:'Inter',sans-serif;transition:background .15s;max-width:160px;}
.fp-portfolio-inline-link:hover{background:#e0f2fe;}
.fp-portfolio-inline-link span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;}
.fp-portfolio-inline-edit{display:flex;align-items:center;gap:4px;background:none;border:1px dashed #bae6fd;border-radius:999px;padding:5px 10px;font-size:11px;font-weight:600;color:#0077b5;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;}
.fp-portfolio-inline-edit:hover{background:#f0f9ff;border-style:solid;}
.fp-btn-add-portfolio{display:flex;align-items:center;gap:6px;background:none;border:1.5px dashed #e2e8f0;border-radius:10px;padding:11px 14px;font-size:13px;font-weight:500;color:#64748b;cursor:pointer;width:100%;font-family:'Inter',sans-serif;transition:border-color .15s,color .15s;}
.fp-btn-add-portfolio:hover{border-color:#0077b5;color:#0077b5;}

/* ── AI PORTFOLIO CARD ── */
.fp-ai-card{background:#fff;border-radius:16px;overflow:visible;border:0.5px solid #e8edf2;box-shadow:0 1px 4px rgba(0,0,0,0.05);display:flex;flex-direction:column;}
.fp-ai-card-hdr{display:flex;align-items:center;gap:10px;padding:14px 14px 12px;background:linear-gradient(135deg,#0077b5,#005d8f);border-radius:16px 16px 0 0;flex-shrink:0;}
.fp-ai-card-icon{width:36px;height:36px;border-radius:10px;background:rgba(255,255,255,0.18);display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.fp-ai-card-title{font-size:13px;font-weight:700;color:#fff;font-family:'Inter',sans-serif;}
.fp-ai-card-sub{font-size:10px;color:rgba(255,255,255,0.75);margin-top:1px;font-family:'Inter',sans-serif;}
.fp-ai-card-body{padding:12px 14px 14px;display:flex;flex-direction:column;gap:10px;background:#fff;border-radius:0 0 16px 16px;flex:1;}
.fp-ai-card-desc{font-size:12px;color:#64748b;line-height:1.6;font-family:'Inter',sans-serif;}
.fp-ai-card-loading{display:flex;align-items:center;gap:8px;font-size:12px;color:#64748b;font-family:'Inter',sans-serif;}
.fp-ai-spinner{width:14px;height:14px;border-radius:50%;border:2px solid #e2e8f0;border-top-color:#0077b5;animation:fp-spin .7s linear infinite;flex-shrink:0;}
.fp-ai-card-error{font-size:12px;color:#dc2626;font-family:'Inter',sans-serif;}
.fp-ai-result{display:flex;flex-direction:column;gap:6px;}
.fp-ai-result-text{max-height:120px;overflow:hidden;transition:max-height .3s ease;}
.fp-ai-result-text.expanded{max-height:1000px;}
.fp-ai-see-more{background:none;border:none;cursor:pointer;color:#0077b5;font-size:11px;font-weight:600;padding:0;font-family:'Inter',sans-serif;text-align:left;}
.fp-ai-generate-btn{width:100%;background:linear-gradient(135deg,#0077b5,#005d8f);color:#fff;border:none;border-radius:10px;padding:11px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;transition:opacity .15s;box-shadow:0 2px 8px rgba(0,119,181,0.28);}
.fp-ai-generate-btn:hover{opacity:.9;}
.fp-ai-generate-btn:disabled{opacity:.6;cursor:not-allowed;}

/* ── AI INLINE BUTTON (in section headers and portfolio label row) ── */
.fp-ai-inline-btn{
  display:inline-flex;align-items:center;gap:5px;
  background:linear-gradient(135deg,#0077b5,#005d8f);
  color:#fff;border:none;border-radius:999px;
  padding:5px 11px;font-size:11px;font-weight:600;
  cursor:pointer;font-family:'Inter',sans-serif;
  box-shadow:0 2px 6px rgba(0,119,181,0.28);
  transition:opacity .15s,transform .15s;
  white-space:nowrap;
}
.fp-ai-inline-btn:hover{opacity:.88;}
.fp-ai-inline-btn:active{transform:scale(.95);}

/* Portfolio inline header row */
.fp-portfolio-inline-hdr{
  display:flex;align-items:center;justify-content:space-between;
  gap:8px;
}

/* AI card highlight animation when scrolled to */
@keyframes fp-ai-highlight{
  0%{box-shadow:0 0 0 3px rgba(0,119,181,0.4);}
  100%{box-shadow:0 1px 4px rgba(0,0,0,0.05);}
}
.fp-ai-card-highlight{
  animation:fp-ai-highlight 1.5s ease-out forwards;
}
`
