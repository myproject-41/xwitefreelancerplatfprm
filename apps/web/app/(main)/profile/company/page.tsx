'use client'

/**
 * CompanyProfile — app/(main)/profile/company/page.tsx
 * Full company profile: cover + logo (with LinkedIn-style image editor),
 * all required fields, wallet, connections, switch account.
 */

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import apiClient        from '../../../../services/apiClient'
import { authService }  from '../../../../services/auth.service'
import { networkService } from '../../../../services/network.service'
import { escrowService } from '../../../../services/escrow.service'
import { postService }   from '../../../../services/post.service'
import { uploadService } from '../../../../services/upload.service'
import { walletService } from '../../../../services/wallet.service'
import { useAuthStore }  from '../../../../store/authStore'

/* ═══════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════ */
interface Wallet        { balance: number; heldBalance?: number }
interface ConnectedUser { id: string; fullName?: string; profileImage?: string; email?: string }
interface Follower      { id: string; fullName?: string; profileImage?: string; email?: string; isConnected?: boolean }
type ImageField  = 'coverImage' | 'profileImage'
type Panel       = 'none' | 'addFunds' | 'withdraw' | 'settings' | 'switch'
type EditSection = 'none' | 'basic'

/* ═══════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════ */
const NAV_ITEMS = [
  { label: 'Home',    icon: 'home',          href: '/'        },
  { label: 'Network', icon: 'group',          href: '/network' },
  { label: 'Post',    icon: 'add_box',        href: '/post'    },
  { label: 'Alerts',  icon: 'notifications',  href: '/alerts'  },
  { label: 'Profile', icon: 'person',         href: '/profile' },
]
const QUICK_AMOUNTS   = [100, 500, 1000, 2500]
const EMPLOYEE_COUNTS = ['1-10', '11-50', '51-200', '201-500', '501-1000', '1001-5000', '5000+']
const INDUSTRIES = [
  'Technology', 'Software & SaaS', 'E-Commerce', 'FinTech', 'HealthTech',
  'EdTech', 'Design & Creative', 'Marketing & Advertising', 'Media & Entertainment',
  'Manufacturing', 'Retail', 'Real Estate', 'Consulting', 'Legal', 'Finance',
  'Healthcare', 'Education', 'Non-Profit', 'Government', 'Other',
]
const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED', 'SGD', 'AUD']

function fmtBalance(n: number, cur: string) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: cur, minimumFractionDigits: 2,
  }).format(n)
}

/* ═══════════════════════════════════════════════
   COMPONENT
═══════════════════════════════════════════════ */
export default function CompanyProfile() {
  const router = useRouter()
  const { setUser, logout, user } = useAuthStore()

  /* ── Profile fields ── */
  const [companyName,   setCompanyName]   = useState('')
  const [industry,      setIndustry]      = useState('')
  const [employeeCount, setEmployeeCount] = useState('')
  const [website,       setWebsite]       = useState('')
  const [country,       setCountry]       = useState('')
  const [city,          setCity]          = useState('')
  const [description,   setDescription]   = useState('')
  const [currency,      setCurrency]      = useState('INR')
  const [coverSrc,      setCoverSrc]      = useState<string | null>(null)
  const [logoSrc,       setLogoSrc]       = useState<string | null>(null)
  const [connections,   setConnections]   = useState(0)

  /* ── Followers ── */
  const [followers,       setFollowers]       = useState<Follower[]>([])
  const [followerCount,   setFollowerCount]   = useState(0)
  const [showFollowers,   setShowFollowers]   = useState(false)
  const [connectingId,    setConnectingId]    = useState<string | null>(null)

  /* ── Posts & tasks ── */
  const [myPosts,           setMyPosts]           = useState<any[]>([])
  const [receivedProposals, setReceivedProposals] = useState<any[]>([])
  const [completedTasks,    setCompletedTasks]    = useState<any[]>([])
  const [inProgressTasks,   setInProgressTasks]   = useState<any[]>([])
  const [hiredFreelancers,  setHiredFreelancers]  = useState<any[]>([])
  const [showHiredModal,    setShowHiredModal]    = useState(false)
  const [tasksSection,      setTasksSection]      = useState<'none'|'apply'|'completed'|'inprogress'>('none')

  /* ── UI state ── */
  const [pageLoading,    setPageLoading]    = useState(true)
  const [coverUploading, setCoverUploading] = useState(false)
  const [logoUploading,  setLogoUploading]  = useState(false)
  const [saving,         setSaving]         = useState(false)
  const [editSection,    setEditSection]    = useState<EditSection>('none')

  /* ── Image editor ── */
  const [showEditor,  setShowEditor]  = useState(false)
  const [editorFile,  setEditorFile]  = useState<File | null>(null)
  const [editorField, setEditorField] = useState<ImageField>('profileImage')

  /* ── Wallet ── */
  const [wallet,       setWallet]       = useState<Wallet | null>(null)
  const [walletLoading,setWalletLoading]= useState(true)
  const [activePanel,  setActivePanel]  = useState<Panel>('none')
  const [addAmount,    setAddAmount]    = useState('')
  const [addingFunds,  setAddingFunds]  = useState(false)
  const [withdrawAmt,  setWithdrawAmt]  = useState('')
  const [withdrawing,  setWithdrawing]  = useState(false)

  /* ── Settings ── */
  const [oldPw,    setOldPw]    = useState('')
  const [newPw,    setNewPw]    = useState('')
  const [confirmPw,setConfirmPw]= useState('')
  const [pwLoading,setPwLoading]= useState(false)

  /* ── Refs ── */
  const coverRef           = useRef<HTMLInputElement>(null)
  const logoRef            = useRef<HTMLInputElement>(null)
  const postsScrollRef     = useRef<HTMLDivElement>(null)
  const postsScrollRefMain = useRef<HTMLDivElement>(null)
  const scrollPosts = (dir: 'left'|'right') =>
    postsScrollRef.current?.scrollBy({ left: dir === 'right' ? 220 : -220, behavior: 'smooth' })
  const scrollPostsMain = (dir: 'left'|'right') =>
    postsScrollRefMain.current?.scrollBy({ left: dir === 'right' ? 240 : -240, behavior: 'smooth' })

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
      const p   = d.companyProfile ?? {}
      setCompanyName(p.companyName   ?? '')
      setIndustry(p.industry         ?? '')
      setEmployeeCount(p.employeeCount ?? '')
      setWebsite(p.website           ?? '')
      setCountry(p.country           ?? '')
      setCity(p.city                 ?? '')
      setDescription(p.description   ?? '')
      setCurrency(p.currency         ?? 'INR')
      setCoverSrc(p.coverImage        ?? null)
      setLogoSrc(p.profileImage      ?? null)
      setConnections(d.connectionsCount ?? 0)
      try {
        const fRes = await apiClient.get(`/api/users/${d.id}/followers`)
        const fList = Array.isArray(fRes.data?.data) ? fRes.data.data : (Array.isArray(fRes.data) ? fRes.data : [])
        setFollowers(fList)
        setFollowerCount(fRes.data?.total ?? fList.length)
      } catch {}
      try {
        const [postsRes, proposalsRes, escrowsRes] = await Promise.allSettled([
          postService.getMyPosts(),
          postService.getReceivedProposals(),
          escrowService.getMyEscrows(),
        ])
        if (postsRes.status === 'fulfilled') {
          const d = postsRes.value
          const arr = Array.isArray(d) ? d : (Array.isArray(d?.data) ? d.data : [])
          setMyPosts(arr.filter((p: any) => p && typeof p === 'object'))
        }
        if (proposalsRes.status === 'fulfilled') {
          const d = proposalsRes.value
          setReceivedProposals(Array.isArray(d) ? d : (d?.data ?? []))
        }
        if (escrowsRes.status === 'fulfilled') {
          const all = escrowsRes.value
          const arr: any[] = Array.isArray(all) ? all : (all?.data ?? [])
          setCompletedTasks(arr.filter((e: any) => ['COMPLETED','RELEASED'].includes(e.status)))
          setInProgressTasks(arr.filter((e: any) => !['COMPLETED','RELEASED','CANCELLED'].includes(e.status)))
          const hired: any[] = []; const seen = new Set<string>()
          arr.forEach((e: any) => {
            const f = e.freelancer ?? e.worker
            if (f?.id && !seen.has(f.id)) {
              seen.add(f.id)
              hired.push({ id: f.id, fullName: f.freelancerProfile?.fullName ?? f.email ?? 'Freelancer', profileImage: f.freelancerProfile?.profileImage ?? null, email: f.email })
            }
          })
          setHiredFreelancers(hired)
        }
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

  /* ═══════════════════
     SAVE PROFILE
  ═══════════════════ */
  async function saveProfile(patch: Record<string, unknown>) {
    setSaving(true)
    try {
      await apiClient.put('/api/users/profile/company', patch)
      const res = await authService.getMe(); setUser(res.data)
      toast.success('Profile updated')
      setEditSection('none')
    } catch (e: any) { toast.error(e?.response?.data?.message ?? 'Save failed') }
    finally { setSaving(false) }
  }

  /* ═══════════════════
     IMAGE UPLOAD
  ═══════════════════ */
  async function uploadImage(
    file: File, field: ImageField,
    setBlob: (s: string | null) => void,
    setLoading: (b: boolean) => void,
  ) {
    const localUrl = URL.createObjectURL(file)
    setBlob(localUrl); setLoading(true)
    try {
      const cdnUrl = await uploadService.uploadImage(file)
      setBlob(cdnUrl)
      URL.revokeObjectURL(localUrl)
      await apiClient.put('/api/users/profile/company', { [field]: cdnUrl })
      const res = await authService.getMe(); setUser(res.data)
      toast.success(field === 'coverImage' ? 'Cover updated' : 'Logo updated')
    } catch {
      URL.revokeObjectURL(localUrl); setBlob(null)
      toast.error('Upload failed — please try again')
    } finally { setLoading(false) }
  }

  function onCoverChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return; e.target.value = ''
    setEditorFile(f); setEditorField('coverImage'); setShowEditor(true)
  }
  function onLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return; e.target.value = ''
    setEditorFile(f); setEditorField('profileImage'); setShowEditor(true)
  }
  async function onEditorDone(blob: Blob) {
    setShowEditor(false)
    const file    = new File([blob], editorFile?.name ?? 'image.webp', { type: blob.type })
    const setBlob = editorField === 'coverImage' ? setCoverSrc : setLogoSrc
    const setLoad = editorField === 'coverImage' ? setCoverUploading : setLogoUploading
    uploadImage(file, editorField, setBlob, setLoad)
  }

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
      if (!ready) { toast.error('Could not load Razorpay. Check your internet connection.'); setAddingFunds(false); return }

      const { data: order } = await walletService.createOrder(n)

      const options = {
        key:         order.keyId,
        amount:      order.amount,
        currency:    order.currency,
        name:        'Xwite',
        description: 'Add funds to wallet',
        order_id:    order.orderId,
        prefill:     { email: user?.email ?? '' },
        theme:       { color: '#0077b5' },
        handler: async (response: any) => {
          try {
            await walletService.verifyPayment({
              razorpayOrderId:   response.razorpay_order_id,
              razorpayPaymentId: response.razorpay_payment_id,
              razorpaySignature: response.razorpay_signature,
            })
            toast.success(`${fmtBalance(n, currency)} added to wallet!`)
            setAddAmount(''); setActivePanel('none'); loadWallet()
          } catch {
            toast.error('Payment verification failed. Contact support if money was deducted.')
          }
        },
        modal: { ondismiss: () => { setAddingFunds(false) } },
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
      await walletService.withdrawFunds({ amount: n })
      toast.success('Withdrawal requested!')
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

  async function handleConnect(userId: string) {
    setConnectingId(userId)
    try {
      await networkService.sendRequest(userId)
      setFollowers(prev => prev.map(f => f.id === userId ? { ...f, isConnected: true } : f))
      toast.success('Connection request sent!')
    } catch (e: any) {
      toast.error(e?.response?.data?.message ?? 'Could not connect')
    } finally {
      setConnectingId(null)
    }
  }

  function handleLogout() { logout(); authService.removeToken(); router.push('/login') }
  function togglePanel(p: Panel) { setActivePanel(prev => prev === p ? 'none' : p) }

  const balanceLabel = fmtBalance(wallet?.balance ?? 0, currency)

  /* ═══════════════════════════════════════════════
     RENDER
  ═══════════════════════════════════════════════ */
  return (
    <>
      <style>{STYLES}</style>

      <input ref={coverRef} type="file" accept="image/*" onChange={onCoverChange} style={{display:'none'}} />
      <input ref={logoRef}  type="file" accept="image/*" onChange={onLogoChange}  style={{display:'none'}} />

      {showEditor && editorFile && (
        <ImageEditorModal
          file={editorFile}
          isCover={editorField === 'coverImage'}
          onDone={onEditorDone}
          onCancel={() => setShowEditor(false)}
        />
      )}

      <div className="cp-root">

        {/* ══ LEFT SIDEBAR ══ */}
        <aside className="cp-sidebar-left">
          <div className="cp-sidebar-brand">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="#0077b5"><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>
            <span className="cp-brand">Xwite</span>
          </div>
          <nav className="cp-sidebar-nav">
            {NAV_ITEMS.map(item => (
              <button key={item.label}
                className={`cp-nav-item${item.href === '/profile' ? ' active' : ''}`}
                onClick={() => router.push(item.href)}>
                <NavIcon name={item.icon} active={item.href === '/profile'} />
                <span className="cp-nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="cp-sidebar-bottom">
            <button className="cp-nav-item" onClick={() => togglePanel('settings')}>
              <SettingsIcon /><span className="cp-nav-label">Settings</span>
            </button>
            <button className="cp-nav-item cp-nav-danger" onClick={handleLogout}>
              <LogoutIcon /><span className="cp-nav-label">Log out</span>
            </button>
          </div>
        </aside>

        {/* ══ MAIN ══ */}
        <main className="cp-main">

          {/* ── PROFILE CARD ── */}
          <section className="cp-card">

            {/* Cover */}
            <div className="cp-cover"
              onClick={() => !coverUploading && coverRef.current?.click()}
              role="button" aria-label="Change cover photo">
              {pageLoading
                ? <div className="skel cp-cover-inner" />
                : coverSrc
                  ? <img src={coverSrc} alt="Cover" className="cp-cover-img" />
                  : <div className="cp-cover-ph" />
              }
              {coverUploading && <div className="cp-cover-loader"><Spin /></div>}
              {!pageLoading && (
                <button className="cp-btn-cover" type="button"
                  onClick={e => { e.stopPropagation(); coverRef.current?.click() }}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="#0077b5"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                  Edit Cover
                </button>
              )}
            </div>

            {/* Logo row */}
            <div className="cp-logo-row">
              <button className="cp-logo"
                onClick={() => !logoUploading && logoRef.current?.click()}
                disabled={logoUploading}
                aria-label="Change company logo">
                {pageLoading
                  ? <div className="skel" style={{position:'absolute',inset:0,borderRadius:12}} />
                  : logoSrc
                    ? <img src={logoSrc} alt={companyName}
                        style={{position:'absolute',inset:0,width:'100%',height:'100%',objectFit:'cover',objectPosition:'center',display:'block'}} />
                    : (
                      <div className="cp-logo-ph">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="#94a3b8">
                          <path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/>
                        </svg>
                      </div>
                    )
                }
                <div className="cp-logo-hover">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M12 15.2A3.2 3.2 0 0 1 8.8 12 3.2 3.2 0 0 1 12 8.8 3.2 3.2 0 0 1 15.2 12 3.2 3.2 0 0 1 12 15.2M20 4h-3.17L15 2H9L7.17 4H4a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2z"/></svg>
                </div>
                {logoUploading && <div className="cp-logo-loader"><Spin light /></div>}
              </button>
            </div>

            {/* Company info */}
            <div className="cp-company-info">
              {pageLoading
                ? <CompanySkeleton />
                : (
                  <>
                    {/* Connections count */}
                    <p className="cp-conn-count">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="#0077b5"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                      connection. {connections.toLocaleString()}
                    </p>

                    {/* Name + edit button */}
                    <div className="cp-name-row">
                      <div>
                        <h1 className="cp-company-name">{companyName || 'Your Company'}</h1>
                        {industry && (
                          <p className="cp-industry">
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="#94a3b8"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>
                            {industry}
                          </p>
                        )}
                        {(city || country) && (
                          <p className="cp-location-line">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="#94a3b8"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>
                            {[city, country].filter(Boolean).join(', ')}
                          </p>
                        )}
                      </div>
                      <button className="cp-edit-icon-btn"
                        onClick={() => setEditSection('basic')} title="Edit company info">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="#0077b5"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                      </button>
                    </div>

                    {/* Badges row */}
                    <div className="cp-badges-row">
                      {employeeCount && (
                        <span className="cp-badge cp-badge-emp">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
                          {employeeCount} employees
                        </span>
                      )}
                      {website && (
                        <a href={website.startsWith('http') ? website : `https://${website}`}
                          target="_blank" rel="noopener noreferrer" className="cp-badge cp-badge-web">
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.65-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.35-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/></svg>
                          {website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
                        </a>
                      )}
                    </div>

                    {/* Description */}
                    {description && <p className="cp-description">{description}</p>}

                    {/* Followers button */}
                    <button
                      className="cp-btn-followers"
                      onClick={() => setShowFollowers(true)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                      </svg>
                      <span className="cp-btn-followers-count">{followerCount.toLocaleString()}</span>
                      Followers
                    </button>
                  </>
                )
              }
            </div>
          </section>

          {/* ── EDIT BASIC INFO ── */}
          {editSection === 'basic' && (
            <EditCard title="Company Information" onClose={() => setEditSection('none')}>
              <div className="cp-form">
                <FormRow label="Company Name *">
                  <input className="cp-input" value={companyName}
                    onChange={e => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Technologies" />
                </FormRow>
                <div className="cp-form-2col">
                  <FormRow label="Industry *">
                    <select className="cp-input" value={industry}
                      onChange={e => setIndustry(e.target.value)}>
                      <option value="">Select industry</option>
                      {INDUSTRIES.map(i => <option key={i} value={i}>{i}</option>)}
                    </select>
                  </FormRow>
                  <FormRow label="Company Size *">
                    <select className="cp-input" value={employeeCount}
                      onChange={e => setEmployeeCount(e.target.value)}>
                      <option value="">Select size</option>
                      {EMPLOYEE_COUNTS.map(e => <option key={e} value={e}>{e} employees</option>)}
                    </select>
                  </FormRow>
                </div>
                <div className="cp-form-2col">
                  <FormRow label="Country *">
                    <input className="cp-input" value={country}
                      onChange={e => setCountry(e.target.value)} placeholder="India" />
                  </FormRow>
                  <FormRow label="City *">
                    <input className="cp-input" value={city}
                      onChange={e => setCity(e.target.value)} placeholder="Mumbai" />
                  </FormRow>
                </div>
                <FormRow label="Website">
                  <input className="cp-input" value={website}
                    onChange={e => setWebsite(e.target.value)}
                    placeholder="https://yourcompany.com" type="url" />
                </FormRow>
                <FormRow label="Currency">
                  <select className="cp-input" value={currency}
                    onChange={e => setCurrency(e.target.value)}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </FormRow>
                <FormRow label="About / Bio">
                  <textarea className="cp-input cp-textarea"
                    value={description}
                    onChange={e => setDescription(e.target.value)}
                    placeholder="Tell people about your company…" rows={3} />
                </FormRow>
              </div>
              <SaveRow saving={saving}
                onSave={() => saveProfile({ companyName, industry, employeeCount, country, city, website, currency, description })}
                onCancel={() => setEditSection('none')} />
            </EditCard>
          )}

          {/* ── SETTINGS PANEL ── */}
          {activePanel === 'settings' && (
            <EditCard title="Account Settings" onClose={() => togglePanel('none')}>
              <div className="cp-form">
                <p className="cp-sec-lbl">Change Password</p>
                <form onSubmit={handleChangePassword} style={{display:'flex',flexDirection:'column',gap:10}}>
                  {[
                    {lbl:'Current password',val:oldPw,    set:setOldPw,    ph:'Current password'},
                    {lbl:'New password',     val:newPw,    set:setNewPw,    ph:'Min 8 characters'},
                    {lbl:'Confirm password', val:confirmPw,set:setConfirmPw,ph:'Repeat new password'},
                  ].map(f => (
                    <FormRow key={f.lbl} label={f.lbl}>
                      <input className="cp-input" type="password" value={f.val}
                        onChange={e => f.set(e.target.value)} placeholder={f.ph} />
                    </FormRow>
                  ))}
                  <button className="cp-btn-primary" type="submit" disabled={pwLoading}>
                    {pwLoading ? 'Changing…' : 'Change Password'}
                  </button>
                </form>
                <div className="cp-divider" />
                <button className="cp-btn-danger" onClick={handleLogout}>Log out</button>
              </div>
            </EditCard>
          )}

          {/* ── ADD FUNDS ── */}
          {activePanel === 'addFunds' && (
            <EditCard title="Add Funds" onClose={() => togglePanel('none')}>
              <div className="cp-form">
                <div className="cp-quick-wrap">
                  {QUICK_AMOUNTS.map(a => (
                    <button key={a} type="button"
                      className={`cp-quick${addAmount === String(a) ? ' active' : ''}`}
                      onClick={() => setAddAmount(String(a))}>
                      {fmtBalance(a, currency)}
                    </button>
                  ))}
                </div>
                <FormRow label="Amount">
                  <input className="cp-input" type="number" placeholder={`Amount (${currency})`}
                    value={addAmount} onChange={e => setAddAmount(e.target.value)} min={1} />
                </FormRow>
                <div className="cp-form-row">
                  <button className="cp-btn-primary" onClick={handleAddFunds} disabled={addingFunds}>
                    {addingFunds ? 'Adding…' : `Add ${addAmount ? fmtBalance(Number(addAmount), currency) : 'Funds'}`}
                  </button>
                  <button className="cp-btn-sec" onClick={() => togglePanel('none')}>Cancel</button>
                </div>
              </div>
            </EditCard>
          )}

          {/* ── WITHDRAW ── */}
          {activePanel === 'withdraw' && (
            <EditCard title="Withdraw Funds" onClose={() => togglePanel('none')}>
              <div className="cp-form">
                <div className="cp-bal-row">
                  <span>Available</span><strong>{balanceLabel}</strong>
                </div>
                <FormRow label="Amount">
                  <input className="cp-input" type="number" placeholder="Enter amount"
                    value={withdrawAmt} onChange={e => setWithdrawAmt(e.target.value)}
                    min={1} max={wallet?.balance} />
                </FormRow>
                <div className="cp-form-row">
                  <button className="cp-btn-primary" onClick={handleWithdraw} disabled={withdrawing}>
                    {withdrawing ? 'Processing…' : 'Confirm Withdrawal'}
                  </button>
                  <button className="cp-btn-sec" onClick={() => togglePanel('none')}>Cancel</button>
                </div>
              </div>
            </EditCard>
          )}

          {/* ── MY POSTS ── */}
          {!pageLoading && (
            <div className="cp-posts-card">
              <div className="cp-posts-card-hdr">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="#0077b5"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
                <h3 className="cp-posts-card-title">My Posts</h3>
                {myPosts.length > 0 && (
                  <div className="cp-posts-arrows" style={{marginLeft:'auto',marginRight:6}}>
                    <button className="cp-posts-arrow" onClick={() => scrollPostsMain('left')} aria-label="scroll left">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M15.41 7.41 14 6l-6 6 6 6 1.41-1.41L10.83 12z"/></svg>
                    </button>
                    <button className="cp-posts-arrow" onClick={() => scrollPostsMain('right')} aria-label="scroll right">
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z"/></svg>
                    </button>
                  </div>
                )}
                <button className="cp-btn-new-post" onClick={() => router.push('/post')}>
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="#0077b5"><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
                  New Post
                </button>
              </div>
              <div className="cp-posts-scroll" ref={postsScrollRefMain}>
                {myPosts.length === 0
                  ? <p className="cp-posts-empty">No posts yet · <button className="cp-link-btn" onClick={() => router.push('/post')}>Create one</button></p>
                  : myPosts.map((p: any) => {
                      const COLORS: Record<string,{bg:string;text:string}> = {
                        JOB:{bg:'#dbeafe',text:'#1e40af'},TASK:{bg:'#dcfce7',text:'#166534'},
                        COLLAB:{bg:'#fef9c3',text:'#854d0e'},SKILL_EXCHANGE:{bg:'#fae8ff',text:'#7e22ce'},
                      }
                      const col = COLORS[p.type] ?? {bg:'#f1f5f9',text:'#475569'}
                      const proposals = p._count?.proposals ?? p.proposalCount ?? 0
                      return (
                        <div key={p.id} className="cp-post-item" onClick={() => router.push(`/posts/${p.id}`)}>
                          <div className="cp-post-item-top">
                            <span className="cp-post-item-type" style={{background:col.bg,color:col.text}}>{(p.type??'POST').replace(/_/g,' ')}</span>
                            <span className="cp-post-item-status" style={{color:p.status==='OPEN'?'#16a34a':'#94a3b8'}}>{p.status}</span>
                          </div>
                          <p className="cp-post-item-title">{p.title || 'Untitled'}</p>
                          {proposals > 0 && <span className="cp-post-item-apply">{proposals} applied</span>}
                        </div>
                      )
                    })
                }
              </div>
            </div>
          )}

        </main>

        {/* ══ RIGHT SIDEBAR ══ */}
        <aside className="cp-sidebar-right">

          {/* Agent + Messaging */}
          <div className="cp-right-hdr">
            <button className="cp-agent-btn" onClick={() => router.push('/agent')}>
              <svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16"><path d="m12 2 1.8 5.2L19 9l-5.2 1.8L12 16l-1.8-5.2L5 9l5.2-1.8L12 2Z" /></svg>
              AI Agent
            </button>
            <button className="cp-msg-btn" onClick={() => router.push('/messages')}>
              <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="#0077b5" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
            </button>
          </div>

          {/* Wallet */}
          <div className="cp-wallet">
            <div className="cp-wallet-head">
              <p className="cp-wallet-lbl">Available Balance</p>
              <button className="cp-wallet-icon" onClick={() => togglePanel('addFunds')}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="#005d8f"><path d="M21 18v1c0 1.1-.9 2-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14c1.1 0 2 .9 2 2v1h-9a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h9zm-9-2h10V8H12v8zm4-2.5a1.5 1.5 0 1 1 0-3 1.5 1.5 0 0 1 0 3z"/></svg>
              </button>
            </div>
            {walletLoading
              ? <div className="skel" style={{height:34,width:130,marginTop:10,borderRadius:8}} />
              : <p className="cp-wallet-amt">{balanceLabel}</p>
            }
            <button className="cp-btn-withdraw" onClick={() => togglePanel('withdraw')}>
              Withdraw Funds
            </button>
            <button className="cp-btn-add" onClick={() => togglePanel('addFunds')}>
              + Add Funds
            </button>
          </div>

          {/* Followers card */}
          <div className="cp-conn-card">
            <p className="cp-conn-title">Followers</p>
            {followers.length === 0
              ? <p className="cp-conn-empty">{followerCount > 0 ? `${followerCount} followers` : 'No followers yet'}</p>
              : (
                <button type="button" className="cp-ov-btn" onClick={() => setShowFollowers(true)}>
                  <div className="cp-ov-row">
                    {followers.slice(0, 5).map((f, i) => (
                      <div key={f.id} className="cp-ov-av" style={{ marginLeft: i === 0 ? 0 : -10, zIndex: i }}>
                        {f.profileImage
                          ? <img src={f.profileImage} alt={f.fullName ?? ''} />
                          : <span>{(f.fullName ?? f.email ?? 'U').charAt(0).toUpperCase()}</span>
                        }
                      </div>
                    ))}
                    {followerCount > 5 && (
                      <div className="cp-ov-more" style={{ marginLeft: -10, zIndex: 5 }}>+{followerCount - 5}</div>
                    )}
                  </div>
                  <div className="cp-ov-info">
                    <p className="cp-ov-count">{followerCount} follower{followerCount !== 1 ? 's' : ''}</p>
                    <p className="cp-ov-sub">Tap to see all</p>
                  </div>
                </button>
              )
            }
          </div>

          {/* Hired Freelancers */}
          <div className="cp-sb-card">
            <div className="cp-sb-card-hdr">
              <p className="cp-conn-title" style={{margin:0}}>Hired</p>
              {hiredFreelancers.length > 3 && (
                <button className="cp-sb-viewall" onClick={() => setShowHiredModal(true)}>View all</button>
              )}
            </div>
            {hiredFreelancers.length === 0
              ? <p className="cp-conn-empty" style={{marginTop:8}}>No hires yet</p>
              : hiredFreelancers.slice(0, 3).map(f => (
                  <button key={f.id} type="button" className="cp-hired-item" onClick={() => router.push(`/profile/${f.id}`)}>
                    <div className="cp-hired-av">
                      {f.profileImage ? <img src={f.profileImage} alt={f.fullName} /> : <span>{(f.fullName ?? 'F').charAt(0).toUpperCase()}</span>}
                    </div>
                    <p className="cp-hired-name">{f.fullName}</p>
                  </button>
                ))
            }
          </div>

          {/* Tasks accordion */}
          <div className="cp-sb-card">
            <p className="cp-conn-title" style={{marginBottom:10}}>Tasks</p>
            {([
              { key:'apply'      as const, label:'Apply',       count:receivedProposals.length },
              { key:'inprogress' as const, label:'In Progress', count:inProgressTasks.length  },
              { key:'completed'  as const, label:'Completed',   count:completedTasks.length   },
            ]).map(({ key, label, count }) => {
              const isOpen = tasksSection === key
              return (
                <div key={key} className="cp-task-acc">
                  <button className={`cp-task-hdr${isOpen?' open':''}`}
                    onClick={() => setTasksSection(isOpen ? 'none' : key)}>
                    <span className="cp-task-hdr-label">{label}</span>
                    {count > 0 && <span className="cp-task-badge">{count}</span>}
                    <svg className={`cp-task-chevron${isOpen?' open':''}`} width="13" height="13" viewBox="0 0 24 24" fill="#94a3b8"><path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>
                  </button>
                  {isOpen && (
                    <div className="cp-task-body">
                      {key === 'apply' && (receivedProposals.length === 0
                        ? <p className="cp-task-empty">No applications yet</p>
                        : receivedProposals.slice(0,6).map((pr: any) => (
                            <div key={pr.id} className="cp-task-item" onClick={() => router.push(`/posts/${pr.postId ?? pr.post?.id}`)}>
                              <p className="cp-task-name">{pr.freelancer?.freelancerProfile?.fullName ?? pr.freelancer?.email ?? 'Freelancer'}</p>
                              <span className="cp-task-sub">{pr.post?.title ?? 'Post'}</span>
                            </div>
                          ))
                      )}
                      {key === 'inprogress' && (inProgressTasks.length === 0
                        ? <p className="cp-task-empty">No tasks in progress</p>
                        : inProgressTasks.slice(0,6).map((e: any) => (
                            <div key={e.id} className="cp-task-item">
                              <p className="cp-task-name">{e.task?.title ?? 'Task'}</p>
                              <span className="cp-task-sub">{e.freelancer?.freelancerProfile?.fullName ?? 'Freelancer'}</span>
                            </div>
                          ))
                      )}
                      {key === 'completed' && (completedTasks.length === 0
                        ? <p className="cp-task-empty">No completed tasks</p>
                        : completedTasks.slice(0,6).map((e: any) => (
                            <div key={e.id} className="cp-task-item">
                              <p className="cp-task-name">{e.task?.title ?? 'Task'}</p>
                              <span className="cp-task-sub" style={{color:'#16a34a'}}>✓ {e.freelancer?.freelancerProfile?.fullName ?? 'Freelancer'}</span>
                            </div>
                          ))
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>

          {/* Switch Account */}
          <button className="cp-switch" onClick={() => router.push('/profile/client')}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#0077b5"><path d="M6.99 11 3 15l3.99 4v-3H14v-2H6.99v-3zM21 9l-3.99-4v3H10v2h7.01v3L21 9z"/></svg>
            <div style={{flex:1,minWidth:0}}>
              <p className="cp-switch-title">Switch Account</p>
              <p className="cp-switch-sub">Switch to Client</p>
            </div>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#94a3b8"><path d="M10 6 8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6-6-6z"/></svg>
          </button>
        </aside>

        {/* ══ HIRED MODAL ══ */}
        {showHiredModal && (
          <div className="cp-modal-overlay" onClick={() => setShowHiredModal(false)}>
            <div className="cp-modal-box" onClick={e => e.stopPropagation()}>
              <div className="cp-modal-hdr">
                <p className="cp-modal-title">Hired Freelancers ({hiredFreelancers.length})</p>
                <button className="cp-modal-close" onClick={() => setShowHiredModal(false)}>✕</button>
              </div>
              <div className="cp-modal-list">
                {hiredFreelancers.map(f => (
                  <button key={f.id} type="button" className="cp-modal-item"
                    onClick={() => { setShowHiredModal(false); router.push(`/profile/${f.id}`) }}>
                    <div className="cp-modal-av">
                      {f.profileImage ? <img src={f.profileImage} alt={f.fullName} /> : <span>{(f.fullName ?? 'F').charAt(0).toUpperCase()}</span>}
                    </div>
                    <p className="cp-modal-name">{f.fullName}</p>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ══ FOLLOWERS MODAL ══ */}
        {showFollowers && (
          <FollowersModal
            followers={followers}
            followerCount={followerCount}
            connectingId={connectingId}
            onConnect={handleConnect}
            onClose={() => setShowFollowers(false)}
          />
        )}

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
      animation:'cp-spin .7s linear infinite', flexShrink:0,
    }} aria-hidden />
  )
}

function CompanySkeleton() {
  return (
    <div style={{display:'flex',flexDirection:'column',gap:10}}>
      <div className="skel" style={{height:12,width:100,borderRadius:6}} />
      <div className="skel" style={{height:30,width:'60%',borderRadius:6}} />
      <div className="skel" style={{height:13,width:'40%',borderRadius:6}} />
      <div style={{display:'flex',gap:8}}>
        <div className="skel" style={{height:26,width:110,borderRadius:999}} />
        <div className="skel" style={{height:26,width:130,borderRadius:999}} />
      </div>
      <div className="skel" style={{height:13,width:'90%',borderRadius:6}} />
      <div className="skel" style={{height:13,width:'75%',borderRadius:6}} />
      <div className="skel" style={{height:46,borderRadius:12,marginTop:4}} />
    </div>
  )
}

function EditCard({ title, onClose, children }: {
  title:string; onClose:()=>void; children:React.ReactNode
}) {
  return (
    <div className="cp-edit-card">
      <div className="cp-edit-card-hdr">
        <h3 className="cp-edit-card-title">{title}</h3>
        <button className="cp-edit-close" onClick={onClose}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="#94a3b8">
            <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
          </svg>
        </button>
      </div>
      <div className="cp-edit-card-body">{children}</div>
    </div>
  )
}

function FormRow({ label, children }: { label:string; children:React.ReactNode }) {
  return (
    <div className="cp-field">
      <label className="cp-field-lbl">{label}</label>
      {children}
    </div>
  )
}

function SaveRow({ onSave, onCancel, saving, disabled = false }: {
  onSave:()=>void; onCancel:()=>void; saving:boolean; disabled?:boolean
}) {
  return (
    <div className="cp-save-row">
      <button className="cp-btn-primary" onClick={onSave} disabled={saving || disabled}>
        {saving ? <><Spin light /> Saving…</> : 'Save Changes'}
      </button>
      <button className="cp-btn-sec" onClick={onCancel}>Cancel</button>
    </div>
  )
}

/* ── SVG Nav Icons ── */
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
function SettingsIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58a.49.49 0 0 0 .12-.61l-1.92-3.32a.49.49 0 0 0-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 0 0-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87a.47.47 0 0 0 .12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58a.49.49 0 0 0-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32a.47.47 0 0 0-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>
}
function LogoutIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor" style={{flexShrink:0}}><path d="M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5-5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z"/></svg>
}


/* ═══════════════════════════════════════════════
   FOLLOWERS MODAL
═══════════════════════════════════════════════ */
function FollowersModal({ followers, followerCount, connectingId, onConnect, onClose }: {
  followers:    Follower[]
  followerCount:number
  connectingId: string | null
  onConnect:    (id: string) => void
  onClose:      () => void
}) {
  const [search, setSearch] = useState('')

  const filtered = followers.filter(f => {
    const q = search.toLowerCase()
    return !q ||
      (f.fullName?.toLowerCase().includes(q)) ||
      (f.email?.toLowerCase().includes(q))
  })

  return (
    <div
      className="fl-overlay"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
      role="dialog"
      aria-modal="true"
      aria-label="Followers"
    >
      <div className="fl-modal">

        {/* Header */}
        <div className="fl-modal-hdr">
          <div>
            <h2 className="fl-modal-title">Followers</h2>
            <p className="fl-modal-sub">{followerCount.toLocaleString()} {followerCount === 1 ? 'person follows' : 'people follow'} your company</p>
          </div>
          <button className="fl-close" onClick={onClose} aria-label="Close">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="#64748b">
              <path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
            </svg>
          </button>
        </div>

        {/* Search */}
        <div className="fl-search-wrap">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="#94a3b8" className="fl-search-icon">
            <path d="M15.5 14h-.79l-.28-.27A6.471 6.471 0 0 0 16 9.5 6.5 6.5 0 1 0 9.5 16c1.61 0 3.09-.59 4.23-1.57l.27.28v.79l5 4.99L20.49 19l-4.99-5zm-6 0C7.01 14 5 11.99 5 9.5S7.01 5 9.5 5 14 7.01 14 9.5 11.99 14 9.5 14z"/>
          </svg>
          <input
            className="fl-search"
            type="text"
            placeholder="Search followers…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            autoFocus
          />
          {search && (
            <button className="fl-search-clear" onClick={() => setSearch('')}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="#94a3b8"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
            </button>
          )}
        </div>

        {/* List */}
        <div className="fl-list">
          {filtered.length === 0 && (
            <div className="fl-empty">
              {followers.length === 0
                ? <>
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="#e2e8f0">
                      <path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/>
                    </svg>
                    <p>No followers yet</p>
                    <p className="fl-empty-sub">Share your company profile to attract followers</p>
                  </>
                : <p>No results for "{search}"</p>
              }
            </div>
          )}

          {filtered.map(follower => (
            <div key={follower.id} className="fl-item">
              {/* Avatar */}
              <div className="fl-avatar">
                {follower.profileImage
                  ? <img src={follower.profileImage} alt={follower.fullName ?? ''} />
                  : (
                    <div className="fl-avatar-ph">
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="#94a3b8">
                        <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                      </svg>
                    </div>
                  )
                }
              </div>

              {/* Info */}
              <div className="fl-info">
                <p className="fl-name">{follower.fullName ?? 'Unknown User'}</p>
                {follower.email && <p className="fl-email">{follower.email}</p>}
              </div>

              {/* Connect button */}
              <button
                className={`fl-connect-btn${follower.isConnected ? ' connected' : ''}`}
                onClick={() => !follower.isConnected && onConnect(follower.id)}
                disabled={connectingId === follower.id || follower.isConnected}
              >
                {connectingId === follower.id
                  ? <span className="fl-btn-spinner" />
                  : follower.isConnected
                    ? <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>
                        Connected
                      </>
                    : <>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                        Connect
                      </>
                }
              </button>
            </div>
          ))}
        </div>

        {/* Footer count */}
        {filtered.length > 0 && (
          <div className="fl-footer">
            Showing {filtered.length} of {followerCount.toLocaleString()} followers
          </div>
        )}
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   IMAGE EDITOR MODAL — LinkedIn-style
   Crop / Filter / Adjust tabs
   Drag image to reposition within fixed frame
   4K export quality
═══════════════════════════════════════════════ */
function ImageEditorModal({ file, isCover, onDone, onCancel }: {
  file:File; isCover:boolean; onDone:(blob:Blob)=>void; onCancel:()=>void
}) {
  const OUT_W  = isCover ? 3840 : 1200
  const OUT_H  = isCover ? 960  : 1200
  const PREV_W = isCover ? 520  : 360
  const PREV_H = isCover ? 195  : 360

  const sand2='#e8ddd0'; const amber='#c9873a'; const amberD='#a86e2a'; const ink='#2d1f0e'

  const exportCanvasRef = useRef<HTMLCanvasElement>(null)
  const imgRef          = useRef<HTMLImageElement | null>(null)
  const dragging        = useRef(false)
  const lastMouse       = useRef({x:0,y:0})

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

  const offsetXRef=useRef(0); const offsetYRef=useRef(0); const zoomRef=useRef(1)

  const FILTERS=[
    {name:'Normal',css:''},{name:'Vivid',css:'saturate(1.6) contrast(1.1)'},
    {name:'Warm',css:'sepia(0.3) saturate(1.4) brightness(1.05)'},{name:'Cool',css:'hue-rotate(20deg) saturate(0.9) brightness(1.05)'},
    {name:'Fade',css:'brightness(1.1) contrast(0.85) saturate(0.75)'},{name:'Mono',css:'grayscale(1)'},
    {name:'Drama',css:'contrast(1.3) brightness(0.9) saturate(1.2)'},{name:'Matte',css:'contrast(0.9) brightness(1.05) saturate(0.8)'},
  ]

  useEffect(()=>{
    const url=URL.createObjectURL(file); setImgUrl(url)
    const img=new Image()
    img.onload=()=>{
      imgRef.current=img; setImgNW(img.naturalWidth); setImgNH(img.naturalHeight)
      const z=Math.max(PREV_W/img.naturalWidth,PREV_H/img.naturalHeight)
      setZoom(z); zoomRef.current=z
      const ox=(PREV_W-img.naturalWidth*z)/2; const oy=(PREV_H-img.naturalHeight*z)/2
      setOffsetX(ox); offsetXRef.current=ox; setOffsetY(oy); offsetYRef.current=oy
    }; img.src=url
    return ()=>URL.revokeObjectURL(url)
  },[])

  useEffect(()=>{offsetXRef.current=offsetX},[offsetX])
  useEffect(()=>{offsetYRef.current=offsetY},[offsetY])
  useEffect(()=>{zoomRef.current=zoom},[zoom])

  function minZ(){return imgNW&&imgNH?Math.max(PREV_W/imgNW,PREV_H/imgNH):1}
  function clamp(ox:number,oy:number,z:number){
    const sw=imgNW*z; const sh=imgNH*z
    return{ox:Math.min(0,Math.max(ox,PREV_W-sw)),oy:Math.min(0,Math.max(oy,PREV_H-sh))}
  }
  function onPD(e:React.PointerEvent<HTMLDivElement>){
    dragging.current=true; lastMouse.current={x:e.clientX,y:e.clientY}
    ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); e.preventDefault()
  }
  function onPM(e:React.PointerEvent<HTMLDivElement>){
    if(!dragging.current)return
    const dx=e.clientX-lastMouse.current.x; const dy=e.clientY-lastMouse.current.y
    lastMouse.current={x:e.clientX,y:e.clientY}
    const {ox,oy}=clamp(offsetXRef.current+dx,offsetYRef.current+dy,zoomRef.current)
    setOffsetX(ox); offsetXRef.current=ox; setOffsetY(oy); offsetYRef.current=oy
  }
  function onPU(){dragging.current=false}
  function handleZoom(nz:number){
    const z=Math.max(minZ(),nz); zoomRef.current=z
    const{ox,oy}=clamp(offsetXRef.current,offsetYRef.current,z)
    setZoom(z); setOffsetX(ox); offsetXRef.current=ox; setOffsetY(oy); offsetYRef.current=oy
  }
  function cssF(){
    let f=`brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`
    if(straighten!==0)f+=` rotate(${straighten}deg)`
    const p=FILTERS.find(p=>p.name===filter); if(p?.css)f+=' '+p.css; return f
  }
  async function handleSave(){
    if(!imgRef.current)return; setSaving(true)
    const canvas=exportCanvasRef.current!; canvas.width=OUT_W; canvas.height=OUT_H
    const ctx=canvas.getContext('2d')!; ctx.filter=cssF()
    const z=zoomRef.current; const srcX=-offsetXRef.current/z; const srcY=-offsetYRef.current/z
    ctx.drawImage(imgRef.current,srcX,srcY,PREV_W/z,PREV_H/z,0,0,OUT_W,OUT_H); ctx.filter='none'
    await new Promise(r=>setTimeout(r,40))
    canvas.toBlob(b=>{if(b)onDone(b);else{toast.error('Export failed');setSaving(false)}},'image/webp',0.98)
  }
  function handleReset(){
    if(!imgRef.current||!imgNW)return
    const z=Math.max(PREV_W/imgNW,PREV_H/imgNH); const ox=(PREV_W-imgNW*z)/2; const oy=(PREV_H-imgNH*z)/2
    setZoom(z);zoomRef.current=z;setOffsetX(ox);offsetXRef.current=ox;setOffsetY(oy);offsetYRef.current=oy
    setStraighten(0);setBrightness(100);setContrast(100);setSaturation(100);setFilter('Normal')
  }

  return(
    <div style={{position:'fixed',inset:0,zIndex:10000,background:'rgba(0,0,0,0.5)',display:'flex',alignItems:'center',justifyContent:'center',padding:'16px'}}>
      <canvas ref={exportCanvasRef} style={{display:'none'}}/>
      <div style={{background:'#fff',borderRadius:16,width:'100%',maxWidth:isCover?760:580,maxHeight:'95dvh',display:'flex',flexDirection:'column',boxShadow:'0 24px 80px rgba(0,0,0,0.28)',overflow:'hidden',fontFamily:'Inter,sans-serif'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'15px 20px',borderBottom:'1px solid #f1f5f9',flexShrink:0}}>
          <h3 style={{fontSize:15,fontWeight:700,color:ink,margin:0}}>Edit image</h3>
          <button onClick={onCancel} style={{background:'none',border:'none',cursor:'pointer',display:'flex'}}><svg width="20" height="20" viewBox="0 0 24 24" fill={ink}><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg></button>
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
                <button key={t} onClick={()=>setTab(t)} style={{flex:1,padding:'13px 2px',border:'none',background:'none',fontSize:12,fontWeight:600,color:tab===t?ink:'#94a3b8',cursor:'pointer',borderBottom:tab===t?`2.5px solid ${ink}`:'2.5px solid transparent',fontFamily:'Inter,sans-serif'}}>
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
                        <span style={{fontSize:11,fontWeight:600,color:'#64748b'}}>{sl.label==='Straighten'&&sl.val>0?'+':''}{sl.val}{sl.label==='Straighten'?'°':'%'}</span>
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
                      <span style={{fontSize:9,fontWeight:600,textTransform:'uppercase',letterSpacing:'.04em',color:filter===p.name?amber:'#64748b'}}>{p.name}</span>
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
                        <span style={{fontSize:11,fontWeight:600,color:amber}}>{sl.v}%</span>
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
            {saving?<><div style={{width:14,height:14,borderRadius:'50%',border:'2px solid rgba(255,255,255,0.3)',borderTopColor:'#fff',animation:'cp-spin .7s linear infinite'}}/> Saving…</>:'Save'}
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
@keyframes cp-spin{to{transform:rotate(360deg);}}
@keyframes cp-shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
.skel{background:linear-gradient(90deg,#e8eaed 25%,#f5f5f5 50%,#e8eaed 75%);background-size:1200px 100%;animation:cp-shimmer 1.4s ease infinite;}

/* ── ROOT ── */
.cp-root{display:grid;grid-template-areas:"main";grid-template-rows:1fr;grid-template-columns:1fr;background:#f1f5f9;min-height:100dvh;font-family:'Inter',sans-serif;color:#0f172a;}
@media(min-width:900px){.cp-root{grid-template-areas:"left-sidebar main right-sidebar";grid-template-columns:230px 1fr 260px;grid-template-rows:1fr;}}

.cp-brand{font-size:19px;font-weight:800;color:#0077b5;letter-spacing:-0.03em;font-family:'Inter',sans-serif;}
.cp-agent-btn{display:flex;align-items:center;gap:6px;background:linear-gradient(135deg,#0077b5,#005d8f);color:#fff;border:none;border-radius:999px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 2px 8px rgba(0,119,181,0.3);transition:transform .15s;}
.cp-agent-btn:active{transform:scale(.95);}
.cp-agent-text{display:none;}
@media(min-width:380px){.cp-agent-text{display:inline;}}
.cp-msg-btn{position:relative;width:40px;height:40px;border-radius:50%;border:1.5px solid #e2e8f0;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .15s;}
.cp-msg-btn:active{transform:scale(.93);}

/* ── LEFT SIDEBAR ── */
.cp-sidebar-left{display:none;grid-area:left-sidebar;}
@media(min-width:900px){.cp-sidebar-left{display:flex;flex-direction:column;background:#fff;border-right:1px solid #e2e8f0;padding:24px 14px;position:sticky;top:0;height:100dvh;overflow-y:auto;}}
.cp-sidebar-brand{display:flex;align-items:center;gap:8px;padding:0 8px;margin-bottom:24px;}
.cp-sidebar-nav{display:flex;flex-direction:column;gap:3px;flex:1;}
.cp-nav-item{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:12px;border:none;background:transparent;color:#475569;font-size:14px;font-weight:500;cursor:pointer;font-family:'Inter',sans-serif;text-align:left;width:100%;transition:background .15s,color .15s;}
.cp-nav-item:hover{background:#f0f9ff;color:#0077b5;}
.cp-nav-item.active{background:#e8f4fd;color:#0077b5;font-weight:600;}
.cp-nav-label{flex:1;}
.cp-sidebar-bottom{display:flex;flex-direction:column;gap:3px;border-top:1px solid #f1f5f9;padding-top:10px;}
.cp-nav-danger{color:#dc2626!important;}
.cp-nav-danger:hover{background:#fef2f2!important;color:#dc2626!important;}

/* ── MAIN ── */
.cp-main{grid-area:main;min-width:0;padding-bottom:70px;display:flex;flex-direction:column;gap:0;}
@media(min-width:900px){.cp-main{padding:24px 22px 40px;gap:14px;}}

/* ── PROFILE CARD ── */
.cp-card{background:#fff;border-radius:0 0 24px 24px;overflow:visible;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 6px 20px rgba(0,0,0,0.08);}
@media(min-width:900px){.cp-card{border-radius:20px;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 8px 32px rgba(0,0,0,0.1);border:1px solid rgba(0,0,0,0.04);}}

/* ── COVER ── */
.cp-cover{position:relative;margin:0;border-radius:20px 20px 0 0;overflow:hidden;height:120px;cursor:pointer;}
.cp-cover-inner{width:100%;height:100%;}
.cp-cover-img{width:100%;height:100%;object-fit:cover;object-position:center;display:block;transition:transform .35s ease;}
.cp-cover:hover .cp-cover-img{transform:scale(1.03);}
.cp-cover-ph{width:100%;height:100%;background:linear-gradient(135deg,#0f4c75 0%,#1b6ca8 30%,#0077b5 55%,#2196c4 80%,#4db8d9 100%);}
.cp-cover-ph::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 20% 50%,rgba(255,255,255,0.15) 0%,transparent 55%),radial-gradient(ellipse at 80% 30%,rgba(255,255,255,0.08) 0%,transparent 45%);pointer-events:none;}
.cp-cover::after{content:'';position:absolute;inset:0;background:linear-gradient(to bottom,transparent 35%,rgba(0,0,0,0.22) 100%);pointer-events:none;}
.cp-cover-loader{position:absolute;inset:0;z-index:6;background:rgba(255,255,255,0.72);display:flex;align-items:center;justify-content:center;}
@media(min-width:900px){.cp-cover{height:155px;}}
.cp-btn-cover{position:absolute;bottom:10px;right:10px;z-index:10;background:rgba(255,255,255,0.95);color:#0077b5;border:none;padding:5px 11px;border-radius:999px;font-size:11px;font-weight:700;display:inline-flex;align-items:center;gap:5px;cursor:pointer;box-shadow:0 2px 8px rgba(0,0,0,0.18);font-family:'Inter',sans-serif;transition:all .15s;white-space:nowrap;line-height:1.4;max-height:28px;}
.cp-btn-cover:hover{background:#fff;box-shadow:0 3px 12px rgba(0,0,0,0.22);}
.cp-btn-cover:active{transform:scale(.95);}

/* ── LOGO ROW ── */
.cp-logo-row{display:flex;align-items:flex-end;justify-content:space-between;padding:0 18px;margin-top:-44px;margin-bottom:10px;position:relative;z-index:20;}
@media(min-width:900px){.cp-logo-row{padding:0 22px;margin-top:-48px;margin-bottom:16px;}}

/* ── COMPANY LOGO — square with rounded corners ── */
.cp-logo{position:relative;margin-left:2px;width:84px;height:84px;border-radius:14px;overflow:hidden;background:#fff;border:3px solid #fff;box-shadow:0 2px 14px rgba(0,0,0,0.16);cursor:pointer;padding:0;flex-shrink:0;display:block;transition:box-shadow .2s;}
.cp-logo:hover{box-shadow:0 4px 20px rgba(0,0,0,0.22);}
.cp-logo-ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#f0f4f8;}
.cp-logo-hover{position:absolute;inset:0;background:rgba(0,0,0,0.32);display:flex;align-items:center;justify-content:center;opacity:0;transition:opacity .2s;border-radius:11px;}
.cp-logo:hover .cp-logo-hover{opacity:1;}
.cp-logo-loader{position:absolute;inset:0;background:rgba(255,255,255,0.8);display:flex;align-items:center;justify-content:center;}
@media(min-width:900px){.cp-logo{width:96px;height:96px;border-radius:16px;}}

/* ── EDIT COMPANY BUTTON ── */
.cp-btn-edit-company{background:linear-gradient(135deg,#0284c7,#0077b5);color:#fff;border:none;padding:10px 18px;border-radius:999px;font-size:13px;font-weight:600;display:flex;align-items:center;gap:7px;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 3px 14px rgba(0,119,181,0.38);transition:transform .15s,box-shadow .15s;}
.cp-btn-edit-company:hover{box-shadow:0 5px 18px rgba(0,119,181,0.4);}
.cp-btn-edit-company:active{transform:scale(.96);}

/* ── COMPANY INFO ── */
.cp-company-info{padding:2px 18px 22px 20px;display:flex;flex-direction:column;gap:8px;}
@media(min-width:900px){.cp-company-info{padding:2px 24px 22px;}}
.cp-conn-count{font-size:12px;font-weight:600;color:#0077b5;display:flex;align-items:center;gap:4px;opacity:.85;}
.cp-name-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
.cp-company-name{font-size:24px;font-weight:800;line-height:1.15;color:#0f172a;letter-spacing:-0.03em;font-family:'Inter',sans-serif;}
@media(min-width:900px){.cp-company-name{font-size:28px;}}
.cp-industry{font-size:14px;font-weight:500;color:#0077b5;margin-top:3px;display:flex;align-items:center;gap:5px;font-family:'Inter',sans-serif;}
.cp-location-line{font-size:12px;color:#94a3b8;display:flex;align-items:center;gap:3px;margin-top:2px;font-family:'Inter',sans-serif;}
.cp-badges-row{display:flex;flex-wrap:wrap;gap:7px;align-items:center;}
.cp-badge{display:inline-flex;align-items:center;gap:4px;padding:5px 11px;border-radius:999px;font-size:11px;font-weight:600;font-family:'Inter',sans-serif;}
.cp-badge-emp{background:#f0f9ff;color:#0369a1;border:1px solid #bae6fd;}
.cp-badge-web{background:#f8fafc;color:#0077b5;border:1px solid #e2e8f0;text-decoration:none;}
.cp-badge-web:hover{background:#e8f4fd;}
.cp-description{font-size:14px;font-weight:400;color:#475569;line-height:1.7;font-family:'Inter',sans-serif;}
.cp-edit-icon-btn{background:none;border:none;cursor:pointer;padding:6px;border-radius:8px;display:flex;align-items:center;justify-content:center;transition:background .15s;flex-shrink:0;}
.cp-edit-icon-btn:hover{background:#f0f9ff;}
.cp-btn-edit-about{width:100%;background:linear-gradient(135deg,#0284c7,#0077b5);color:#fff;border:none;padding:13px;border-radius:14px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 4px 18px rgba(0,119,181,0.32);transition:transform .15s,box-shadow .15s;margin-top:2px;}
.cp-btn-edit-about:hover{box-shadow:0 6px 22px rgba(0,119,181,0.42);transform:translateY(-1px);}
.cp-btn-edit-about:active{transform:scale(.98);}

/* ── COMPANY DETAILS SECTION CARD ── */
.cp-section-card{background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 14px rgba(0,0,0,0.07);border:1px solid rgba(0,0,0,0.04);overflow:hidden;}
.cp-section-hdr{display:flex;align-items:center;justify-content:space-between;padding:16px 18px 12px;border-bottom:1px solid #f1f5f9;border-left:3px solid #0077b5;}
.cp-section-title{font-size:15px;font-weight:700;color:#0f172a;font-family:'Inter',sans-serif;}
.cp-section-body{padding:14px 18px 18px;}
.cp-details-grid{display:flex;flex-direction:column;gap:0;}
.cp-detail-row{display:flex;align-items:baseline;justify-content:space-between;padding:10px 0;border-bottom:1px solid #f8fafc;gap:12px;}
.cp-detail-row:last-child{border-bottom:none;}
.cp-detail-label{font-size:12px;font-weight:600;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em;font-family:'Inter',sans-serif;white-space:nowrap;flex-shrink:0;}
.cp-detail-value{font-size:14px;font-weight:500;color:#0f172a;text-align:right;font-family:'Inter',sans-serif;}
.cp-detail-link{font-size:14px;font-weight:500;color:#0077b5;text-align:right;text-decoration:none;font-family:'Inter',sans-serif;}
.cp-detail-link:hover{text-decoration:underline;}

/* ── EDIT CARDS ── */
.cp-edit-card{background:#fff;border-radius:16px;box-shadow:0 2px 8px rgba(0,0,0,0.06),0 8px 28px rgba(0,0,0,0.09);border:1px solid rgba(0,0,0,0.04);overflow:hidden;}
.cp-edit-card-hdr{display:flex;align-items:center;justify-content:space-between;padding:15px 18px 12px;border-bottom:1px solid #f1f5f9;}
.cp-edit-card-title{font-size:15px;font-weight:700;color:#0f172a;font-family:'Inter',sans-serif;}
.cp-edit-close{background:none;border:none;cursor:pointer;padding:3px;display:flex;transition:opacity .15s;}
.cp-edit-close:hover{opacity:.7;}
.cp-edit-card-body{padding:16px 18px 20px;}

/* ── FORMS ── */
.cp-form{display:flex;flex-direction:column;gap:12px;}
.cp-form-2col{display:grid;grid-template-columns:1fr 1fr;gap:12px;}
@media(max-width:500px){.cp-form-2col{grid-template-columns:1fr;}}
.cp-form-row{display:flex;gap:10px;}
.cp-form-row>*{flex:1;}
.cp-field{display:flex;flex-direction:column;gap:5px;}
.cp-field-lbl{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#64748b;font-family:'Inter',sans-serif;}
.cp-input{width:100%;border:1.5px solid #e2e8f0;border-radius:10px;padding:10px 13px;font-size:14px;font-family:'Inter',sans-serif;color:#0D1B2A;outline:none;background:#f8fafc;transition:border-color .15s;}
.cp-input:focus{border-color:#0077b5;background:#fff;box-shadow:0 0 0 3px rgba(0,119,181,0.1);}
.cp-textarea{resize:vertical;min-height:100px;}
.cp-char-count{font-size:11px;text-align:right;margin-top:3px;font-family:'Inter',sans-serif;}
.cp-sec-lbl{font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;font-family:'Inter',sans-serif;}
.cp-divider{height:1px;background:#f1f5f9;margin:4px 0;}
.cp-save-row{display:flex;gap:10px;margin-top:4px;}
.cp-save-row>*{flex:1;}
.cp-btn-primary{background:linear-gradient(135deg,#0284c7,#0077b5);color:#fff;border:none;border-radius:12px;padding:12px 16px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;width:100%;display:flex;align-items:center;justify-content:center;gap:7px;transition:filter .15s,box-shadow .15s;box-shadow:0 3px 12px rgba(0,119,181,0.28);}
.cp-btn-primary:not(:disabled):hover{box-shadow:0 5px 18px rgba(0,119,181,0.38);}
.cp-btn-primary:disabled{opacity:.6;cursor:not-allowed;}
.cp-btn-primary:not(:disabled):active{filter:brightness(.88);}
.cp-btn-sec{background:#f8fafc;color:#64748b;border:1.5px solid #e2e8f0;border-radius:12px;padding:12px 16px;font-size:14px;font-weight:500;cursor:pointer;font-family:'Inter',sans-serif;width:100%;transition:background .15s;}
.cp-btn-sec:active{background:#f1f5f9;}
.cp-btn-danger{background:transparent;color:#dc2626;border:1.5px solid #fca5a5;border-radius:12px;padding:12px 16px;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;width:100%;display:flex;align-items:center;justify-content:center;gap:7px;transition:background .15s;}
.cp-btn-danger:active{background:#fef2f2;}
.cp-quick-wrap{display:flex;flex-wrap:wrap;gap:8px;}
.cp-quick{background:#f0f9ff;border:1.5px solid #bae6fd;border-radius:999px;padding:7px 13px;font-size:13px;font-weight:600;color:#0369a1;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;}
.cp-quick.active,.cp-quick:hover{background:#0077b5;border-color:#0077b5;color:#fff;}
.cp-bal-row{display:flex;justify-content:space-between;align-items:center;background:#f0f9ff;border:1px solid #bae6fd;border-radius:10px;padding:11px 14px;font-size:14px;color:#0369a1;font-weight:600;}
.cp-bal-row strong{font-size:15px;font-weight:700;color:#0f172a;}

/* ── RIGHT SIDEBAR ── */
.cp-sidebar-right{display:none;grid-area:right-sidebar;}
@media(min-width:900px){.cp-sidebar-right{display:flex;flex-direction:column;gap:14px;padding:24px 14px 40px;background:#f1f5f9;position:sticky;top:0;height:100dvh;overflow-y:auto;overflow-x:hidden;min-width:0;width:100%;}}
.cp-right-hdr{flex-shrink:0;display:flex;align-items:center;justify-content:space-between;gap:8px;background:#fff;border-radius:14px;padding:10px 12px;border:0.5px solid #e8edf2;box-shadow:0 1px 4px rgba(0,0,0,0.05);min-width:0;}
.cp-wallet{flex-shrink:0;background:linear-gradient(145deg,#cce8ff 0%,#d4eeff 45%,#e4f3ff 100%);border:1px solid #93c5fd;border-radius:16px;padding:16px;min-width:0;}
.cp-wallet-head{display:flex;justify-content:space-between;align-items:flex-start;}
.cp-wallet-lbl{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#0369a1;font-family:'Inter',sans-serif;}
.cp-wallet-icon{background:rgba(0,93,143,0.1);border:none;border-radius:10px;width:38px;height:38px;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:background .15s;}
.cp-wallet-icon:hover{background:rgba(0,93,143,0.18);}
.cp-wallet-amt{font-size:24px;font-weight:700;letter-spacing:-.02em;line-height:1;color:#0f172a;margin-top:8px;font-family:'Inter',sans-serif;}
.cp-btn-withdraw{width:100%;background:linear-gradient(135deg,#22c55e,#16a34a);color:#fff;font-weight:700;font-size:14px;padding:11px;border-radius:12px;border:none;cursor:pointer;margin-top:12px;font-family:'Inter',sans-serif;box-shadow:0 3px 12px rgba(34,197,94,0.3);transition:transform .15s,box-shadow .15s;}
.cp-btn-withdraw:hover{box-shadow:0 5px 16px rgba(34,197,94,0.42);}
.cp-btn-withdraw:active{transform:scale(.97);}
.cp-btn-add{width:100%;background:linear-gradient(135deg,#0077b5,#005d8f);color:#fff;border:none;font-weight:700;font-size:13px;padding:8px;border-radius:12px;cursor:pointer;margin-top:8px;font-family:'Inter',sans-serif;box-shadow:0 2px 8px rgba(0,119,181,0.22);transition:box-shadow .15s;}
.cp-btn-add:hover{box-shadow:0 4px 14px rgba(0,119,181,0.34);}
.cp-conn-card{flex-shrink:0;background:#fff;border-radius:16px;padding:16px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.06);min-width:0;}
.cp-conn-title{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:12px;font-family:'Inter',sans-serif;}
.cp-conn-empty{font-size:13px;color:#94a3b8;font-family:'Inter',sans-serif;}
.cp-ov-btn{width:100%;background:none;border:none;cursor:pointer;display:flex;align-items:center;gap:12px;padding:4px 0;text-align:left;font-family:'Inter',sans-serif;border-radius:12px;transition:background .15s;}
.cp-ov-btn:hover{background:#f8fafc;}
.cp-ov-row{display:flex;align-items:center;flex-shrink:0;}
.cp-ov-av{position:relative;width:40px;height:40px;border-radius:50%;overflow:hidden;border:2.5px solid #fff;background:#c3e0fe;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cp-ov-av img{width:100%;height:100%;object-fit:cover;}
.cp-ov-av span{font-size:13px;font-weight:700;color:#005d8f;}
.cp-ov-more{position:relative;width:40px;height:40px;border-radius:50%;border:2.5px solid #fff;background:#e2e8f0;display:flex;align-items:center;justify-content:center;font-size:10px;font-weight:800;color:#64748b;flex-shrink:0;}
.cp-ov-info{flex:1;min-width:0;}
.cp-ov-count{font-size:13px;font-weight:700;color:#0f172a;}
.cp-ov-sub{font-size:10px;color:#94a3b8;margin-top:1px;}
.cp-modal-overlay{position:fixed;inset:0;z-index:300;background:rgba(0,0,0,0.45);display:flex;align-items:center;justify-content:center;padding:16px;}
.cp-modal-box{background:#fff;border-radius:20px;padding:20px;width:100%;max-width:360px;box-shadow:0 20px 60px rgba(0,0,0,0.2);}
.cp-modal-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:14px;}
.cp-modal-title{font-size:14px;font-weight:800;color:#0f172a;}
.cp-modal-close{background:none;border:none;cursor:pointer;font-size:16px;color:#94a3b8;line-height:1;padding:4px;font-family:'Inter',sans-serif;}
.cp-modal-close:hover{color:#0f172a;}
.cp-modal-list{display:flex;flex-direction:column;gap:8px;max-height:320px;overflow-y:auto;}
.cp-modal-item{display:flex;align-items:center;gap:12px;background:#f8fafc;border:none;border-radius:12px;padding:10px 12px;cursor:pointer;width:100%;text-align:left;font-family:'Inter',sans-serif;transition:background .15s;}
.cp-modal-item:hover{background:#f0f9ff;}
.cp-modal-av{width:40px;height:40px;border-radius:50%;overflow:hidden;background:#c3e0fe;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cp-modal-av img{width:100%;height:100%;object-fit:cover;}
.cp-modal-av span{font-size:13px;font-weight:700;color:#005d8f;}
.cp-modal-name{font-size:13px;font-weight:700;color:#0f172a;text-align:left;}
.cp-modal-viewall{width:100%;background:none;border:none;border-top:1px solid #f1f5f9;padding:12px 0 0;margin-top:10px;cursor:pointer;font-size:12px;font-weight:700;color:#0077b5;font-family:'Inter',sans-serif;text-align:center;display:block;}
.cp-modal-viewall:hover{opacity:.75;}
.cp-switch{flex-shrink:0;background:linear-gradient(135deg,#f8fafc,#f0f9ff);border-radius:16px;padding:12px 14px;border:1px solid #e2e8f0;cursor:pointer;display:flex;align-items:center;gap:10px;font-family:'Inter',sans-serif;text-align:left;width:100%;min-width:0;box-shadow:0 1px 4px rgba(0,0,0,0.05);transition:box-shadow .15s;}
.cp-switch:hover{box-shadow:0 3px 14px rgba(0,0,0,0.1);}
.cp-switch-title{font-size:13px;font-weight:700;color:#0f172a;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-family:'Inter',sans-serif;}
.cp-switch-sub{font-size:12px;color:#94a3b8;margin-top:2px;font-family:'Inter',sans-serif;}

/* ── FOLLOWERS BUTTON ── */
.cp-btn-followers{
  display:inline-flex;align-items:center;gap:8px;
  background:linear-gradient(135deg,#0284c7,#0077b5);color:#fff;
  border:none;border-radius:999px;
  padding:11px 20px;
  font-size:14px;font-weight:600;
  cursor:pointer;font-family:'Inter',sans-serif;
  box-shadow:0 4px 14px rgba(0,119,181,0.32);
  transition:transform .15s,box-shadow .15s;
  margin-top:2px;
}
.cp-btn-followers:hover{box-shadow:0 6px 22px rgba(0,119,181,0.42);transform:translateY(-1px);}
.cp-btn-followers:active{transform:scale(.97);}
.cp-btn-followers-count{
  background:rgba(255,255,255,0.22);
  border-radius:999px;
  padding:1px 7px;
  font-size:12px;font-weight:700;
}

/* ── FOLLOWERS MODAL ── */
.fl-overlay{
  position:fixed;inset:0;z-index:9999;
  background:rgba(0,0,0,0.46);
  backdrop-filter:blur(4px);
  display:flex;align-items:flex-end;justify-content:center;
}
@media(min-width:600px){.fl-overlay{align-items:center;padding:24px;}}

.fl-modal{
  background:#fff;
  border-radius:22px 22px 14px 14px;
  width:100%;max-width:480px;
  max-height:85dvh;
  display:flex;flex-direction:column;
  box-shadow:0 -6px 30px rgba(0,0,0,0.14);
  overflow:hidden;
  font-family:'Inter',sans-serif;
}
@media(min-width:600px){.fl-modal{border-radius:18px;box-shadow:0 12px 48px rgba(0,0,0,0.2);}}

.fl-modal-hdr{
  display:flex;align-items:flex-start;justify-content:space-between;
  padding:18px 20px 14px;
  border-bottom:1px solid #f1f5f9;
  flex-shrink:0;
}
.fl-modal-title{font-size:17px;font-weight:700;color:#0f172a;}
.fl-modal-sub{font-size:12px;color:#94a3b8;margin-top:3px;}
.fl-close{
  background:none;border:none;cursor:pointer;
  padding:4px;display:flex;border-radius:8px;
  transition:background .15s;flex-shrink:0;
}
.fl-close:hover{background:#f1f5f9;}

.fl-search-wrap{
  position:relative;
  padding:12px 16px;
  border-bottom:1px solid #f8fafc;
  flex-shrink:0;
}
.fl-search-icon{
  position:absolute;left:28px;top:50%;transform:translateY(-50%);
  pointer-events:none;
}
.fl-search{
  width:100%;border:1.5px solid #e2e8f0;border-radius:10px;
  padding:9px 34px 9px 36px;
  font-size:14px;font-family:'Inter',sans-serif;color:#0D1B2A;
  outline:none;background:#f8fafc;
  transition:border-color .15s;
}
.fl-search:focus{border-color:#0077b5;background:#fff;box-shadow:0 0 0 3px rgba(0,119,181,0.1);}
.fl-search-clear{
  position:absolute;right:28px;top:50%;transform:translateY(-50%);
  background:none;border:none;cursor:pointer;padding:2px;display:flex;
}

.fl-list{flex:1;overflow-y:auto;padding:8px 0;}

.fl-empty{
  display:flex;flex-direction:column;align-items:center;justify-content:center;
  padding:40px 20px;gap:10px;color:#94a3b8;text-align:center;
}
.fl-empty p{font-size:14px;font-weight:600;color:#64748b;}
.fl-empty-sub{font-size:12px;color:#94a3b8!important;font-weight:400!important;}

.fl-item{
  display:flex;align-items:center;gap:12px;
  padding:12px 20px;
  transition:background .15s;
}
.fl-item:hover{background:#f8fafc;}

.fl-avatar{
  width:46px;height:46px;border-radius:50%;
  overflow:hidden;flex-shrink:0;
  background:#e2e8f0;
}
.fl-avatar img{width:100%;height:100%;object-fit:cover;display:block;}
.fl-avatar-ph{
  width:100%;height:100%;
  display:flex;align-items:center;justify-content:center;
  background:#f0f4f8;
}

.fl-info{flex:1;min-width:0;}
.fl-name{font-size:14px;font-weight:600;color:#0D1B2A;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}
.fl-email{font-size:12px;color:#94a3b8;margin-top:1px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

.fl-connect-btn{
  display:flex;align-items:center;gap:5px;
  padding:8px 14px;border-radius:999px;
  font-size:12px;font-weight:600;
  cursor:pointer;font-family:'Inter',sans-serif;
  border:1.5px solid #0077b5;
  background:#fff;color:#0077b5;
  transition:all .15s;
  flex-shrink:0;white-space:nowrap;
}
.fl-connect-btn:hover:not(:disabled):not(.connected){background:#0077b5;color:#fff;}
.fl-connect-btn.connected{background:#dcfce7;border-color:#86efac;color:#15803d;cursor:default;}
.fl-connect-btn:disabled:not(.connected){opacity:.6;cursor:not-allowed;}

.fl-btn-spinner{
  width:12px;height:12px;border-radius:50%;
  border:2px solid rgba(0,119,181,0.25);
  border-top-color:#0077b5;
  animation:cp-spin .7s linear infinite;
  display:inline-block;
}

.fl-footer{
  padding:10px 20px;
  border-top:1px solid #f1f5f9;
  font-size:12px;color:#94a3b8;
  text-align:center;
  flex-shrink:0;
  font-family:'Inter',sans-serif;
}

/* ── MY POSTS CARD (main area) ── */
.cp-posts-card{background:#fff;border-radius:16px;border:1px solid #bae6fd;overflow:hidden;box-shadow:0 1px 4px rgba(0,119,181,0.07);}
.cp-posts-card-hdr{display:flex;align-items:center;gap:8px;padding:12px 14px;background:linear-gradient(135deg,#f0f9ff,#e8f4fd);border-bottom:1px solid #e0f2fe;}
.cp-posts-card-title{font-size:13px;font-weight:700;color:#0077b5;font-family:'Inter',sans-serif;}
.cp-posts-arrows{display:flex;align-items:center;gap:4px;flex-shrink:0;}
.cp-posts-arrow{width:26px;height:26px;border-radius:50%;border:1.5px solid #bae6fd;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;color:#0077b5;transition:all .15s;flex-shrink:0;}
.cp-posts-arrow:hover{background:#0077b5;color:#fff;border-color:#0077b5;}
.cp-btn-new-post{display:flex;align-items:center;gap:5px;background:#f0f9ff;border:1.5px solid #bae6fd;border-radius:999px;padding:5px 12px;font-size:11px;font-weight:700;color:#0077b5;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;flex-shrink:0;}
.cp-btn-new-post:hover{background:#0077b5;color:#fff;border-color:#0077b5;}
.cp-posts-scroll{display:flex;flex-direction:row;gap:10px;padding:12px 14px 16px;overflow-x:auto;scrollbar-width:none;}
.cp-posts-scroll::-webkit-scrollbar{display:none;}
.cp-posts-empty{font-size:13px;color:#94a3b8;font-family:'Inter',sans-serif;padding:4px 0;}
.cp-link-btn{background:none;border:none;color:#0077b5;font-size:13px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;}
.cp-post-item{flex-shrink:0;width:200px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:11px 13px;cursor:pointer;display:flex;flex-direction:column;gap:5px;transition:all .18s;}
.cp-post-item:hover{background:#f0f9ff;border-color:#bae6fd;box-shadow:0 3px 10px rgba(0,119,181,0.1);transform:translateY(-1px);}
.cp-post-item-top{display:flex;align-items:center;gap:6px;}
.cp-post-item-type{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;border-radius:6px;padding:2px 7px;flex-shrink:0;}
.cp-post-item-status{font-size:10px;font-weight:700;margin-left:auto;}
.cp-post-item-title{font-size:12px;font-weight:600;color:#0f172a;line-height:1.4;}
.cp-post-item-apply{font-size:10px;color:#0077b5;font-weight:700;}

/* ── SIDEBAR CARD (hired / tasks) ── */
.cp-sb-card{flex-shrink:0;background:#fff;border-radius:16px;padding:14px 14px 12px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 12px rgba(0,0,0,0.06);min-width:0;}
.cp-sb-card-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:10px;}
.cp-sb-viewall{background:none;border:none;font-size:11px;font-weight:700;color:#0077b5;cursor:pointer;font-family:'Inter',sans-serif;}
.cp-sb-viewall:hover{text-decoration:underline;}
.cp-hired-item{display:flex;align-items:center;gap:9px;width:100%;background:#f8fafc;border:none;border-radius:10px;padding:8px 10px;margin-bottom:6px;cursor:pointer;font-family:'Inter',sans-serif;transition:background .15s;}
.cp-hired-item:hover{background:#f0f9ff;}
.cp-hired-av{width:32px;height:32px;border-radius:50%;overflow:hidden;background:#c3e0fe;display:flex;align-items:center;justify-content:center;flex-shrink:0;}
.cp-hired-av img{width:100%;height:100%;object-fit:cover;}
.cp-hired-av span{font-size:11px;font-weight:700;color:#005d8f;}
.cp-hired-name{font-size:12px;font-weight:600;color:#0f172a;text-align:left;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}

/* ── TASKS ACCORDION ── */
.cp-task-acc{border-bottom:1px solid #f1f5f9;}
.cp-task-acc:last-child{border-bottom:none;}
.cp-task-hdr{display:flex;align-items:center;gap:7px;width:100%;background:none;border:none;padding:9px 2px;cursor:pointer;font-family:'Inter',sans-serif;font-size:12px;font-weight:700;color:#334155;text-align:left;transition:color .15s;}
.cp-task-hdr:hover,.cp-task-hdr.open{color:#0077b5;}
.cp-task-hdr-label{flex:1;}
.cp-task-badge{background:#0077b5;color:#fff;font-size:9px;font-weight:800;border-radius:999px;padding:1px 6px;flex-shrink:0;}
.cp-task-chevron{transition:transform .2s;flex-shrink:0;}
.cp-task-chevron.open{transform:rotate(180deg);}
.cp-task-body{padding:4px 0 8px;display:flex;flex-direction:column;gap:4px;}
.cp-task-item{background:#f8fafc;border-radius:8px;padding:7px 10px;cursor:pointer;transition:background .15s;}
.cp-task-item:hover{background:#f0f9ff;}
.cp-task-name{font-size:11px;font-weight:600;color:#0f172a;line-height:1.4;}
.cp-task-sub{font-size:10px;color:#94a3b8;font-weight:500;}
.cp-task-empty{font-size:11px;color:#94a3b8;padding:4px 2px;font-family:'Inter',sans-serif;}

`
