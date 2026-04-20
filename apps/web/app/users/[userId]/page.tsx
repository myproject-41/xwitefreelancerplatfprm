'use client'

import { useEffect, useRef, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import apiClient from '@/services/apiClient'
import { postService } from '@/services/post.service'
import { escrowService } from '@/services/escrow.service'
import { networkService } from '@/services/network.service'
import { useAuthStore } from '@/store/authStore'

/* ══════════════════════════════════════
   TYPES
══════════════════════════════════════ */
type UserRole     = 'CLIENT' | 'COMPANY' | 'FREELANCER' | 'ADMIN'
type ConnectState = 'idle' | 'loading' | 'pending' | 'connected'
type FollowState  = 'idle' | 'loading' | 'following'

interface Language      { language?: string; proficiency?: string }
interface PortfolioUrl  { label?: string; url?: string }
interface Experience    { title?: string; company?: string; from?: string; to?: string; current?: boolean; description?: string }
interface Qualification { degree?: string; institution?: string; year?: string }

interface FreelancerProfile {
  fullName?: string; title?: string; bio?: string
  coverImage?: string; profileImage?: string
  skills?: string[]; languages?: Language[]; experience?: Experience[]
  qualifications?: Qualification[]; experienceLevel?: string
  portfolioUrls?: PortfolioUrl[]; hourlyRate?: number; minBudget?: number
  currency?: string; country?: string; city?: string; timezone?: string
  availability?: boolean; noticePeriod?: string
}
interface CompanyProfile {
  companyName?: string; industry?: string; description?: string
  coverImage?: string; profileImage?: string; logoPreview?: string
  website?: string; employeeCount?: string; country?: string; city?: string
  timezone?: string; workType?: string[]; hiringSkills?: string[]
}
interface ClientProfile {
  fullName?: string; coverImage?: string; profileImage?: string
  description?: string; companyName?: string
  country?: string; city?: string; timezone?: string
  taskCategories?: string[]; workPreference?: string
}
interface PublicUser {
  id?: string; email?: string; role?: UserRole
  connectionsCount?: number; followersCount?: number
  freelancerProfile?: FreelancerProfile
  companyProfile?: CompanyProfile
  clientProfile?: ClientProfile
}
interface FollowerUser { id: string; fullName?: string; profileImage?: string; role?: string }
type UserPost = {
  id: string; title: string; type: string
  skills?: string[]; status?: string; createdAt?: string
  _count?: { proposals?: number }
}
type CompletedTask = {
  id: string; amount: number
  task: { id: string; title: string; description?: string; skills?: any; post?: { id: string; type?: string } | null }
  client: {
    id: string
    clientProfile?: { fullName?: string; profileImage?: string; companyName?: string } | null
    companyProfile?: { companyName?: string; profileImage?: string } | null
  }
}

/* ══════════════════════════════════════
   HELPERS
══════════════════════════════════════ */
function titleCase(v?: string) {
  if (!v) return ''
  return v.toLowerCase().split(/[_\s-]+/).filter(Boolean).map(p => p[0]?.toUpperCase() + p.slice(1)).join(' ')
}
function fmtRate(n?: number | null, cur = 'INR') {
  if (!n) return null
  try { return new Intl.NumberFormat('en-IN', { style: 'currency', currency: cur, minimumFractionDigits: 0 }).format(n) }
  catch { return `${cur} ${n}` }
}
function loc(...parts: Array<string | undefined>) { return parts.filter(Boolean).join(', ') }

function normalizeRouteId(v: string | string[] | undefined) {
  const raw = Array.isArray(v) ? v[0] : v
  if (!raw) return ''
  try { return decodeURIComponent(raw).trim() } catch { return raw.trim() }
}
function invalidId(v: string) { return !v || v.includes('[') || v === 'userId' }

function getRole(raw: any): UserRole | undefined {
  if (raw?.role) return raw.role
  if (raw?.freelancerProfile || raw?.hourlyRate !== undefined || raw?.portfolioUrls || raw?.title) return 'FREELANCER'
  if (raw?.companyProfile || raw?.industry || raw?.website || raw?.employeeCount || raw?.workType) return 'COMPANY'
  if (raw?.clientProfile || raw?.taskCategories || raw?.workPreference || raw?.companyName || raw?.fullName) return 'CLIENT'
}

function parseStringArray(v: any): string[] {
  if (Array.isArray(v)) return v.filter((s: any) => typeof s === 'string' && s)
  if (typeof v === 'string') { try { const p = JSON.parse(v); return Array.isArray(p) ? p.filter((s: any) => typeof s === 'string' && s) : [] } catch { return [] } }
  return []
}

function normalizeUser(raw: any): PublicUser | null {
  const b = raw?.data?.data ?? raw?.data ?? raw?.user ?? raw
  if (!b || typeof b !== 'object') return null
  const role = getRole(b)
  const fp: FreelancerProfile | undefined = b.freelancerProfile != null ? {
    ...b.freelancerProfile,
    skills: parseStringArray(b.freelancerProfile.skills ?? b.skills),
  } : (role === 'FREELANCER' ? {
    fullName: b.fullName, title: b.title, bio: b.bio, coverImage: b.coverImage, profileImage: b.profileImage,
    skills: parseStringArray(b.skills), languages: b.languages, experience: b.experience, qualifications: b.qualifications,
    experienceLevel: b.experienceLevel, portfolioUrls: b.portfolioUrls, hourlyRate: b.hourlyRate,
    minBudget: b.minBudget, currency: b.currency, country: b.country, city: b.city,
    timezone: b.timezone, availability: b.availability, noticePeriod: b.noticePeriod,
  } : undefined)
  const cp: CompanyProfile | undefined = b.companyProfile ?? (role === 'COMPANY' ? {
    companyName: b.companyName ?? b.fullName, description: b.description ?? b.bio,
    industry: b.industry, coverImage: b.coverImage, profileImage: b.profileImage ?? b.logoPreview,
    logoPreview: b.logoPreview ?? b.profileImage, website: b.website, employeeCount: b.employeeCount,
    country: b.country, city: b.city, timezone: b.timezone, workType: b.workType,
    hiringSkills: b.hiringSkills ?? b.skills,
  } : undefined)
  const cl: ClientProfile | undefined = b.clientProfile ?? (role === 'CLIENT' ? {
    fullName: b.fullName, coverImage: b.coverImage, profileImage: b.profileImage,
    description: b.description ?? b.bio, companyName: b.companyName, country: b.country,
    city: b.city, timezone: b.timezone, taskCategories: b.taskCategories ?? b.skills,
    workPreference: b.workPreference,
  } : undefined)
  return {
    id: b.id, email: b.email, role,
    connectionsCount: b.connectionsCount ?? b.connectionCount ?? 0,
    followersCount: b.followersCount ?? b._count?.followers ?? 0,
    freelancerProfile: fp, companyProfile: cp, clientProfile: cl,
  }
}

/* ══════════════════════════════════════
   CSS
══════════════════════════════════════ */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
@keyframes pp-spin{to{transform:rotate(360deg);}}
@keyframes pp-shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}
@keyframes pp-fadein{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.skel{background:linear-gradient(90deg,#e8eaed 25%,#f5f5f5 50%,#e8eaed 75%);background-size:1200px 100%;animation:pp-shimmer 1.4s ease infinite;}

/* ── cards ── */
.pp-card{background:#fff;border-radius:22px;overflow:visible;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 8px 28px rgba(0,0,0,0.09);margin-bottom:16px;border:1px solid rgba(0,0,0,0.04);animation:pp-fadein .3s ease;}
.pp-section-card{background:#fff;border-radius:18px;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 14px rgba(0,0,0,0.07);overflow:hidden;margin-bottom:16px;border:1px solid rgba(0,0,0,0.04);animation:pp-fadein .3s ease;}
.pp-section-hdr{display:flex;align-items:center;justify-content:space-between;padding:15px 20px 12px;border-bottom:1px solid #f1f5f9;border-left:3px solid #0077b5;}
.pp-section-title{font-size:14px;font-weight:700;color:#0f172a;font-family:'Inter',sans-serif;letter-spacing:-0.01em;}
.pp-section-body{padding:16px 20px 20px;}

/* ── cover + avatar — UNCHANGED ── */
.pp-cover{position:relative;border-radius:18px 18px 0 0;overflow:hidden;height:200px;}
.pp-cover img{width:100%;height:100%;object-fit:cover;object-position:center;display:block;}
.pp-cover-ph{width:100%;height:100%;background:linear-gradient(120deg,#b8cfd8 0%,#c8d9e4 30%,#d5e2e8 55%,#dce5db 80%,#e2ddd0 100%);}
.pp-below-cover{display:flex;align-items:flex-end;justify-content:space-between;padding:0 22px;margin-top:-46px;margin-bottom:16px;position:relative;z-index:20;}
.pp-avatar{position:relative;width:92px;height:92px;border-radius:16px;overflow:hidden;background:#e2e5e9;border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,0.18);flex-shrink:0;}
.pp-avatar img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;object-position:center top;display:block;}
.pp-avatar-ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#dde4ea;}
.pp-logo{position:relative;width:96px;height:96px;border-radius:16px;overflow:hidden;background:#fff;border:3px solid #fff;box-shadow:0 2px 14px rgba(0,0,0,0.16);flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.pp-logo img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;display:block;}
.pp-logo-ph{position:absolute;inset:0;display:flex;align-items:center;justify-content:center;background:#f0f4f8;}

/* ── buttons ── */
.pp-actions{display:flex;align-items:center;gap:10px;}
.pp-btn-connect{display:flex;align-items:center;gap:7px;background:linear-gradient(135deg,#0284c7,#0077b5);color:#fff;border:none;padding:11px 22px;border-radius:999px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 3px 14px rgba(0,119,181,0.38);transition:transform .15s,box-shadow .15s;}
.pp-btn-connect:hover:not(:disabled){box-shadow:0 5px 20px rgba(0,119,181,0.48);transform:translateY(-1px);}
.pp-btn-connect:active:not(:disabled){transform:scale(.96);}
.pp-btn-connect.pending{background:#f1f5f9;color:#64748b;box-shadow:none;border:1.5px solid #cbd5e1;cursor:default;}
.pp-btn-connect.connected{background:linear-gradient(135deg,#d1fae5,#dcfce7);color:#15803d;box-shadow:none;border:1.5px solid #86efac;cursor:default;}
.pp-btn-follow{display:flex;align-items:center;gap:7px;background:transparent;color:#0077b5;border:1.5px solid #0077b5;padding:10px 20px;border-radius:999px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;transition:all .15s;}
.pp-btn-follow:hover:not(:disabled):not(.following){background:#e8f4fd;transform:translateY(-1px);}
.pp-btn-follow.following{background:#f0f9ff;color:#0369a1;border-color:#bae6fd;}

/* ── profile info ── */
.pp-info{padding:4px 24px 24px;display:flex;flex-direction:column;gap:8px;}
.pp-conn-row{display:flex;align-items:center;gap:14px;flex-wrap:wrap;}
.pp-conn-count{font-size:12px;font-weight:700;color:#0077b5;display:flex;align-items:center;gap:4px;}
.pp-followers-btn{display:inline-flex;align-items:center;gap:4px;font-size:12px;font-weight:700;color:#0077b5;cursor:pointer;background:none;border:none;padding:0;font-family:'Inter',sans-serif;}
.pp-followers-btn:hover{text-decoration:underline;}
.pp-name{font-size:26px;font-weight:800;line-height:1.15;color:#0f172a;letter-spacing:-0.03em;font-family:'Inter',sans-serif;}
.pp-subtitle{font-size:14px;font-weight:600;color:#0077b5;margin-top:2px;}
.pp-level{color:#475569;font-weight:700;}
.pp-location{font-size:12px;color:#94a3b8;display:flex;align-items:center;gap:3px;margin-top:2px;}
.pp-bio{font-size:14px;color:#475569;line-height:1.75;}
.pp-avail{display:inline-flex;align-items:center;gap:5px;padding:5px 13px;border-radius:999px;font-size:11px;font-weight:800;border:1.5px solid;}
.pp-avail.on{background:#d1fae5;color:#065f46;border-color:#6ee7b7;}
.pp-avail.off{background:#f1f5f9;color:#64748b;border-color:#cbd5e1;}
.pp-avail-dot{width:7px;height:7px;border-radius:50%;background:currentColor;}
.pp-tags{display:flex;flex-wrap:wrap;gap:6px;list-style:none;}
.pp-tag{background:linear-gradient(135deg,#e0f2fe,#dbeffe);color:#0369a1;padding:5px 13px;border-radius:999px;font-size:10.5px;font-weight:700;letter-spacing:.03em;text-transform:uppercase;border:1px solid #bae6fd;}
.pp-rates-row{display:flex;flex-wrap:wrap;gap:8px;}
.pp-rate-chip{display:flex;flex-direction:column;gap:2px;background:linear-gradient(135deg,#f8fafc,#f0f9ff);border:1px solid #bae6fd;padding:8px 14px;border-radius:12px;}
.pp-rate-lbl{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#64748b;}
.pp-rate-val{font-size:15px;font-weight:800;color:#0f172a;}
.pp-portfolio-link{display:flex;align-items:center;gap:8px;color:#0077b5;text-decoration:none;font-size:13px;font-weight:600;padding:9px 14px;background:linear-gradient(135deg,#f0f9ff,#e8f4fd);border-radius:12px;border:1px solid #bae6fd;transition:all .15s;}
.pp-portfolio-link:hover{background:linear-gradient(135deg,#e8f4fd,#dbeffe);transform:translateY(-1px);}

/* ── company ── */
.pp-company-name{font-size:28px;font-weight:800;line-height:1.15;color:#0f172a;letter-spacing:-0.03em;}
.pp-industry{font-size:14px;font-weight:600;color:#0077b5;margin-top:3px;display:flex;align-items:center;gap:5px;}
.pp-badges-row{display:flex;flex-wrap:wrap;gap:7px;align-items:center;}
.pp-badge{display:inline-flex;align-items:center;gap:4px;padding:5px 12px;border-radius:999px;font-size:11px;font-weight:600;}
.pp-badge-emp{background:#eff6ff;color:#0369a1;border:1px solid #bae6fd;}
.pp-badge-web{background:#f8fafc;color:#0077b5;border:1px solid #e2e8f0;text-decoration:none;}
.pp-badge-web:hover{background:#e8f4fd;}
.pp-description{font-size:14px;color:#475569;line-height:1.75;}
.pp-detail-row{display:flex;align-items:baseline;justify-content:space-between;padding:11px 0;border-bottom:1px solid #f8fafc;gap:12px;}
.pp-detail-row:last-child{border-bottom:none;}
.pp-detail-lbl{font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;white-space:nowrap;flex-shrink:0;}
.pp-detail-val{font-size:14px;font-weight:500;color:#0f172a;text-align:right;}
.pp-detail-link{font-size:14px;font-weight:500;color:#0077b5;text-align:right;text-decoration:none;}
.pp-detail-link:hover{text-decoration:underline;}
.pp-skill-chip{padding:7px 15px;border-radius:999px;background:linear-gradient(135deg,#eff6ff,#e0f2fe);color:#0369a1;font-size:13px;font-weight:600;border:1px solid #bae6fd;}

/* ── timeline ── */
.pp-timeline{display:flex;flex-direction:column;gap:18px;}
.pp-tl-item{display:flex;gap:14px;align-items:flex-start;}
.pp-tl-dot{width:10px;height:10px;border-radius:50%;background:#0077b5;flex-shrink:0;margin-top:5px;box-shadow:0 0 0 3px rgba(0,119,181,0.15);}
.pp-tl-body{flex:1;min-width:0;}
.pp-tl-title{font-size:14px;font-weight:700;color:#0f172a;}
.pp-tl-sub{font-size:12px;color:#64748b;margin-top:3px;}
.pp-tl-desc{font-size:13px;color:#475569;line-height:1.65;margin-top:6px;}

/* ── lang chips ── */
.pp-lang{display:inline-flex;align-items:center;gap:6px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:8px 14px;}
.pp-lang-name{font-size:13px;font-weight:700;color:#0f172a;}
.pp-lang-prof{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;background:linear-gradient(135deg,#dbeffe,#e0f2fe);color:#0369a1;padding:2px 8px;border-radius:999px;}

/* ── client detail grid ── */
.pp-detail-grid{display:grid;gap:10px;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));}
.pp-detail-box{padding:14px 16px;border-radius:14px;background:linear-gradient(135deg,#f8fafc,#f0f9ff);border:1px solid #e2e8f0;}
.pp-detail-box-lbl{font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:.06em;}
.pp-detail-box-val{font-size:14px;font-weight:700;color:#0f172a;margin-top:6px;}

/* ── spinners ── */
.pp-spin{width:15px;height:15px;border-radius:50%;border:2.5px solid rgba(255,255,255,0.3);border-top-color:#fff;animation:pp-spin .7s linear infinite;display:inline-block;flex-shrink:0;}
.pp-spin-blue{width:15px;height:15px;border-radius:50%;border:2.5px solid rgba(0,119,181,0.2);border-top-color:#0077b5;animation:pp-spin .7s linear infinite;display:inline-block;flex-shrink:0;}

/* ── followers drawer ── */
.pp-overlay{position:fixed;inset:0;z-index:900;background:rgba(15,23,42,0.5);backdrop-filter:blur(4px);}
.pp-drawer{position:fixed;top:0;left:0;bottom:0;z-index:901;width:340px;max-width:92vw;background:#fff;box-shadow:8px 0 40px rgba(0,0,0,0.15);display:flex;flex-direction:column;}
@keyframes pp-slide-in{from{transform:translateX(-100%)}to{transform:translateX(0)}}
.pp-drawer{animation:pp-slide-in .22s cubic-bezier(.4,0,.2,1);}
.pp-drawer-hdr{display:flex;align-items:center;justify-content:space-between;padding:18px 20px 14px;border-bottom:1px solid #f1f5f9;flex-shrink:0;}
.pp-drawer-title{font-size:16px;font-weight:700;color:#0f172a;font-family:'Inter',sans-serif;}
.pp-drawer-close{width:34px;height:34px;border-radius:50%;border:1.5px solid #e2e8f0;background:#fff;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:background .15s;}
.pp-drawer-close:hover{background:#f8fafc;}
.pp-drawer-body{flex:1;overflow-y:auto;padding:8px 12px;}
.pp-fw-item{display:flex;align-items:center;gap:12px;padding:10px 8px;border-radius:12px;transition:background .15s;}
.pp-fw-item:hover{background:#f8fafc;}
.pp-fw-avatar{width:44px;height:44px;border-radius:12px;overflow:hidden;background:#e8edf3;flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.pp-fw-avatar img{width:100%;height:100%;object-fit:cover;}
.pp-fw-name{font-size:14px;font-weight:600;color:#0f172a;}
.pp-fw-role{font-size:11px;color:#94a3b8;margin-top:2px;}
`

/* ══════════════════════════════════════
   SHARED SUB-COMPONENTS
══════════════════════════════════════ */
function Spin({ blue = false }) {
  return <span className={blue ? 'pp-spin-blue' : 'pp-spin'} />
}

function ConnectBtn({ state, onClick }: { state: ConnectState; onClick: () => void }) {
  return (
    <button
      className={`pp-btn-connect${state === 'pending' ? ' pending' : state === 'connected' ? ' connected' : ''}`}
      onClick={onClick}
      disabled={state !== 'idle'}
    >
      {state === 'loading' ? <Spin /> :
       state === 'pending'  ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M17 12h-5v5h5v-5zM16 1v2H8V1H6v2H5c-1.11 0-1.99.9-1.99 2L3 19c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2h-1V1h-2zm3 18H5V8h14v11z"/></svg>Pending</> :
       state === 'connected'? <><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>Connected</> :
       <><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M15 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm-9-2V7H4v3H1v2h3v3h2v-3h3v-2H6zm9 4c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>Connect</>
      }
    </button>
  )
}

const POST_COLORS: Record<string, { bg: string; text: string }> = {
  JOB:            { bg: '#dbeafe', text: '#1e40af' },
  TASK:           { bg: '#dcfce7', text: '#166534' },
  COLLAB:         { bg: '#fef9c3', text: '#854d0e' },
  SKILL_EXCHANGE: { bg: '#fae8ff', text: '#7e22ce' },
}

function PostsCarousel({ posts }: { posts: UserPost[] }) {
  const ref = useRef<HTMLDivElement>(null)
  if (!posts.length) return null
  const scroll = (d: 'left' | 'right') => ref.current?.scrollBy({ left: d === 'right' ? 260 : -260, behavior: 'smooth' })
  return (
    <div className="pp-section-card">
      <div className="pp-section-hdr">
        <h3 className="pp-section-title">Posts</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['left', 'right'] as const).map(d => (
            <button key={d} onClick={() => scroll(d)}
              style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 16 }}>
              {d === 'left' ? '‹' : '›'}
            </button>
          ))}
        </div>
      </div>
      <div className="pp-section-body">
        <div ref={ref} style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', paddingBottom: 4 }}>
          {posts.map(p => {
            const col = POST_COLORS[p.type] ?? { bg: '#f1f5f9', text: '#475569' }
            return (
              <div key={p.id} style={{ flex: '0 0 230px', scrollSnapAlign: 'start', borderRadius: 14, border: '1px solid #e2e8f0', background: '#f8fbfe', padding: 14, display: 'flex', flexDirection: 'column', gap: 9 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 6 }}>
                  <span style={{ ...col, padding: '3px 9px', borderRadius: 999, fontSize: 10, fontWeight: 700, textTransform: 'uppercase' as const }}>{p.type?.replace('_', ' ')}</span>
                  {p._count?.proposals != null && <span style={{ fontSize: 10, color: '#64748b', fontWeight: 600 }}>{p._count.proposals} proposals</span>}
                </div>
                <p style={{ fontWeight: 700, fontSize: 13, lineHeight: 1.4, color: '#0f172a' }}>{p.title}</p>
                {p.skills?.length ? (
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {p.skills.slice(0, 3).map(s => <span key={s} style={{ padding: '2px 8px', borderRadius: 999, background: '#eff6ff', color: '#1d4f73', fontSize: 10, fontWeight: 600 }}>{s}</span>)}
                    {p.skills.length > 3 && <span style={{ padding: '2px 8px', borderRadius: 999, background: '#f1f5f9', color: '#64748b', fontSize: 10, fontWeight: 600 }}>+{p.skills.length - 3}</span>}
                  </div>
                ) : null}
                {p.status && <span style={{ marginTop: 'auto', fontSize: 10, color: p.status === 'OPEN' ? '#16a34a' : '#64748b', fontWeight: 700 }}>{p.status}</span>}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function CompletedTasksCarousel({ tasks, onNavigate }: { tasks: CompletedTask[]; onNavigate: (postId: string) => void }) {
  const ref = useRef<HTMLDivElement>(null)
  if (!tasks.length) return null
  const scroll = (d: 'left' | 'right') => ref.current?.scrollBy({ left: d === 'right' ? 260 : -260, behavior: 'smooth' })
  return (
    <div className="pp-section-card">
      <div className="pp-section-hdr">
        <h3 className="pp-section-title">Completed Tasks</h3>
        <div style={{ display: 'flex', gap: 6 }}>
          {(['left', 'right'] as const).map(d => (
            <button key={d} onClick={() => scroll(d)}
              style={{ width: 30, height: 30, borderRadius: '50%', border: '1px solid #e2e8f0', background: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#475569', fontSize: 16 }}>
              {d === 'left' ? '‹' : '›'}
            </button>
          ))}
        </div>
      </div>
      <div className="pp-section-body">
        <div ref={ref} style={{ display: 'flex', gap: 12, overflowX: 'auto', scrollSnapType: 'x mandatory', scrollbarWidth: 'none', paddingBottom: 4 }}>
          {tasks.map(t => {
            const clientName = t.client?.clientProfile?.fullName ?? t.client?.companyProfile?.companyName ?? 'Client'
            const skills = Array.isArray(t.task?.skills) ? t.task.skills : []
            const postId = t.task?.post?.id
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
                      onClick={() => onNavigate(postId)}
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
}

function FollowersDrawer({ open, onClose, companyName, followers, loading }: {
  open: boolean; onClose: () => void; companyName?: string; followers: FollowerUser[]; loading: boolean
}) {
  if (!open) return null
  return (
    <>
      <div className="pp-overlay" onClick={onClose} />
      <div className="pp-drawer">
        <div className="pp-drawer-hdr">
          <p className="pp-drawer-title">{companyName ? `${companyName} · ` : ''}Followers</p>
          <button className="pp-drawer-close" onClick={onClose}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="#94a3b8"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>
          </button>
        </div>
        <div className="pp-drawer-body">
          {loading ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '8px 0' }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div className="skel" style={{ width: 44, height: 44, borderRadius: 11, flexShrink: 0 }} />
                  <div style={{ flex: 1 }}>
                    <div className="skel" style={{ height: 12, width: '55%', borderRadius: 6, marginBottom: 6 }} />
                    <div className="skel" style={{ height: 10, width: '35%', borderRadius: 6 }} />
                  </div>
                </div>
              ))}
            </div>
          ) : followers.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center' }}>
              <svg width="44" height="44" viewBox="0 0 24 24" fill="#e2e8f0" style={{ marginBottom: 10, display: 'block', margin: '0 auto 10px' }}><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
              <p style={{ fontSize: 14, fontWeight: 600, color: '#94a3b8' }}>No followers yet</p>
            </div>
          ) : (
            followers.map(f => (
              <div key={f.id} className="pp-fw-item">
                <div className="pp-fw-avatar">
                  {f.profileImage ? <img src={f.profileImage} alt={f.fullName} /> :
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="#94a3b8"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
                  }
                </div>
                <div>
                  <p className="pp-fw-name">{f.fullName || 'User'}</p>
                  <p className="pp-fw-role">{titleCase(f.role ?? '')}</p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  )
}

/* ══════════════════════════════════════
   FREELANCER PUBLIC VIEW
══════════════════════════════════════ */
function FreelancerView({ profile, posts, completedTasks, connectState, connectionsCount, onConnect, onNavigatePost }: {
  profile: FreelancerProfile; posts: UserPost[]; completedTasks: CompletedTask[]
  connectState: ConnectState; connectionsCount: number; onConnect: () => void
  onNavigatePost: (postId: string) => void
}) {
  const location = loc(profile.city, profile.country)
  const languages = (profile.languages ?? []).filter((l: any) => l.language)
  const portfolioLinks = (profile.portfolioUrls ?? []).filter((p: any) => p.url)
  const experience = profile.experience ?? []
  const qualifications = profile.qualifications ?? []
  const hourlyFmt = fmtRate(profile.hourlyRate, profile.currency)
  const minFmt = fmtRate(profile.minBudget, profile.currency)

  return (
    <>
      <div className="pp-card">
        <div className="pp-cover">
          {profile.coverImage ? <img src={profile.coverImage} alt="Cover" /> : <div className="pp-cover-ph" />}
        </div>
        <div className="pp-below-cover">
          <div className="pp-avatar">
            {profile.profileImage
              ? <img src={profile.profileImage} alt={profile.fullName} />
              : <div className="pp-avatar-ph"><svg width="32" height="32" viewBox="0 0 24 24" fill="#94a3b8"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>
            }
          </div>
          <ConnectBtn state={connectState} onClick={onConnect} />
        </div>
        <div className="pp-info">
          <p className="pp-conn-count">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#0077b5"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            {connectionsCount.toLocaleString()} connections
          </p>
          <div>
            <h1 className="pp-name">{profile.fullName || 'Freelancer'}</h1>
            {profile.title && <p className="pp-subtitle">{profile.experienceLevel && <span className="pp-level">{profile.experienceLevel} · </span>}{profile.title}</p>}
            {location && <p className="pp-location"><svg width="12" height="12" viewBox="0 0 24 24" fill="#94a3b8"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>{location}</p>}
          </div>
          {typeof profile.availability === 'boolean' && (
            <span className={`pp-avail ${profile.availability ? 'on' : 'off'}`}>
              <span className="pp-avail-dot" />
              {profile.availability ? 'Available Now' : (profile.noticePeriod ?? 'Unavailable').replace(/_/g, ' ')}
            </span>
          )}
          {profile.bio && <p className="pp-bio">{profile.bio}</p>}
          {(profile.skills ?? []).length > 0 && (
            <ul className="pp-tags">
              {profile.skills!.map(s => <li key={s} className="pp-tag">{s}</li>)}
            </ul>
          )}
          {(hourlyFmt || minFmt) && (
            <div className="pp-rates-row">
              {hourlyFmt && <div className="pp-rate-chip"><span className="pp-rate-lbl">Hourly</span><span className="pp-rate-val">{hourlyFmt}/hr</span></div>}
              {minFmt && <div className="pp-rate-chip"><span className="pp-rate-lbl">Min. Project</span><span className="pp-rate-val">{minFmt}</span></div>}
            </div>
          )}
          {portfolioLinks.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {portfolioLinks.map((p: any, i: number) => (
                <a key={i} href={p.url} target="_blank" rel="noopener noreferrer" className="pp-portfolio-link">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="#0077b5"><path d="M3.9 12c0-1.71 1.39-3.1 3.1-3.1h4V7H7c-2.76 0-5 2.24-5 5s2.24 5 5 5h4v-1.9H7c-1.71 0-3.1-1.39-3.1-3.1zM8 13h8v-2H8v2zm9-6h-4v1.9h4c1.71 0 3.1 1.39 3.1 3.1s-1.39 3.1-3.1 3.1h-4V17h4c2.76 0 5-2.24 5-5s-2.24-5-5-5z"/></svg>
                  <span>{p.label || p.url}</span>
                </a>
              ))}
            </div>
          )}
        </div>
      </div>

      {languages.length > 0 && (
        <div className="pp-section-card">
          <div className="pp-section-hdr"><h3 className="pp-section-title">Languages</h3></div>
          <div className="pp-section-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {languages.map((l: any, i: number) => (
              <div key={i} className="pp-lang"><span className="pp-lang-name">{l.language}</span>{l.proficiency && <span className="pp-lang-prof">{l.proficiency}</span>}</div>
            ))}
          </div>
        </div>
      )}

      {experience.length > 0 && (
        <div className="pp-section-card">
          <div className="pp-section-hdr"><h3 className="pp-section-title">Experience</h3></div>
          <div className="pp-section-body"><div className="pp-timeline">
            {experience.map((e: any, i: number) => {
              const roleLabel = e.title ?? e.role ?? ''
              const from = e.from ?? e.startDate ?? ''
              const to   = e.to   ?? e.endDate   ?? ''
              return (
                <div key={i} className="pp-tl-item">
                  <div className="pp-tl-dot" />
                  <div className="pp-tl-body">
                    {roleLabel && <p className="pp-tl-title">{roleLabel}</p>}
                    <p className="pp-tl-sub">{[e.company, from, e.current ? 'Present' : to].filter(Boolean).join(' · ')}</p>
                    {e.description && <p className="pp-tl-desc">{e.description}</p>}
                  </div>
                </div>
              )
            })}
          </div></div>
        </div>
      )}

      {qualifications.length > 0 && (
        <div className="pp-section-card">
          <div className="pp-section-hdr"><h3 className="pp-section-title">Qualifications</h3></div>
          <div className="pp-section-body"><div className="pp-timeline">
            {qualifications.map((q: any, i: number) => (
              <div key={i} className="pp-tl-item">
                <div className="pp-tl-dot" />
                <div className="pp-tl-body">
                  <p className="pp-tl-title">{q.degree || 'Qualification'}</p>
                  <p className="pp-tl-sub">{[q.institution, q.year].filter(Boolean).join(' · ')}</p>
                </div>
              </div>
            ))}
          </div></div>
        </div>
      )}

      {connectState === 'connected'
        ? <PostsCarousel posts={posts} />
        : posts.length > 0
          ? (
            <div className="pp-section-card">
              <div className="pp-section-hdr"><h3 className="pp-section-title">Posts</h3></div>
              <div className="pp-section-body" style={{ textAlign: 'center', padding: '28px 18px', color: '#64748b', fontSize: 13, fontWeight: 500 }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#cbd5e1" style={{ marginBottom: 8, display: 'block', margin: '0 auto 8px' }}><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z"/></svg>
                Connect with this freelancer to see their posts
              </div>
            </div>
          )
          : null
      }
      <CompletedTasksCarousel tasks={completedTasks} onNavigate={onNavigatePost} />
    </>
  )
}

/* ══════════════════════════════════════
   COMPANY PUBLIC VIEW
══════════════════════════════════════ */
function CompanyView({ profile, posts, connectState, followState, connectionsCount, followersCount, onConnect, onFollow, onOpenFollowers }: {
  profile: CompanyProfile; posts: UserPost[]
  connectState: ConnectState; followState: FollowState
  connectionsCount: number; followersCount: number
  onConnect: () => void; onFollow: () => void; onOpenFollowers: () => void
}) {
  const location = loc(profile.city, profile.country)
  const skills = profile.hiringSkills?.length ? profile.hiringSkills : (profile.workType ?? [])
  const details = [
    { label: 'Industry',  value: profile.industry || null },
    { label: 'Team Size', value: profile.employeeCount ? `${profile.employeeCount} employees` : null },
    { label: 'Location',  value: location || null },
    { label: 'Website',   value: profile.website || null },
    { label: 'Timezone',  value: profile.timezone || null },
  ].filter(r => r.value)

  return (
    <>
      <div className="pp-card">
        <div className="pp-cover">
          {profile.coverImage ? <img src={profile.coverImage} alt="Cover" /> : <div className="pp-cover-ph" />}
        </div>
        <div className="pp-below-cover">
          <div className="pp-logo">
            {profile.profileImage || profile.logoPreview
              ? <img src={profile.profileImage ?? profile.logoPreview} alt={profile.companyName} />
              : <div className="pp-logo-ph"><svg width="32" height="32" viewBox="0 0 24 24" fill="#94a3b8"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg></div>
            }
          </div>
          <div className="pp-actions">
            <ConnectBtn state={connectState} onClick={onConnect} />
            <button className={`pp-btn-follow${followState === 'following' ? ' following' : ''}`} onClick={onFollow} disabled={followState === 'loading'}>
              {followState === 'loading' ? <Spin blue /> :
               followState === 'following' ? <><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>Following</> :
               <><svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>Follow</>
              }
            </button>
          </div>
        </div>

        <div className="pp-info">
          <div className="pp-conn-row">
            <p className="pp-conn-count">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="#0077b5"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
              {connectionsCount.toLocaleString()} connections
            </p>
            <button className="pp-followers-btn" onClick={onOpenFollowers}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="#0077b5"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg>
              {followersCount.toLocaleString()} followers
            </button>
          </div>
          <div>
            <h1 className="pp-company-name">{profile.companyName || 'Company'}</h1>
            {profile.industry && <p className="pp-industry"><svg width="13" height="13" viewBox="0 0 24 24" fill="#94a3b8"><path d="M12 7V3H2v18h20V7H12zM6 19H4v-2h2v2zm0-4H4v-2h2v2zm0-4H4V9h2v2zm0-4H4V5h2v2zm4 12H8v-2h2v2zm0-4H8v-2h2v2zm0-4H8V9h2v2zm0-4H8V5h2v2zm10 12h-8v-2h2v-2h-2v-2h2v-2h-2V9h8v10zm-2-8h-2v2h2v-2zm0 4h-2v2h2v-2z"/></svg>{profile.industry}</p>}
            {location && <p className="pp-location"><svg width="12" height="12" viewBox="0 0 24 24" fill="#94a3b8"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>{location}</p>}
          </div>
          <div className="pp-badges-row">
            {profile.employeeCount && <span className="pp-badge pp-badge-emp"><svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>{profile.employeeCount} employees</span>}
            {profile.website && (
              <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="pp-badge pp-badge-web">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zm6.93 6h-2.95c-.32-1.25-.78-2.45-1.38-3.56 1.84.63 3.37 1.91 4.33 3.56zM12 4.04c.83 1.2 1.48 2.53 1.91 3.96h-3.82c.43-1.43 1.08-2.76 1.91-3.96zM4.26 14C4.1 13.36 4 12.69 4 12s.1-1.36.26-2h3.38c-.08.66-.14 1.32-.14 2s.06 1.34.14 2H4.26zm.82 2h2.95c.32 1.25.78 2.45 1.38 3.56-1.84-.63-3.37-1.9-4.33-3.56zm2.95-8H5.08c.96-1.66 2.49-2.93 4.33-3.56C8.81 5.55 8.35 6.75 8.03 8zM12 19.96c-.83-1.2-1.48-2.53-1.91-3.96h3.82c-.43 1.43-1.08 2.76-1.91 3.96zM14.34 14H9.66c-.09-.65-.16-1.32-.16-2s.07-1.35.16-2h4.68c.09.65.16 1.32.16 2s-.07 1.35-.16 2zm.25 5.56c.6-1.11 1.06-2.31 1.38-3.56h2.95c-.96 1.65-2.49 2.93-4.33 3.56zM16.36 14c.08-.66.14-1.32.14-2s-.06-1.34-.14-2h3.38c.16.64.26 1.31.26 2s-.1 1.36-.26 2h-3.38z"/></svg>
                {profile.website.replace(/^https?:\/\//, '').replace(/\/$/, '')}
              </a>
            )}
          </div>
          {profile.description && <p className="pp-description">{profile.description}</p>}
        </div>
      </div>

      {details.length > 0 && (
        <div className="pp-section-card">
          <div className="pp-section-hdr"><h3 className="pp-section-title">Company Details</h3></div>
          <div className="pp-section-body">
            {details.map(row => (
              <div key={row.label} className="pp-detail-row">
                <span className="pp-detail-lbl">{row.label}</span>
                {row.label === 'Website'
                  ? <a href={row.value!.startsWith('http') ? row.value! : `https://${row.value}`} target="_blank" rel="noopener noreferrer" className="pp-detail-link">{row.value!.replace(/^https?:\/\//, '')}</a>
                  : <span className="pp-detail-val">{row.value}</span>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {skills.length > 0 && (
        <div className="pp-section-card">
          <div className="pp-section-hdr"><h3 className="pp-section-title">Hiring Focus</h3></div>
          <div className="pp-section-body" style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {skills.filter(Boolean).map(s => <span key={s} className="pp-skill-chip">{s}</span>)}
          </div>
        </div>
      )}

      <PostsCarousel posts={posts} />
    </>
  )
}

/* ══════════════════════════════════════
   CLIENT PUBLIC VIEW
══════════════════════════════════════ */
function ClientView({ profile, posts, connectState, connectionsCount, onConnect }: {
  profile: ClientProfile; posts: UserPost[]
  connectState: ConnectState; connectionsCount: number; onConnect: () => void
}) {
  const location = loc(profile.city, profile.country)
  return (
    <>
      <div className="pp-card">
        <div className="pp-cover">
          {profile.coverImage ? <img src={profile.coverImage} alt="Cover" /> : <div className="pp-cover-ph" />}
        </div>
        <div className="pp-below-cover">
          <div className="pp-avatar">
            {profile.profileImage
              ? <img src={profile.profileImage} alt={profile.fullName} />
              : <div className="pp-avatar-ph"><svg width="32" height="32" viewBox="0 0 24 24" fill="#94a3b8"><path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/></svg></div>
            }
          </div>
          <ConnectBtn state={connectState} onClick={onConnect} />
        </div>
        <div className="pp-info">
          <p className="pp-conn-count">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="#0077b5"><path d="M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z"/></svg>
            {connectionsCount.toLocaleString()} connections
          </p>
          <div>
            <h1 className="pp-name">{profile.fullName || 'Client'}</h1>
            {profile.companyName && <p className="pp-subtitle">{profile.companyName}</p>}
            {location && <p className="pp-location"><svg width="12" height="12" viewBox="0 0 24 24" fill="#94a3b8"><path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/></svg>{location}</p>}
          </div>
          {profile.description && <p className="pp-bio">{profile.description}</p>}
          {(profile.taskCategories ?? []).length > 0 && (
            <ul className="pp-tags">{profile.taskCategories!.map(s => <li key={s} className="pp-tag">{s}</li>)}</ul>
          )}
        </div>
      </div>

      {(profile.workPreference || profile.timezone || location) && (
        <div className="pp-section-card">
          <div className="pp-section-hdr"><h3 className="pp-section-title">Client Details</h3></div>
          <div className="pp-section-body">
            <div className="pp-detail-grid">
              {profile.workPreference && <div className="pp-detail-box"><p className="pp-detail-box-lbl">Work Preference</p><p className="pp-detail-box-val">{titleCase(profile.workPreference)}</p></div>}
              {profile.timezone && <div className="pp-detail-box"><p className="pp-detail-box-lbl">Timezone</p><p className="pp-detail-box-val">{profile.timezone}</p></div>}
              {location && <div className="pp-detail-box"><p className="pp-detail-box-lbl">Location</p><p className="pp-detail-box-val">{location}</p></div>}
            </div>
          </div>
        </div>
      )}

      <PostsCarousel posts={posts} />
    </>
  )
}

/* ══════════════════════════════════════
   PAGE SKELETON
══════════════════════════════════════ */
function PageSkeleton() {
  return (
    <div style={{ maxWidth: 860, margin: '0 auto' }}>
      <div style={{ background: '#fff', borderRadius: 20, overflow: 'hidden', boxShadow: '0 2px 20px rgba(0,0,0,0.08)', marginBottom: 14 }}>
        <div className="skel" style={{ height: 200 }} />
        <div style={{ padding: '0 22px 24px' }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: -46, marginBottom: 16 }}>
            <div className="skel" style={{ width: 92, height: 92, borderRadius: 16, border: '3px solid #fff', flexShrink: 0 }} />
            <div className="skel" style={{ width: 100, height: 40, borderRadius: 999 }} />
          </div>
          <div className="skel" style={{ height: 12, width: 130, borderRadius: 6, marginBottom: 12 }} />
          <div className="skel" style={{ height: 26, width: '48%', borderRadius: 8, marginBottom: 8 }} />
          <div className="skel" style={{ height: 13, width: '32%', borderRadius: 6, marginBottom: 10 }} />
          <div className="skel" style={{ height: 13, width: '85%', borderRadius: 6, marginBottom: 5 }} />
          <div className="skel" style={{ height: 13, width: '70%', borderRadius: 6 }} />
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════ */
export default function PublicProfilePage() {
  const params  = useParams()
  const router  = useRouter()
  const { user } = useAuthStore()

  const userId = normalizeRouteId(params.userId)

  const [profile,          setProfile]          = useState<PublicUser | null>(null)
  const [posts,            setPosts]            = useState<UserPost[]>([])
  const [completedTasks,   setCompletedTasks]   = useState<CompletedTask[]>([])
  const [loading,          setLoading]          = useState(true)
  const [error,            setError]            = useState('')
  const [connectState,     setConnectState]     = useState<ConnectState>('idle')
  const [followState,      setFollowState]      = useState<FollowState>('idle')
  const [followersOpen,    setFollowersOpen]    = useState(false)
  const [followersList,    setFollowersList]    = useState<FollowerUser[]>([])
  const [followersLoading, setFollowersLoading] = useState(false)
  const [followersCount,   setFollowersCount]   = useState(0)

  /* ── Load profile + posts ── */
  useEffect(() => {
    let ignore = false

    async function load(id: string) {
      setLoading(true)
      setError('')

      const [pRes, postsRes, tasksRes] = await Promise.allSettled([
        apiClient.get(`/api/users/public/${id}`),
        postService.getUserPosts(id),
        escrowService.getFreelancerCompletedTasks(id),
      ])

      if (ignore) return

      if (pRes.status === 'fulfilled') {
        const norm = normalizeUser(pRes.value)
        if (!norm) { setError('User not found') }
        else {
          setProfile(norm)
          setFollowersCount(norm.followersCount ?? 0)
          if (user) checkNetworkStatus(id)
        }
      } else {
        setError((pRes.reason as any)?.response?.data?.message || 'Failed to load profile')
      }

      if (postsRes.status === 'fulfilled') setPosts(postsRes.value?.data ?? [])
      if (tasksRes.status === 'fulfilled') setCompletedTasks(tasksRes.value?.data ?? [])
      if (!ignore) setLoading(false)
    }

    if (invalidId(userId)) { setError('Invalid profile link'); setLoading(false); return () => { ignore = true } }
    if (user?.id === userId) { router.replace('/profile'); return () => { ignore = true } }

    load(userId)
    return () => { ignore = true }
  }, [userId, user?.id])

  /* ── Check connection + follow status ── */
  async function checkNetworkStatus(id: string) {
    try {
      const [connRes, followRes] = await Promise.allSettled([
        apiClient.get(`/api/network/status/${id}`),
        networkService.getFollowing(),
      ])
      if (connRes.status === 'fulfilled') {
        const c = connRes.value?.data
        if (c?.status === 'ACCEPTED') setConnectState('connected')
        else if (c?.status === 'PENDING') setConnectState('pending')
        else setConnectState('idle')
      }
      if (followRes.status === 'fulfilled') {
        const list = followRes.value?.data ?? followRes.value ?? []
        const isFollowing = Array.isArray(list) && list.some((f: any) => f.followingId === id || f.following?.id === id)
        if (isFollowing) setFollowState('following')
      }
    } catch { /* unauthenticated — skip */ }
  }

  /* ── Connect ── */
  async function handleConnect() {
    if (!profile?.id || connectState !== 'idle') return
    setConnectState('loading')
    try {
      await networkService.sendRequest(profile.id)
      setConnectState('pending')
    } catch { setConnectState('idle') }
  }

  /* ── Follow / Unfollow ── */
  async function handleFollow() {
    if (!profile?.id || followState === 'loading') return
    const wasFollowing = followState === 'following'
    setFollowState('loading')
    try {
      if (wasFollowing) {
        await networkService.unfollow(profile.id)
        setFollowState('idle')
        setFollowersCount(c => Math.max(0, c - 1))
      } else {
        await networkService.follow(profile.id)
        setFollowState('following')
        setFollowersCount(c => c + 1)
      }
    } catch { setFollowState(wasFollowing ? 'following' : 'idle') }
  }

  /* ── Open followers drawer ── */
  async function handleOpenFollowers() {
    setFollowersOpen(true)
    if (followersList.length > 0) return
    setFollowersLoading(true)
    try {
      const res = await apiClient.get('/api/network/followers', { params: { userId: profile?.id } })
      const data = res.data?.data ?? res.data ?? []
      const list: FollowerUser[] = (Array.isArray(data) ? data : []).map((f: any) => {
        const u = f.follower ?? f.fromUser ?? f.user ?? f
        const fp = u?.freelancerProfile; const cp = u?.companyProfile; const cl = u?.clientProfile
        return {
          id: u?.id ?? f.followerId ?? String(Math.random()),
          fullName: fp?.fullName ?? cp?.companyName ?? cl?.fullName ?? u?.fullName ?? u?.email ?? 'User',
          profileImage: fp?.profileImage ?? cp?.profileImage ?? cl?.profileImage ?? null,
          role: u?.role ?? '',
        }
      })
      setFollowersList(list)
    } catch { setFollowersList([]) }
    finally { setFollowersLoading(false) }
  }

  /* ── Render ── */
  return (
    <div style={{ minHeight: '100vh', background: '#f1f5f9', fontFamily: "'Inter', sans-serif", paddingBottom: 60 }}>
      <style>{STYLES}</style>

      {loading ? (
        <div style={{ padding: '28px 16px' }}><PageSkeleton /></div>
      ) : error ? (
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 16px' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 2px 20px rgba(0,0,0,0.08)' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0D1B2A' }}>Unable to open profile</h1>
            <p style={{ marginTop: 8, color: '#64748b' }}>{error}</p>
          </div>
        </div>
      ) : profile ? (
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 16px' }}>
          {profile.role === 'FREELANCER' && profile.freelancerProfile && (
            <FreelancerView
              profile={profile.freelancerProfile}
              posts={posts}
              completedTasks={completedTasks}
              connectState={connectState}
              connectionsCount={profile.connectionsCount ?? 0}
              onConnect={handleConnect}
              onNavigatePost={(postId) => router.push(`/posts/${postId}`)}
            />
          )}

          {profile.role === 'COMPANY' && profile.companyProfile && (
            <>
              <CompanyView
                profile={profile.companyProfile}
                posts={posts}
                connectState={connectState}
                followState={followState}
                connectionsCount={profile.connectionsCount ?? 0}
                followersCount={followersCount}
                onConnect={handleConnect}
                onFollow={handleFollow}
                onOpenFollowers={handleOpenFollowers}
              />
              <FollowersDrawer
                open={followersOpen}
                onClose={() => setFollowersOpen(false)}
                companyName={profile.companyProfile.companyName}
                followers={followersList}
                loading={followersLoading}
              />
            </>
          )}

          {profile.role === 'CLIENT' && profile.clientProfile && (
            <ClientView
              profile={profile.clientProfile}
              posts={posts}
              connectState={connectState}
              connectionsCount={profile.connectionsCount ?? 0}
              onConnect={handleConnect}
            />
          )}
        </div>
      ) : (
        <div style={{ maxWidth: 860, margin: '0 auto', padding: '28px 16px' }}>
          <div style={{ background: '#fff', borderRadius: 20, padding: 32, boxShadow: '0 2px 20px rgba(0,0,0,0.08)' }}>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0D1B2A' }}>User not found</h1>
            <p style={{ marginTop: 8, color: '#64748b' }}>This public profile is not available.</p>
          </div>
        </div>
      )}
    </div>
  )
}
