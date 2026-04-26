'use client'

import { Suspense } from 'react'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import toast from 'react-hot-toast'
import MainHeader from '../../../components/ui/MainHeader'
import { networkService } from '../../../services/network.service'
import { chatService } from '../../../services/chat.service'
import { authService } from '../../../services/auth.service'
import { useAuthStore } from '../../../store/authStore'

// ── Helpers ────────────────────────────────────────────────────────────────────
function getUserInfo(u: any) {
  const name =
    u?.freelancerProfile?.fullName ||
    u?.companyProfile?.companyName ||
    u?.clientProfile?.fullName ||
    u?.email || 'Xwite Member'
  const title =
    u?.freelancerProfile?.title ||
    u?.companyProfile?.industry ||
    u?.clientProfile?.workPreference ||
    u?.role || ''
  const image =
    u?.freelancerProfile?.profileImage ||
    u?.companyProfile?.profileImage ||
    u?.clientProfile?.profileImage || null
  const country =
    u?.freelancerProfile?.country ||
    u?.companyProfile?.country ||
    u?.clientProfile?.country || ''
  return { name, title, image, country }
}

function getProfilePath(u: any) {
  return u?.role === 'COMPANY' ? `/profile/company/${u.id}` : `/profile/${u.id}`
}

function getInitials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase() || '').join('') || 'X'
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
function Avatar({ name, image, size = 'md' }: { name: string; image: string | null; size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' }) {
  const sz = { xs: 'w-8 h-8 text-xs', sm: 'w-10 h-10 text-sm', md: 'w-12 h-12 text-sm', lg: 'w-14 h-14 text-base', xl: 'w-20 h-20 text-xl' }[size]
  return (
    <div className={`${sz} rounded-full overflow-hidden bg-[#c3e0fe] flex items-center justify-center shrink-0 border-2 border-white shadow-sm font-bold text-[#005d8f]`}>
      {image ? (
        <img src={image} alt={name} className="w-full h-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none' }} />
      ) : (
        getInitials(name)
      )}
    </div>
  )
}

// ── SVG icons ──────────────────────────────────────────────────────────────────
const Icons = {
  Connections: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <circle cx="9" cy="7" r="3"/><path d="M3 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2"/>
      <circle cx="19" cy="7" r="2"/><path d="M23 21v-1a3 3 0 0 0-3-3h-1"/>
    </svg>
  ),
  Contact: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="12" cy="10" r="3"/>
      <path d="M6 20v-1a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v1"/>
    </svg>
  ),
  PersonAdd: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <circle cx="10" cy="7" r="4"/><path d="M2 21v-1a6 6 0 0 1 6-6h4"/><path d="M19 16v6m-3-3h6"/>
    </svg>
  ),
  Groups: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <circle cx="8" cy="7" r="3"/><circle cx="16" cy="7" r="3"/>
      <path d="M2 21v-1a5 5 0 0 1 5-5h2m4 0h2a5 5 0 0 1 5 5v1"/>
    </svg>
  ),
  Event: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>
    </svg>
  ),
  Newsletter: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-5 h-5">
      <rect x="2" y="5" width="20" height="14" rx="2"/><path d="m2 5 10 9 10-9"/>
    </svg>
  ),
  ArrowRight: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="m9 18 6-6-6-6"/>
    </svg>
  ),
  Close: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="w-4 h-4">
      <path d="M18 6 6 18M6 6l12 12"/>
    </svg>
  ),
  Message: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  Location: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="w-4 h-4">
      <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
      <circle cx="12" cy="10" r="3"/>
    </svg>
  ),
  Plus: () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
      <path d="M12 5v14M5 12h14"/>
    </svg>
  ),
}

// ── Gradient banners per index ─────────────────────────────────────────────────
const CARD_GRADIENTS = [
  'from-[#cde5ff] to-[#0077b5]',
  'from-[#c3e0fe] to-[#45617a]',
  'from-[#ffdcc0] to-[#a85f00]',
]

// ── Mock data ──────────────────────────────────────────────────────────────────
const MOCK_GROUPS = [
  { id: 'g1', name: 'AI Product Designers', members: '4,812', status: 'Active', desc: 'Discussing AI-native design patterns and tools.', creator: { name: 'Sarah Chen', title: 'Design Lead, NeuralSystems', image: null } },
  { id: 'g2', name: 'ML Engineering Guild', members: '12,300', status: 'Very Active', desc: 'Best practices for production ML systems.', creator: { name: 'David Miller', title: 'CTO at CloudScale AI', image: null } },
  { id: 'g3', name: 'Startup Builders Network', members: '7,104', status: 'Active', desc: 'Connecting founders, designers, and engineers.', creator: { name: 'Alex Torres', title: 'Founder, LaunchPad', image: null } },
  { id: 'g4', name: 'UX Research Circle', members: '3,450', status: 'Moderate', desc: 'Sharing research methods and user insights.', creator: { name: 'Mia Kim', title: 'UX Lead, Shopify', image: null } },
]

const MOCK_EVENTS = [
  { id: 'e1', name: 'AI Collaboration Summit 2026', date: 'Apr 28, 2026 • 10:00 AM PDT', loc: 'Virtual Event', attending: '1,240', creator: { name: 'Sarah Chen', title: 'Design Lead, NeuralSystems', image: null } },
  { id: 'e2', name: 'Design Systems Meetup', date: 'May 5, 2026 • 6:00 PM IST', loc: 'Bengaluru, India', attending: '340', creator: { name: 'Rohan Gupta', title: 'Product Designer', image: null } },
  { id: 'e3', name: 'ML Ops Bootcamp', date: 'May 12–14, 2026', loc: 'Online Workshop', attending: '780', creator: { name: 'David Miller', title: 'CTO at CloudScale AI', image: null } },
  { id: 'e4', name: 'Xwite Skill Exchange Fair', date: 'May 22, 2026 • 2:00 PM EDT', loc: 'Virtual Event', attending: '2,100', creator: { name: 'Alex Torres', title: 'Founder, LaunchPad', image: null } },
]

const MOCK_NEWSLETTERS = [
  { id: 'n1', title: 'The Collab Weekly', author: 'Sarah Chen', authorTitle: 'Design Lead, NeuralSystems', authorImage: null, desc: 'Weekly insights on peer-to-peer collaboration and async work trends.', subs: '12,402', freq: 'Every Monday' },
  { id: 'n2', title: 'AI Design Digest', author: 'Rohan Gupta', authorTitle: 'Product Designer', authorImage: null, desc: 'Curated AI and design news for product builders and founders.', subs: '8,740', freq: 'Bi-weekly' },
  { id: 'n3', title: 'Cloud & Scale', author: 'David Miller', authorTitle: 'CTO at CloudScale AI', authorImage: null, desc: 'Deep dives into cloud architecture and LLM infrastructure.', subs: '5,190', freq: 'Every Thursday' },
  { id: 'n4', title: 'Startup Dispatch', author: 'Mia Kim', authorTitle: 'UX Lead, Shopify', authorImage: null, desc: 'Growth strategies and design thinking for early-stage teams.', subs: '3,810', freq: 'Twice weekly' },
]

// ── Modals ─────────────────────────────────────────────────────────────────────
function CreateGroupModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [loading, setLoading] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#efeeeb]">
          <h3 className="font-[Manrope] font-bold text-lg text-[#1b1c1a]">Create Group</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#efeeeb] flex items-center justify-center text-[#707881] hover:bg-[#e3e2df] transition"><Icons.Close /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-[#404850] block mb-1">Group Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. React Developers India" className="w-full rounded-lg border border-[#bfc7d1] px-3 py-2.5 text-sm text-[#1b1c1a] outline-none focus:border-[#005d8f] focus:ring-1 focus:ring-[#005d8f]/30" />
          </div>
          <div>
            <label className="text-xs font-bold text-[#404850] block mb-1">Description</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="What is this group about?" className="w-full rounded-lg border border-[#bfc7d1] px-3 py-2.5 text-sm text-[#1b1c1a] outline-none focus:border-[#005d8f] focus:ring-1 focus:ring-[#005d8f]/30 resize-none" />
          </div>
          <p className="bg-[#c3e0fe]/30 rounded-lg p-3 text-xs text-[#005d8f]">Your connections and followers will be able to join this group.</p>
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-full border border-[#bfc7d1] text-[#404850] text-sm font-bold hover:bg-[#efeeeb] transition">Cancel</button>
          <button onClick={() => { if (!name.trim()) return toast.error('Name required'); setLoading(true); setTimeout(() => { toast.success(`Group "${name}" created!`); setLoading(false); onClose() }, 800) }} disabled={loading} className="flex-1 py-2.5 rounded-full bg-[#005d8f] text-white text-sm font-bold disabled:opacity-60 transition">{loading ? 'Creating…' : 'Create Group'}</button>
        </div>
      </div>
    </div>
  )
}

function CreateEventModal({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('')
  const [date, setDate] = useState('')
  const [loc, setLoc] = useState('')
  const [type, setType] = useState<'virtual' | 'physical'>('virtual')
  const [loading, setLoading] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#efeeeb]">
          <h3 className="font-[Manrope] font-bold text-lg text-[#1b1c1a]">Create Event</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#efeeeb] flex items-center justify-center text-[#707881] hover:bg-[#e3e2df] transition"><Icons.Close /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-[#404850] block mb-1">Event Name *</label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. AI Design Summit 2026" className="w-full rounded-lg border border-[#bfc7d1] px-3 py-2.5 text-sm text-[#1b1c1a] outline-none focus:border-[#005d8f] focus:ring-1 focus:ring-[#005d8f]/30" />
          </div>
          <div>
            <label className="text-xs font-bold text-[#404850] block mb-1">Date & Time *</label>
            <input type="datetime-local" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-lg border border-[#bfc7d1] px-3 py-2.5 text-sm text-[#1b1c1a] outline-none focus:border-[#005d8f] focus:ring-1 focus:ring-[#005d8f]/30" />
          </div>
          <div>
            <label className="text-xs font-bold text-[#404850] block mb-2">Event Type</label>
            <div className="flex gap-2">
              {(['virtual', 'physical'] as const).map((t) => (
                <button key={t} onClick={() => setType(t)} className={`flex-1 py-2 rounded-full text-sm font-bold border-2 transition ${type === t ? 'border-[#005d8f] bg-[#005d8f]/5 text-[#005d8f]' : 'border-[#bfc7d1] text-[#404850]'}`}>{t === 'virtual' ? 'Virtual' : 'In-Person'}</button>
              ))}
            </div>
          </div>
          {type === 'physical' && (
            <div>
              <label className="text-xs font-bold text-[#404850] block mb-1">Location</label>
              <input type="text" value={loc} onChange={(e) => setLoc(e.target.value)} placeholder="City, Venue" className="w-full rounded-lg border border-[#bfc7d1] px-3 py-2.5 text-sm text-[#1b1c1a] outline-none focus:border-[#005d8f] focus:ring-1 focus:ring-[#005d8f]/30" />
            </div>
          )}
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-full border border-[#bfc7d1] text-[#404850] text-sm font-bold hover:bg-[#efeeeb] transition">Cancel</button>
          <button onClick={() => { if (!name.trim()) return toast.error('Name required'); if (!date) return toast.error('Date required'); setLoading(true); setTimeout(() => { toast.success(`Event "${name}" created!`); setLoading(false); onClose() }, 800) }} disabled={loading} className="flex-1 py-2.5 rounded-full bg-[#005d8f] text-white text-sm font-bold disabled:opacity-60 transition">{loading ? 'Creating…' : 'Create Event'}</button>
        </div>
      </div>
    </div>
  )
}

function CreateNewsletterModal({ onClose }: { onClose: () => void }) {
  const [title, setTitle] = useState('')
  const [desc, setDesc] = useState('')
  const [freq, setFreq] = useState('weekly')
  const [loading, setLoading] = useState(false)
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#efeeeb]">
          <h3 className="font-[Manrope] font-bold text-lg text-[#1b1c1a]">Create Newsletter</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-full bg-[#efeeeb] flex items-center justify-center text-[#707881] hover:bg-[#e3e2df] transition"><Icons.Close /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-[#404850] block mb-1">Title *</label>
            <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. The Design Weekly" className="w-full rounded-lg border border-[#bfc7d1] px-3 py-2.5 text-sm text-[#1b1c1a] outline-none focus:border-[#005d8f] focus:ring-1 focus:ring-[#005d8f]/30" />
          </div>
          <div>
            <label className="text-xs font-bold text-[#404850] block mb-1">Description *</label>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder="What topics will you cover?" className="w-full rounded-lg border border-[#bfc7d1] px-3 py-2.5 text-sm text-[#1b1c1a] outline-none focus:border-[#005d8f] focus:ring-1 focus:ring-[#005d8f]/30 resize-none" />
          </div>
          <div>
            <label className="text-xs font-bold text-[#404850] block mb-2">Frequency</label>
            <div className="grid grid-cols-2 gap-2">
              {[{ value: 'daily', label: 'Daily' }, { value: 'weekly', label: 'Weekly' }, { value: 'biweekly', label: 'Bi-weekly' }, { value: 'monthly', label: 'Monthly' }].map((f) => (
                <button key={f.value} onClick={() => setFreq(f.value)} className={`py-2 rounded-lg text-sm font-bold border-2 transition ${freq === f.value ? 'border-[#005d8f] bg-[#005d8f]/5 text-[#005d8f]' : 'border-[#bfc7d1] text-[#404850] hover:border-[#005d8f]'}`}>{f.label}</button>
              ))}
            </div>
          </div>
        </div>
        <div className="px-5 pb-5 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 rounded-full border border-[#bfc7d1] text-[#404850] text-sm font-bold hover:bg-[#efeeeb] transition">Cancel</button>
          <button onClick={() => { if (!title.trim()) return toast.error('Title required'); if (!desc.trim()) return toast.error('Description required'); setLoading(true); setTimeout(() => { toast.success(`Newsletter "${title}" published!`); setLoading(false); onClose() }, 800) }} disabled={loading} className="flex-1 py-2.5 rounded-full bg-[#005d8f] text-white text-sm font-bold disabled:opacity-60 transition">{loading ? 'Publishing…' : 'Publish'}</button>
        </div>
      </div>
    </div>
  )
}

// ── Pending Invitations ────────────────────────────────────────────────────────
function PendingInvitations({ pending, onAccept, onIgnore }: { pending: any[]; onAccept: (id: string) => void; onIgnore: (id: string) => void }) {
  const router = useRouter()
  if (!pending.length) return null
  return (
    <div className="bg-white rounded-xl border border-[#e3e2df] shadow-sm overflow-hidden mb-6">
      <div className="px-4 py-3 bg-[#f4f3f0] border-b border-[#efeeeb]">
        <p className="text-xs font-bold text-[#707881] uppercase tracking-wider">Pending Invitations ({pending.length})</p>
      </div>
      <div className="divide-y divide-[#efeeeb]">
        {pending.slice(0, 3).map((req: any) => {
          const { name, title, image } = getUserInfo(req.fromUser)
          return (
            <div key={req.id} className="p-4 hover:bg-[#faf9f6] transition-colors">
              <button type="button" onClick={() => req.fromUser?.id && router.push(getProfilePath(req.fromUser))} className="flex w-full items-start gap-3 mb-3 text-left">
                <Avatar name={name} image={image} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-[#1b1c1a] truncate">{name}</p>
                  <p className="text-xs text-[#707881] truncate">{title || req.fromUser?.role}</p>
                </div>
              </button>
              <div className="flex gap-2">
                <button onClick={() => onIgnore(req.id)} className="flex-1 py-1.5 rounded-full border border-[#005d8f] text-[#005d8f] text-xs font-bold hover:bg-[#005d8f]/5 transition">Ignore</button>
                <button onClick={() => onAccept(req.id)} className="flex-1 py-1.5 rounded-full bg-[#005d8f] text-white text-xs font-bold shadow-sm transition active:scale-95">Accept</button>
              </div>
            </div>
          )
        })}
      </div>
      {pending.length > 3 && (
        <button className="w-full py-3 text-sm font-bold text-[#005d8f] hover:bg-[#faf9f6] transition border-t border-[#efeeeb]">
          Manage all ({pending.length})
        </button>
      )}
    </div>
  )
}

// ── SECTION: Overview ─────────────────────────────────────────────────────────
function OverviewSection({ pending, suggestions, onAccept, onIgnore, onConnect }: any) {
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [followed, setFollowed] = useState<Set<string>>(new Set())
  const [connected, setConnected] = useState<Set<string>>(new Set())
  const [showAllCompanies, setShowAllCompanies] = useState(false)
  const [showAllPeople, setShowAllPeople] = useState(false)
  const router = useRouter()

  // Split real suggestions into companies vs people
  const allCompanySuggestions = suggestions.filter((s: any) => s.role === 'COMPANY')
  const allPeopleSuggestions = suggestions.filter((s: any) => s.role !== 'COMPANY' && !dismissed.has(s.id))
  const companySuggestions = showAllCompanies ? allCompanySuggestions : allCompanySuggestions.slice(0, 3)
  const peopleSuggestions = showAllPeople ? allPeopleSuggestions : allPeopleSuggestions.slice(0, 4)

  async function handleFollow(userId: string) {
    const isFollowed = followed.has(userId)
    setFollowed((prev) => { const n = new Set(prev); isFollowed ? n.delete(userId) : n.add(userId); return n })
    try {
      if (isFollowed) {
        await networkService.unfollow(userId)
      } else {
        await networkService.follow(userId)
      }
    } catch {
      // Revert on failure
      setFollowed((prev) => { const n = new Set(prev); isFollowed ? n.add(userId) : n.delete(userId); return n })
    }
  }

  return (
    <div className="space-y-10">
      <PendingInvitations pending={pending} onAccept={onAccept} onIgnore={onIgnore} />

      {/* Recommended for your industry — real COMPANY users */}
      <section>
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-[Manrope] text-2xl font-extrabold tracking-tight text-[#1b1c1a]">Recommended for your Industry</h2>
            <p className="text-[#404850] mt-1 text-sm">Stay ahead with insights from leading companies on Xwite.</p>
          </div>
          <button
            onClick={() => setShowAllCompanies(v => !v)}
            className="text-[#005d8f] font-bold text-sm flex items-center gap-1 hover:underline"
          >
            {showAllCompanies ? 'Show less' : 'See all'} <Icons.ArrowRight />
          </button>
        </div>

        {companySuggestions.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e3e2df] shadow-sm p-10 text-center">
            <p className="text-sm text-[#707881]">No company recommendations right now. Check back soon.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {companySuggestions.map((co: any, i: number) => {
              const { name, title, image } = getUserInfo(co)
              const isFollowed = followed.has(co.id)
              const gradients = [
                'from-[#cde5ff] to-[#0077b5]',
                'from-[#c3e0fe] to-[#45617a]',
                'from-[#ffdcc0] to-[#a85f00]',
              ]
              return (
                <div key={co.id} className="bg-white rounded-xl border border-[#e3e2df] shadow-sm overflow-hidden group hover:shadow-md transition-shadow cursor-pointer" onClick={() => router.push(getProfilePath(co))}>
                  {/* Banner */}
                  <div className={`h-16 bg-gradient-to-br ${gradients[i % gradients.length]} relative`}>
                    <div className="absolute -bottom-6 left-6 w-14 h-14 bg-white rounded-lg shadow-sm border border-[#e3e2df] flex items-center justify-center overflow-hidden">
                      {image ? (
                        <img src={image} alt={name} className="w-full h-full object-cover" />
                      ) : (
                        <span className="text-xl font-black text-[#005d8f]">{name[0]}</span>
                      )}
                    </div>
                  </div>
                  <div className="p-6 pt-9">
                    <h3 className="font-[Manrope] font-bold text-lg group-hover:text-[#005d8f] transition-colors leading-tight">{name}</h3>
                    <p className="text-xs text-[#404850] mb-1">{title || 'Company'}</p>
                    <p className="text-sm text-[#707881] line-clamp-2 mb-4 leading-relaxed">
                      {co.companyProfile?.description || `${name} is a company on Xwite. Connect and collaborate.`}
                    </p>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleFollow(co.id) }}
                      className={`w-full flex items-center justify-center gap-2 py-2 rounded-full border-2 font-bold text-sm transition active:scale-95 ${isFollowed ? 'border-[#e3e2df] bg-[#e3e2df] text-[#404850]' : 'border-[#005d8f] text-[#005d8f] hover:bg-[#005d8f]/5'}`}
                    >
                      {isFollowed ? '✓ Following' : <><Icons.Plus /> Follow</>}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </section>

      {/* People you may know — real CLIENT + FREELANCER users */}
      <section>
        <div className="flex items-end justify-between mb-6">
          <div>
            <h2 className="font-[Manrope] text-2xl font-extrabold tracking-tight text-[#1b1c1a]">People you may know</h2>
            <p className="text-[#404850] mt-1 text-sm">Based on your shared connections and professional history.</p>
          </div>
        </div>

        {peopleSuggestions.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e3e2df] shadow-sm p-10 text-center">
            <div className="w-14 h-14 rounded-full bg-[#c3e0fe]/40 flex items-center justify-center mx-auto mb-3">
              <Icons.PersonAdd />
            </div>
            <p className="text-sm font-semibold text-[#404850]">No suggestions at the moment</p>
            <p className="text-xs text-[#707881] mt-1">Complete your profile to get better recommendations</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {peopleSuggestions.map((u: any) => {
              const { name, title, image, country } = getUserInfo(u)
              const isConnected = connected.has(u.id)
              const roleLabel = u.role === 'FREELANCER' ? 'Freelancer' : u.role === 'CLIENT' ? 'Client' : u.role?.replace(/_/g, ' ')

              return (
                <div
                  key={u.id}
                  className="bg-white rounded-xl border border-[#e3e2df]/60 p-6 flex items-start gap-6 relative overflow-hidden group hover:bg-[#f4f3f0] transition-colors shadow-sm"
                >
                  {/* Dismiss — appears on hover, top-right */}
                  <div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => setDismissed((prev) => new Set(prev).add(u.id))}
                      className="p-2 rounded-full hover:bg-[#e3e2df] transition-colors"
                    >
                      <Icons.Close />
                    </button>
                  </div>

                  {/* Avatar — clickable */}
                  <button
                    type="button"
                    className="shrink-0"
                    onClick={() => u.id && router.push(getProfilePath(u))}
                  >
                    {image ? (
                      <img
                        src={image}
                        alt={name}
                        className="w-24 h-24 rounded-xl object-cover border-4 border-white shadow-sm hover:opacity-90 transition-opacity"
                      />
                    ) : (
                      <div className="w-24 h-24 rounded-xl border-4 border-white shadow-sm bg-gradient-to-br from-[#c3e0fe] to-[#93ccff] flex items-center justify-center text-2xl font-black text-[#005d8f] hover:opacity-90 transition-opacity">
                        {getInitials(name)}
                      </div>
                    )}
                  </button>

                  {/* Content */}
                  <div className="flex-1 min-w-0 space-y-2">
                    {/* Name + title — clickable */}
                    <button
                      type="button"
                      className="text-left w-full"
                      onClick={() => u.id && router.push(getProfilePath(u))}
                    >
                      <h4 className="font-[Manrope] font-bold text-xl text-[#1b1c1a] leading-tight hover:text-[#005d8f] transition-colors">
                        {name}
                      </h4>
                      <p className="text-sm font-medium text-[#005d8f]">{title}</p>
                    </button>

                    {/* Role / location row */}
                    <div className="flex items-center gap-2 text-xs text-[#404850]">
                      <div className="flex items-center gap-1.5">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-[#c3e0fe]/50 text-[#005d8f] font-semibold text-[10px] uppercase tracking-wide">
                          {roleLabel}
                        </span>
                        {country && (
                          <span className="flex items-center gap-1 text-[#707881]">
                            <Icons.Location />
                            {country}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Connect button */}
                    <div className="pt-2">
                      <button
                        onClick={async () => {
                          try {
                            await onConnect(u.id)
                            setConnected((prev) => new Set(prev).add(u.id))
                          } catch {}
                        }}
                        disabled={isConnected}
                        className={`flex items-center gap-2 px-6 py-2 rounded-full font-bold text-sm transition-all active:scale-95 ${
                          isConnected
                            ? 'bg-[#efeeeb] text-[#707881] cursor-default'
                            : 'bg-[#005d8f] text-white shadow-[0_4px_12px_rgba(0,93,143,0.2)]'
                        }`}
                      >
                        <Icons.PersonAdd />
                        {isConnected ? 'Request Sent' : 'Connect'}
                      </button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* View more / Show less for people */}
        {allPeopleSuggestions.length > 4 && (
          <div className="flex justify-center mt-4">
            <button
              onClick={() => setShowAllPeople(v => !v)}
              className="px-6 py-2 rounded-full border-2 border-[#005d8f] text-[#005d8f] font-bold text-sm hover:bg-[#005d8f]/5 transition active:scale-95"
            >
              {showAllPeople ? 'Show less' : `View more (${allPeopleSuggestions.length - 4} more)`}
            </button>
          </div>
        )}
      </section>

      {/* Network growth banner */}
      <section className="bg-gradient-to-br from-[#005d8f] to-[#0077b5] rounded-xl p-6 text-white shadow-lg">
        <h3 className="font-[Manrope] font-bold text-lg mb-1">Grow your professional network</h3>
        <p className="text-white/80 text-sm mb-4">Connect with professionals, collaborate on projects, and build lasting relationships.</p>
        <div className="flex flex-wrap gap-3">
          <button onClick={() => router.push('/network?section=connections')} className="px-4 py-2 rounded-full bg-white text-[#005d8f] font-bold text-sm hover:bg-white/90 transition active:scale-95">View Connections</button>
          <button onClick={() => router.push('/network?section=following')} className="px-4 py-2 rounded-full border-2 border-white/40 text-white font-bold text-sm hover:bg-white/10 transition active:scale-95">Following & Followers</button>
        </div>
      </section>
    </div>
  )
}

// ── SECTION: Connections ──────────────────────────────────────────────────────
function ConnectionsSection({ pending, connections, onAccept, onIgnore, onRemove }: any) {
  const [search, setSearch] = useState('')
  const router = useRouter()

  const handleOpenChat = async (userId?: string) => {
    if (!userId) return
    try {
      const res = await chatService.getOrCreateConversation(userId)
      const cid = res?.data?.id
      router.push(cid ? `/messages?conversationId=${cid}` : '/messages')
    } catch { toast.error('Could not open chat') }
  }

  const filtered = connections.filter((c: any) => {
    if (!search) return true
    const { name } = getUserInfo(c.user)
    return name.toLowerCase().includes(search.toLowerCase())
  })

  return (
    <div>
      <PendingInvitations pending={pending} onAccept={onAccept} onIgnore={onIgnore} />

      <div className="flex items-center justify-between mb-4">
        <h2 className="font-[Manrope] font-extrabold text-2xl text-[#1b1c1a]">Connections <span className="text-[#707881] font-medium text-lg">({connections.length})</span></h2>
      </div>

      <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search your connections…" className="w-full rounded-full bg-[#efeeeb] border-none px-4 py-2.5 text-sm text-[#1b1c1a] outline-none focus:ring-2 focus:ring-[#005d8f]/30 mb-5" />

      {filtered.length === 0 ? (
        <div className="bg-white rounded-xl border border-[#e3e2df] shadow-sm p-10 text-center">
          <div className="w-14 h-14 rounded-full bg-[#c3e0fe]/40 flex items-center justify-center mx-auto mb-3"><Icons.Connections /></div>
          <p className="text-sm font-semibold text-[#404850]">{search ? 'No results found' : 'No connections yet'}</p>
          <p className="text-xs text-[#707881] mt-1">{search ? 'Try a different name' : 'Start connecting with people in your field'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c: any) => {
            const { name, title, image } = getUserInfo(c.user)
            const diff = Date.now() - new Date(c.connectedAt).getTime()
            const days = Math.floor(diff / 86400000)
            const timeAgo = days < 1 ? 'Today' : days < 30 ? `${days}d ago` : days < 365 ? `${Math.floor(days / 30)}mo ago` : `${Math.floor(days / 365)}y ago`
            return (
              <div key={c.connectionId} className="bg-white rounded-xl border border-[#e3e2df] shadow-sm p-4 flex items-center gap-4 hover:bg-[#faf9f6] transition-colors">
                <button type="button" onClick={() => c.user?.id && router.push(getProfilePath(c.user))} className="flex flex-1 min-w-0 items-center gap-3 text-left">
                  <Avatar name={name} image={image} size="md" />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-[#1b1c1a] truncate">{name}</p>
                    <p className="text-xs text-[#707881] truncate">{title}</p>
                    <p className="text-xs text-[#707881] mt-0.5">Connected {timeAgo}</p>
                  </div>
                </button>
                <div className="flex gap-2 shrink-0">
                  <button onClick={() => void handleOpenChat(c.user?.id)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#005d8f] text-[#005d8f] text-xs font-bold hover:bg-[#005d8f]/5 transition"><Icons.Message /> Message</button>
                  <button onClick={() => onRemove(c.connectionId)} className="px-3 py-1.5 rounded-full border border-[#bfc7d1] text-[#707881] text-xs font-bold hover:bg-[#efeeeb] transition">Remove</button>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── SECTION: Following & Followers ───────────────────────────────────────────
function FollowSection({ pending, following, followers, onAccept, onIgnore, onUnfollow, onConnect }: any) {
  const [unfollowed, setUnfollowed] = useState<Set<string>>(new Set())
  const [connected, setConnected] = useState<Set<string>>(new Set())
  const router = useRouter()

  return (
    <div className="space-y-8">
      <PendingInvitations pending={pending} onAccept={onAccept} onIgnore={onIgnore} />

      {/* Following */}
      <div>
        <h3 className="font-[Manrope] font-extrabold text-xl text-[#1b1c1a] mb-4">Following <span className="text-[#707881] font-medium text-base">({following.length})</span></h3>
        {following.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e3e2df] shadow-sm p-8 text-center">
            <p className="text-sm text-[#707881]">Not following anyone yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {following.map((f: any) => {
              const { name, title, image } = getUserInfo(f.following)
              const isUnfollowed = unfollowed.has(f.following.id)
              return (
                <div key={f.following.id} className="bg-white rounded-xl border border-[#e3e2df] shadow-sm p-4 flex items-center gap-3 hover:bg-[#faf9f6] transition-colors">
                  <button type="button" onClick={() => f.following?.id && router.push(getProfilePath(f.following))} className="flex flex-1 min-w-0 items-center gap-3 text-left">
                    <Avatar name={name} image={image} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-[#1b1c1a] truncate">{name}</p>
                      <p className="text-xs text-[#707881] truncate">{title}</p>
                    </div>
                  </button>
                  <button
                    onClick={async () => { try { if (isUnfollowed) return; await onUnfollow(f.following.id); setUnfollowed((prev) => new Set(prev).add(f.following.id)); toast.success(`Unfollowed ${name}`) } catch {} }}
                    className="px-3 py-1.5 rounded-full border border-[#bfc7d1] text-[#404850] text-xs font-bold hover:bg-[#efeeeb] transition shrink-0"
                  >
                    {isUnfollowed ? 'Follow' : 'Following'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Followers */}
      <div>
        <h3 className="font-[Manrope] font-extrabold text-xl text-[#1b1c1a] mb-4">Followers <span className="text-[#707881] font-medium text-base">({followers.length})</span></h3>
        {followers.length === 0 ? (
          <div className="bg-white rounded-xl border border-[#e3e2df] shadow-sm p-8 text-center">
            <p className="text-sm text-[#707881]">No followers yet</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {followers.map((f: any) => {
              const { name, title, image } = getUserInfo(f.follower)
              const isConnected = connected.has(f.follower.id)
              return (
                <div key={f.follower.id} className="bg-white rounded-xl border border-[#e3e2df] shadow-sm p-4 flex items-center gap-3 hover:bg-[#faf9f6] transition-colors">
                  <button type="button" onClick={() => f.follower?.id && router.push(getProfilePath(f.follower))} className="flex flex-1 min-w-0 items-center gap-3 text-left">
                    <Avatar name={name} image={image} size="md" />
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-sm text-[#1b1c1a] truncate">{name}</p>
                      <p className="text-xs text-[#707881] truncate">{title}</p>
                    </div>
                  </button>
                  <button
                    onClick={async () => { try { await onConnect(f.follower.id); setConnected((prev) => new Set(prev).add(f.follower.id)) } catch {} }}
                    disabled={isConnected}
                    className={`px-3 py-1.5 rounded-full border text-xs font-bold transition shrink-0 ${isConnected ? 'border-[#bfc7d1] text-[#707881]' : 'border-[#005d8f] text-[#005d8f] hover:bg-[#005d8f]/5'}`}
                  >
                    {isConnected ? '✓ Sent' : '+ Connect'}
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

// ── SECTION: Groups ──────────────────────────────────────────────────────────
function GroupsSection({ pending, onAccept, onIgnore }: any) {
  const [showCreate, setShowCreate] = useState(false)
  return (
    <div>
      {showCreate && <CreateGroupModal onClose={() => setShowCreate(false)} />}
      <PendingInvitations pending={pending} onAccept={onAccept} onIgnore={onIgnore} />
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-[Manrope] font-extrabold text-2xl text-[#1b1c1a]">Groups</h2>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 border border-[#005d8f] text-[#005d8f] px-4 py-2 rounded-full text-sm font-bold hover:bg-[#005d8f]/5 transition">Discover</button>
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 bg-[#005d8f] text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-[#004e7a] transition active:scale-95"><Icons.Plus /> Create</button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {MOCK_GROUPS.map((g, i) => (
          <div key={g.id} className="bg-white rounded-xl border border-[#e3e2df] shadow-sm overflow-hidden hover:shadow-md transition-shadow">
            <div className={`h-12 bg-gradient-to-br ${CARD_GRADIENTS[i % CARD_GRADIENTS.length]}`} />
            <div className="p-5">
              <div className="flex items-start gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl bg-[#c3e0fe]/40 flex items-center justify-center text-xl shrink-0 border border-[#e3e2df] -mt-8 bg-white shadow-sm">
                  <Icons.Groups />
                </div>
                <div className="flex-1 min-w-0 pt-1">
                  <p className="font-bold text-[#1b1c1a] leading-tight">{g.name}</p>
                  <p className="text-xs text-[#707881]">{g.members} members · {g.status}</p>
                </div>
              </div>
              <p className="text-sm text-[#404850] mb-4 leading-relaxed">{g.desc}</p>
              <div className="flex items-center gap-2 mb-4 p-3 bg-[#f4f3f0] rounded-lg">
                <Avatar name={g.creator.name} image={g.creator.image} size="xs" />
                <div>
                  <p className="text-xs text-[#707881]">Created by <span className="font-bold text-[#1b1c1a]">{g.creator.name}</span></p>
                  <p className="text-[10px] text-[#707881]">{g.creator.title}</p>
                </div>
              </div>
              <button className="w-full py-2 rounded-full border border-[#005d8f] text-[#005d8f] text-sm font-bold hover:bg-[#005d8f]/5 transition active:scale-95">View Group</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── SECTION: Events ──────────────────────────────────────────────────────────
function EventsSection({ pending, onAccept, onIgnore }: any) {
  const [showCreate, setShowCreate] = useState(false)
  const [registered, setRegistered] = useState<Set<string>>(new Set())
  return (
    <div>
      {showCreate && <CreateEventModal onClose={() => setShowCreate(false)} />}
      <PendingInvitations pending={pending} onAccept={onAccept} onIgnore={onIgnore} />
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-[Manrope] font-extrabold text-2xl text-[#1b1c1a]">Events</h2>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 bg-[#005d8f] text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-[#004e7a] transition active:scale-95"><Icons.Plus /> Create Event</button>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {MOCK_EVENTS.map((ev, i) => {
          const isReg = registered.has(ev.id)
          return (
            <div key={ev.id} className="bg-white rounded-xl border border-[#e3e2df] shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              <div className={`h-12 bg-gradient-to-br ${CARD_GRADIENTS[i % CARD_GRADIENTS.length]}`} />
              <div className="p-5">
                <div className="flex items-start gap-3 mb-3">
                  <div className="w-12 h-12 rounded-xl bg-white flex items-center justify-center shrink-0 border border-[#e3e2df] -mt-8 shadow-sm">
                    <Icons.Event />
                  </div>
                  <div className="flex-1 min-w-0 pt-1">
                    <p className="font-bold text-[#1b1c1a] leading-tight">{ev.name}</p>
                    <p className="text-xs text-[#707881]">{ev.date}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 text-xs text-[#707881] mb-4">
                  <span className="flex items-center gap-1"><Icons.Location /> {ev.loc}</span>
                  <span>· {ev.attending} attending</span>
                </div>
                <div className="flex items-center gap-2 mb-4 p-3 bg-[#f4f3f0] rounded-lg">
                  <Avatar name={ev.creator.name} image={ev.creator.image} size="xs" />
                  <div>
                    <p className="text-xs text-[#707881]">Organized by <span className="font-bold text-[#1b1c1a]">{ev.creator.name}</span></p>
                    <p className="text-[10px] text-[#707881]">{ev.creator.title}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => setRegistered((prev) => { const n = new Set(prev); n.has(ev.id) ? n.delete(ev.id) : n.add(ev.id); return n })} className={`flex-1 py-2 rounded-full text-sm font-bold transition active:scale-95 ${isReg ? 'bg-green-100 text-green-700 border border-green-200' : 'bg-[#005d8f] text-white hover:bg-[#004e7a]'}`}>{isReg ? '✓ Registered' : 'Register'}</button>
                  <button className="flex-1 py-2 rounded-full border border-[#bfc7d1] text-[#404850] text-sm font-bold hover:bg-[#efeeeb] transition active:scale-95">Details</button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── SECTION: Newsletters ─────────────────────────────────────────────────────
function NewslettersSection({ pending, onAccept, onIgnore, userRole }: any) {
  const [showCreate, setShowCreate] = useState(false)
  const [subscribed, setSubscribed] = useState<Set<string>>(new Set(MOCK_NEWSLETTERS.map((n) => n.id)))
  return (
    <div>
      {showCreate && <CreateNewsletterModal onClose={() => setShowCreate(false)} />}
      <PendingInvitations pending={pending} onAccept={onAccept} onIgnore={onIgnore} />
      <div className="flex items-center justify-between mb-5">
        <h2 className="font-[Manrope] font-extrabold text-2xl text-[#1b1c1a]">Newsletters <span className="text-[#707881] font-medium text-lg">({subscribed.size})</span></h2>
        <div className="flex gap-2">
          <button className="flex items-center gap-1.5 border border-[#005d8f] text-[#005d8f] px-4 py-2 rounded-full text-sm font-bold hover:bg-[#005d8f]/5 transition">Discover</button>
          {userRole === 'COMPANY' && (
            <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 bg-[#005d8f] text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-[#004e7a] transition active:scale-95"><Icons.Plus /> Create</button>
          )}
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {MOCK_NEWSLETTERS.map((n) => {
          const isSub = subscribed.has(n.id)
          return (
            <div key={n.id} className="bg-white rounded-xl border border-[#e3e2df] shadow-sm p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start gap-3 mb-3">
                <Avatar name={n.author} image={n.authorImage} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-[#1b1c1a] leading-tight">{n.title}</p>
                  <p className="text-sm text-[#005d8f] font-medium">by {n.author}</p>
                  <p className="text-xs text-[#707881]">{n.authorTitle}</p>
                </div>
              </div>
              <p className="text-sm text-[#404850] mb-1 leading-relaxed">{n.desc}</p>
              <p className="text-xs text-[#707881] mb-4">{n.subs} subscribers · {n.freq}</p>
              <button
                onClick={() => setSubscribed((prev) => { const nx = new Set(prev); nx.has(n.id) ? nx.delete(n.id) : nx.add(n.id); return nx })}
                className={`w-full py-2 rounded-full text-sm font-bold transition active:scale-95 ${isSub ? 'bg-[#005d8f] text-white hover:bg-[#004e7a]' : 'border border-[#005d8f] text-[#005d8f] hover:bg-[#005d8f]/5'}`}
              >
                {isSub ? 'Unsubscribe' : 'Subscribe'}
              </button>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── MAIN PAGE ─────────────────────────────────────────────────────────────────
function NetworkPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { user, setUser } = useAuthStore()
  const [activeSection, setActiveSection] = useState(searchParams.get('section') || 'overview')
  const [loading, setLoading] = useState(true)

  const [pending, setPending] = useState<any[]>([])
  const [suggestions, setSuggestions] = useState<any[]>([])
  const [connections, setConnections] = useState<any[]>([])
  const [following, setFollowing] = useState<any[]>([])
  const [followers, setFollowers] = useState<any[]>([])

  useEffect(() => {
    if (!authService.isLoggedIn()) { router.push('/login'); return }
    void loadAll()
  }, [])

  useEffect(() => {
    const section = searchParams.get('section')
    if (section) setActiveSection(section)
  }, [searchParams])

  const loadAll = async () => {
    setLoading(true)
    try {
      if (!user) {
        const { authService: auth } = await import('../../../services/auth.service')
        const me = await auth.getMe()
        setUser(me.data)
      }
      const results = await Promise.allSettled([
        networkService.getPendingRequests(),
        networkService.getSuggestions(),
        networkService.getConnections(),
        networkService.getFollowing(),
        networkService.getFollowers(),
      ])
      const val = (r: PromiseSettledResult<any>) => r.status === 'fulfilled' ? r.value : null
      const [pend, sugg, conn, fwing, fwers] = results.map(val)
      if (pend)  setPending(pend.data || [])
      if (sugg)  setSuggestions(sugg.data || [])
      if (conn)  setConnections(conn.data || [])
      if (fwing) setFollowing(fwing.data || [])
      if (fwers) setFollowers(fwers.data || [])
    } catch {
      toast.error('Failed to load network')
    } finally {
      setLoading(false)
    }
  }

  const handleAccept = async (connectionId: string) => {
    try {
      await networkService.acceptRequest(connectionId)
      setPending((prev) => prev.filter((p) => p.id !== connectionId))
      toast.success('Connection accepted!')
      void loadAll()
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed') }
  }

  const handleIgnore = async (connectionId: string) => {
    try {
      await networkService.rejectRequest(connectionId)
      setPending((prev) => prev.filter((p) => p.id !== connectionId))
      toast.success('Invitation ignored')
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed') }
  }

  const handleConnect = async (userId: string) => {
    try {
      await networkService.sendRequest(userId)
      toast.success('Connection request sent!')
    } catch (e: any) { toast.error(e.response?.data?.message || 'Already sent or connected') }
  }

  const handleRemove = async (connectionId: string) => {
    try {
      await networkService.removeConnection(connectionId)
      setConnections((prev) => prev.filter((c: any) => c.connectionId !== connectionId))
      toast.success('Connection removed')
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed') }
  }

  const handleUnfollow = async (userId: string) => {
    try {
      await networkService.unfollow(userId)
    } catch (e: any) { toast.error(e.response?.data?.message || 'Failed') }
  }

  const navItems = [
    { id: 'overview', label: 'Overview', icon: <Icons.Contact /> },
    { id: 'connections', label: 'Connections', icon: <Icons.Connections />, count: connections.length },
    { id: 'following', label: 'Following & Followers', icon: <Icons.PersonAdd />, count: following.length + followers.length },
  ]

  const commonProps = { pending, onAccept: handleAccept, onIgnore: handleIgnore }

  const navigate = (id: string) => {
    setActiveSection(id)
    router.push(`/network?section=${id}`, { scroll: false })
  }

  return (
    <div className="min-h-screen bg-[#faf9f6] pb-24">
      <MainHeader />

      <div className="max-w-screen-xl mx-auto px-4 md:px-8 pt-20 md:pt-24">
        {/* Mobile tab strip */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 lg:hidden scrollbar-hide">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => navigate(item.id)}
              className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${activeSection === item.id ? 'bg-[#005d8f] text-white shadow-sm' : 'bg-white border border-[#e3e2df] text-[#404850] hover:border-[#005d8f] hover:text-[#005d8f]'}`}
            >
              {item.label}
              {item.count !== undefined && item.count > 0 && (
                <span className={`ml-1.5 text-xs ${activeSection === item.id ? 'text-white/80' : 'text-[#707881]'}`}>{item.count}</span>
              )}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* ── Left Sidebar ─────────────────────────────────────────────────── */}
          <aside className="hidden lg:block lg:col-span-3 space-y-6">
            {/* Manage network nav */}
            <div className="bg-white rounded-xl p-5 shadow-sm border border-[#e3e2df]">
              <h2 className="font-[Manrope] text-base font-bold mb-4 text-[#1b1c1a]">Manage my network</h2>
              <nav className="space-y-1">
                {navItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => navigate(item.id)}
                    className={`flex items-center justify-between w-full p-3 rounded-lg transition-colors text-left group ${activeSection === item.id ? 'bg-[#c3e0fe]/30 text-[#005d8f]' : 'hover:bg-[#f4f3f0] text-[#404850]'}`}
                  >
                    <div className="flex items-center gap-3">
                      <span className={`transition-colors ${activeSection === item.id ? 'text-[#005d8f]' : 'text-[#707881] group-hover:text-[#005d8f]'}`}>{item.icon}</span>
                      <span className="font-medium text-sm">{item.label}</span>
                    </div>
                    {item.count !== undefined && item.count > 0 && (
                      <span className={`text-xs font-bold ${activeSection === item.id ? 'text-[#005d8f]' : 'text-[#005d8f]'}`}>{item.count.toLocaleString()}</span>
                    )}
                  </button>
                ))}
              </nav>
            </div>

            {/* Quick stats */}
            <div className="bg-gradient-to-br from-[#005d8f] to-[#0077b5] rounded-xl p-5 text-white shadow-sm">
              <p className="font-[Manrope] font-bold text-sm mb-3 opacity-90">Your Network</p>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-white/80 text-xs">Connections</span>
                  <span className="font-bold text-sm">{connections.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/80 text-xs">Following</span>
                  <span className="font-bold text-sm">{following.length}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-white/80 text-xs">Followers</span>
                  <span className="font-bold text-sm">{followers.length}</span>
                </div>
              </div>
            </div>

            {/* Pending Invitations — only visible when there are pending invitations */}
            {pending.length > 0 && (
              <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-[#e3e2df]">
                <div className="px-4 py-3 border-b border-[#efeeeb] flex items-center justify-between">
                  <h3 className="text-sm font-bold text-[#1b1c1a]">Pending Invitations</h3>
                  <span className="text-xs font-semibold text-[#005d8f] bg-[#c3e0fe]/40 px-2 py-0.5 rounded-full">{pending.length}</span>
                </div>
                <div className="divide-y divide-[#efeeeb]">
                  {pending.slice(0, 2).map((req: any) => {
                    const { name, title, image } = getUserInfo(req.fromUser)
                    return (
                      <div key={req.id} className="p-4 hover:bg-[#faf9f6] transition-colors">
                        <div className="flex items-start gap-3 mb-3">
                          <Avatar name={name} image={image} size="sm" />
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm text-[#1b1c1a] truncate">{name}</p>
                            <p className="text-xs text-[#707881] truncate">{title}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleIgnore(req.id)}
                            className="flex-1 py-1.5 rounded-full border border-[#bfc7d1] text-[#404850] text-xs font-bold hover:bg-[#f4f3f0] transition"
                          >
                            Ignore
                          </button>
                          <button
                            onClick={() => handleAccept(req.id)}
                            className="flex-1 py-1.5 rounded-full bg-[#005d8f] text-white text-xs font-bold hover:bg-[#004e7a] transition active:scale-95"
                          >
                            Accept
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
                {pending.length > 2 && (
                  <button
                    onClick={() => navigate('connections')}
                    className="w-full py-2.5 text-xs font-bold text-[#005d8f] hover:bg-[#faf9f6] transition border-t border-[#efeeeb]"
                  >
                    View all ({pending.length} invitations)
                  </button>
                )}
              </div>
            )}
          </aside>

          {/* ── Main Content ──────────────────────────────────────────────────── */}
          <div className="lg:col-span-9">
            {loading ? (
              <div className="flex justify-center py-20">
                <div className="w-9 h-9 border-4 border-[#005d8f] border-t-transparent rounded-full animate-spin" />
              </div>
            ) : (
              <>
                {activeSection === 'overview' && <OverviewSection {...commonProps} suggestions={suggestions} onConnect={handleConnect} />}
                {activeSection === 'connections' && <ConnectionsSection {...commonProps} connections={connections} onRemove={handleRemove} />}
                {activeSection === 'following' && <FollowSection {...commonProps} following={following} followers={followers} onUnfollow={handleUnfollow} onConnect={handleConnect} />}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function NetworkPage() {
  return (
    <Suspense fallback={null}>
      <NetworkPageInner />
    </Suspense>
  )
}
