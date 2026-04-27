'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import apiClient from '../../../../services/apiClient'
import { chatService } from '../../../../services/chat.service'
import { networkService } from '../../../../services/network.service'
import { escrowService } from '../../../../services/escrow.service'
import { useAuthStore } from '../../../../store/authStore'

/* ═══════════════════════════════════════════════
   NAV ITEMS
═══════════════════════════════════════════════ */
const NAV_ITEMS = [
  { label: 'Home',    icon: 'home',          href: '/'        },
  { label: 'Network', icon: 'group',         href: '/network' },
  { label: 'Post',    icon: 'add_box',       href: '/post'    },
  { label: 'Alerts',  icon: 'notifications', href: '/alerts'  },
  { label: 'Profile', icon: 'person',        href: '/profile' },
]

const POST_TYPE_COLORS: Record<string, { bg: string; text: string }> = {
  JOB:            { bg: '#e0f2fe', text: '#0369a1' },
  TASK:           { bg: '#dcfce7', text: '#15803d' },
  COLLAB:         { bg: '#fef3c7', text: '#92400e' },
  SKILL_EXCHANGE: { bg: '#ede9fe', text: '#5b21b6' },
}

function fmtCurrency(n: number, cur = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: cur, minimumFractionDigits: 0 }).format(n)
}

function MaterialIcon({ name, size = 22, color }: { name: string; size?: number; color?: string }) {
  return (
    <span
      className="material-icons-round"
      style={{ fontSize: size, color, lineHeight: 1, userSelect: 'none', flexShrink: 0 }}
    >
      {name}
    </span>
  )
}

/* ═══════════════════════════════════════════════
   PAGE COMPONENT
═══════════════════════════════════════════════ */
export default function PublicProfilePage() {
  const router = useRouter()
  const params = useParams()
  const userId = params?.userId as string
  const { user: me } = useAuthStore()

  const [profile, setProfile]               = useState<any>(null)
  const [loading, setLoading]               = useState(true)
  const [completedTasks, setCompletedTasks] = useState<any[]>([])
  const [posts, setPosts]                   = useState<any[]>([])
  const [connStatus, setConnStatus]         = useState<any>(null)
  const [connLoading, setConnLoading]       = useState(false)
  const [msgLoading, setMsgLoading]         = useState(false)
  const [convId, setConvId]                 = useState<string | null>(null)
  const [isFollowing, setIsFollowing]       = useState(false)
  const [followLoading, setFollowLoading]   = useState(false)
  const [postsOpen, setPostsOpen]           = useState(true)
  const [tasksOpen, setTasksOpen]           = useState(true)
  const [clientSpend, setClientSpend]       = useState<{ totalSpent: number; weeklySpent: number; monthlySpent: number } | null>(null)

  const isMe = me?.id === userId

  useEffect(() => {
    if (!userId) return
    if (isMe) {
      // Redirect to own profile
      if (me?.role === 'FREELANCER') router.replace('/profile/freelancer')
      else if (me?.role === 'COMPANY') router.replace('/profile/company')
      else router.replace('/profile')
      return
    }
    loadAll()
  }, [userId, isMe])

  // Fetch is-following once auth store hydrates (me goes null → user)
  useEffect(() => {
    if (!me || !userId || isMe) return
    networkService.isFollowing(userId)
      .then(res => {
        const data = res?.data ?? res
        if (data?.isFollowing !== undefined) setIsFollowing(data.isFollowing)
      })
      .catch(() => {})
  }, [me?.id, userId])

  // Pre-fetch conversation so Message navigates instantly
  useEffect(() => {
    if (!me || !userId || isMe) return
    chatService.getOrCreateConversation(userId)
      .then(res => {
        const conv = res?.data ?? res
        if (conv?.id) setConvId(conv.id)
      })
      .catch(() => {})
  }, [me?.id, userId])

  async function loadAll() {
    setLoading(true)
    try {
      const [profileRes, statusRes, tasksRes, postsRes] = await Promise.allSettled([
        apiClient.get(`/api/users/public/${userId}`),
        apiClient.get(`/api/network/status/${userId}`),
        escrowService.getFreelancerCompletedTasks(userId),
        apiClient.get(`/api/posts/user/${userId}`),
      ])

      if (profileRes.status === 'fulfilled') {
        const d = profileRes.value.data
        const p = d?.data ?? d

        if (p?.role === 'COMPANY') {
          router.replace(`/profile/company/${userId}`)
          return
        }

        setProfile(p)

        if (p?.role === 'CLIENT') {
          escrowService.getClientSpend(userId)
            .then((res: any) => {
              const spend = res?.data ?? res
              if (spend != null) {
                setClientSpend({
                  totalSpent:   Number(spend.totalSpent   ?? 0),
                  weeklySpent:  Number(spend.weeklySpent  ?? 0),
                  monthlySpent: Number(spend.monthlySpent ?? 0),
                })
              }
            })
            .catch(() => {})
        }
      } else {
        toast.error('Profile not found')
        router.replace('/network')
        return
      }

      if (statusRes.status === 'fulfilled') {
        const d = statusRes.value.data
        setConnStatus(d?.data ?? null)
      }

      if (tasksRes.status === 'fulfilled') {
        const d = tasksRes.value
        setCompletedTasks(Array.isArray(d) ? d : (d?.data ?? []))
      }

      if (postsRes.status === 'fulfilled') {
        const d = postsRes.value.data
        const arr = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : (d?.posts ?? [])
        setPosts(arr)
      }
    } catch {
      toast.error('Could not load profile')
    } finally {
      setLoading(false)
    }
  }

  async function handleConnect() {
    if (!me) { router.push('/login'); return }
    if (connStatus?.status === 'ACCEPTED') { handleMessage(); return }
    if (connStatus?.status === 'PENDING') { toast('Connection request already sent'); return }
    // Optimistic — show Requested immediately
    const prevStatus = connStatus
    setConnStatus({ status: 'PENDING' })
    setConnLoading(true)
    try {
      await networkService.sendRequest(userId)
      toast.success('Connection request sent!')
    } catch (e: any) {
      setConnStatus(prevStatus)
      toast.error(e?.response?.data?.message ?? 'Failed to send request')
    } finally {
      setConnLoading(false)
    }
  }

  async function handleMessage() {
    if (!me) { router.push('/login'); return }
    if (convId) { router.push(`/messages/${convId}`); return }
    setMsgLoading(true)
    try {
      const res = await chatService.getOrCreateConversation(userId)
      const conv = res?.data ?? res
      if (conv?.id) { setConvId(conv.id); router.push(`/messages/${conv.id}`) }
    } catch {
      toast.error('Could not open conversation')
    } finally {
      setMsgLoading(false)
    }
  }

  async function handleFollow() {
    if (!me) { toast.error('Please sign in to follow'); return }
    if (followLoading) return
    setFollowLoading(true)
    const wasFollowing = isFollowing
    setIsFollowing(!wasFollowing)
    try {
      if (wasFollowing) {
        await networkService.unfollow(userId)
        toast.success('Unfollowed')
      } else {
        await networkService.follow(userId)
        toast.success('Following!')
      }
    } catch (e: any) {
      const msg: string = e?.response?.data?.message ?? ''
      if (!wasFollowing && msg.toLowerCase().includes('already following')) {
        setIsFollowing(true)
      } else if (wasFollowing && (e?.response?.status === 404 || msg.toLowerCase().includes('not found'))) {
        setIsFollowing(false)
      } else {
        setIsFollowing(wasFollowing)
        toast.error(msg || 'Could not update follow')
      }
    } finally {
      setFollowLoading(false)
    }
  }

  const isConnected = connStatus?.status === 'ACCEPTED'
  const isPending   = connStatus?.status === 'PENDING'

  const languages   = Array.isArray(profile?.languages) ? profile.languages : []
  const experience  = Array.isArray(profile?.experience) ? profile.experience : []
  const quals       = Array.isArray(profile?.qualifications) ? profile.qualifications : []
  const portfolioUrls = Array.isArray(profile?.portfolioUrls) ? profile.portfolioUrls : []
  const skills      = Array.isArray(profile?.skills) ? profile.skills : []

  return (
    <>
      <style>{STYLES}</style>
      <link
        rel="stylesheet"
        href="https://fonts.googleapis.com/icon?family=Material+Icons+Round"
      />

      <div className="pub-root">
        {/* ── MOBILE HEADER ── */}
        <header className="pub-header">
          <div className="pub-hdr-left">
            <button className="pub-back-btn" onClick={() => router.back()}>
              <MaterialIcon name="arrow_back" size={20} />
            </button>
            <span className="pub-brand">Xwite</span>
          </div>
          <div className="pub-hdr-right">
            {isConnected && (
              <button className="pub-hdr-msg-btn" onClick={handleMessage} disabled={msgLoading}>
                <MaterialIcon name="chat" size={20} color="#0077b5" />
              </button>
            )}
          </div>
        </header>

        {/* ── LEFT SIDEBAR ── */}
        <aside className="pub-sidebar-left">
          <div className="pub-sidebar-brand">
            <span className="pub-brand">Xwite</span>
          </div>
          <nav className="pub-sidebar-nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.href}
                className="pub-nav-item"
                onClick={() => router.push(item.href)}
              >
                <MaterialIcon name={item.icon} size={20} />
                <span className="pub-nav-label">{item.label}</span>
              </button>
            ))}
          </nav>
          <div className="pub-sidebar-bottom">
            <button className="pub-nav-item" onClick={() => router.back()}>
              <MaterialIcon name="arrow_back" size={20} />
              <span className="pub-nav-label">Go Back</span>
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="pub-main">
          {loading ? (
            <div className="pub-loader">
              <div className="pub-spinner" />
              <p>Loading profile…</p>
            </div>
          ) : !profile ? null : (
            <>
              {/* ── PROFILE CARD ── */}
              <div className="pub-card">
                {/* Cover */}
                <div className="pub-cover">
                  {profile.coverImage
                    ? <img src={profile.coverImage} alt="Cover" className="pub-cover-img" />
                    : <div className="pub-cover-ph" />
                  }
                </div>

                {/* Below cover row */}
                <div className="pub-below-cover">
                  <div className="pub-avatar">
                    {profile.profileImage
                      ? <img src={profile.profileImage} alt={profile.fullName} />
                      : (
                        <div className="pub-avatar-ph">
                          <MaterialIcon name="person" size={36} color="#94a3b8" />
                        </div>
                      )
                    }
                  </div>
                  <div className="pub-action-row">
                    {profile?.role === 'COMPANY' && (
                      <button
                        type="button"
                        className={`pub-btn-follow${isFollowing ? ' following' : ''}`}
                        onClick={handleFollow}
                        disabled={followLoading}
                      >
                        <MaterialIcon name={isFollowing ? 'check' : 'add'} size={16} color={isFollowing ? '#0077b5' : '#fff'} />
                        {followLoading ? '…' : isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                    {isConnected ? (
                      <button
                        className="pub-btn-message"
                        onClick={handleMessage}
                        disabled={msgLoading}
                      >
                        <MaterialIcon name="chat" size={16} color="#0077b5" />
                        {msgLoading ? 'Opening…' : 'Message'}
                      </button>
                    ) : (
                      <button
                        className={`pub-btn-connect${isPending ? ' pending' : ''}`}
                        onClick={handleConnect}
                        disabled={connLoading || isPending}
                      >
                        <MaterialIcon name={isPending ? 'hourglass_empty' : 'person_add'} size={16} color="#fff" />
                        {connLoading ? 'Sending…' : isPending ? 'Requested' : 'Connect'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Profile info */}
                <div className="pub-profile-info">
                  <p className="pub-conn-count">
                    <MaterialIcon name="people" size={14} color="#0077b5" />
                    {profile.connectionsCount ?? 0} connections
                  </p>
                  <div className="pub-name-row">
                    <div>
                      <h1 className="pub-name">{profile.fullName || 'Unnamed User'}</h1>
                      {profile.title && (
                        <p className="pub-title">
                          {profile.experienceLevel && (
                            <span className="pub-title-level">{profile.experienceLevel} · </span>
                          )}
                          {profile.title}
                        </p>
                      )}
                      {(profile.city || profile.country) && (
                        <p className="pub-location">
                          <MaterialIcon name="location_on" size={13} color="#94a3b8" />
                          {[profile.city, profile.country].filter(Boolean).join(', ')}
                        </p>
                      )}
                    </div>
                  </div>

                  {profile.bio && <p className="pub-bio">{profile.bio}</p>}

                  {/* Badges */}
                  <div className="pub-badges-row">
                    {profile.availability && (
                      <span className="pub-badge pub-badge-avail">
                        <span className="pub-avail-dot" />
                        Available
                      </span>
                    )}
                    {profile.avgRating > 0 && (
                      <span className="pub-badge pub-badge-rating">
                        ★ {profile.avgRating.toFixed(1)} ({profile.totalReviews} reviews)
                      </span>
                    )}
                    {profile.hourlyRate > 0 && (
                      <span className="pub-badge pub-badge-rate">
                        {fmtCurrency(profile.hourlyRate, profile.currency ?? 'INR')}/hr
                      </span>
                    )}
                  </div>

                  {/* Skills */}
                  {skills.length > 0 && (
                    <ul className="pub-tags">
                      {skills.map((s: string) => (
                        <li key={s} className="pub-tag">{s}</li>
                      ))}
                    </ul>
                  )}

                  {/* Portfolio links */}
                  {portfolioUrls.length > 0 && (
                    <div className="pub-portfolio-row">
                      {portfolioUrls.filter((p: any) => p.url).map((p: any) => (
                        <a
                          key={p.label}
                          href={p.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="pub-portfolio-link"
                        >
                          <MaterialIcon name="link" size={13} color="#0077b5" />
                          <span>{p.label}</span>
                        </a>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* ── LANGUAGES + EXPERIENCE + EDUCATION (combined card) ── */}
              {(languages.length > 0 || experience.length > 0 || quals.length > 0) && (
                <div className="pub-section-card">
                  {/* Languages at top */}
                  {languages.length > 0 && (
                    <>
                      <div className="pub-section-hdr">
                        <div className="pub-section-hdr-left">
                          <MaterialIcon name="translate" size={18} color="#0077b5" />
                          <h2 className="pub-section-title">Languages</h2>
                        </div>
                      </div>
                      <div className="pub-section-body">
                        <div className="pub-lang-display">
                          {languages.map((l: any, i: number) => (
                            <div key={i} className="pub-lang-chip">
                              <span className="pub-lang-name">{l.language}</span>
                              <span className="pub-lang-prof">{l.proficiency}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </>
                  )}

                  {/* Experience */}
                  {experience.length > 0 && (
                    <>
                      {languages.length > 0 && <div className="pub-card-divider" />}
                      <div className="pub-section-hdr">
                        <div className="pub-section-hdr-left">
                          <MaterialIcon name="work" size={18} color="#0077b5" />
                          <h2 className="pub-section-title">Experience</h2>
                        </div>
                      </div>
                      <div className="pub-section-body pub-timeline">
                        {experience.map((e: any, i: number) => (
                          <div key={i} className="pub-timeline-item">
                            <div className="pub-timeline-dot" />
                            <div className="pub-timeline-body">
                              <p className="pub-timeline-title">{e.title ?? e.role ?? 'Role'}</p>
                              <p className="pub-timeline-sub">
                                {e.company}
                                {e.from && ` · ${e.from}${e.current ? ' – Present' : e.to ? ` – ${e.to}` : ''}`}
                              </p>
                              {e.description && <p className="pub-timeline-desc">{e.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  {/* Education */}
                  {quals.length > 0 && (
                    <>
                      {(languages.length > 0 || experience.length > 0) && <div className="pub-card-divider" />}
                      <div className="pub-section-hdr">
                        <div className="pub-section-hdr-left">
                          <MaterialIcon name="school" size={18} color="#0077b5" />
                          <h2 className="pub-section-title">Education</h2>
                        </div>
                      </div>
                      <div className="pub-section-body pub-timeline">
                        {quals.map((q: any, i: number) => (
                          <div key={i} className="pub-timeline-item">
                            <div className="pub-timeline-dot pub-timeline-dot-edu" />
                            <div className="pub-timeline-body">
                              <p className="pub-timeline-title">{q.degree}</p>
                              <p className="pub-timeline-sub">{q.institution}{q.year ? ` · ${q.year}` : ''}</p>
                              {q.description && <p className="pub-timeline-desc">{q.description}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              )}

              {/* ── COMPLETED TASKS ── */}
              {completedTasks.length > 0 && (
                <div className="pub-section-card">
                  <button
                    className="pub-accordion-hdr"
                    onClick={() => setTasksOpen(v => !v)}
                  >
                    <div className="pub-accordion-hdr-left">
                      <MaterialIcon name="task_alt" size={18} color="#15803d" />
                      <h2 className="pub-section-title" style={{ color: '#15803d' }}>
                        Completed Work
                      </h2>
                      <span className="pub-count-badge pub-count-green">{completedTasks.length}</span>
                    </div>
                    <MaterialIcon
                      name="expand_more"
                      size={20}
                      color="#64748b"
                    />
                  </button>
                  {tasksOpen && (
                    <div className="pub-section-body">
                      <div className="pub-tasks-list">
                        {completedTasks.map((task: any, i: number) => (
                          <div key={task?.id ?? i} className="pub-task-card-simple">
                            <MaterialIcon name="check_circle" size={15} color="#15803d" />
                            <span className="pub-task-title-simple">
                              {task?.task?.title ?? task?.title ?? 'Task'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* ── POSTS ── */}
              <div className="pub-section-card">
                <button
                  className="pub-accordion-hdr"
                  onClick={() => setPostsOpen(v => !v)}
                >
                  <div className="pub-accordion-hdr-left">
                    <MaterialIcon name="article" size={18} color="#0077b5" />
                    <h2 className="pub-section-title">Posts</h2>
                    {isConnected && posts.length > 0 && (
                      <span className="pub-count-badge">{posts.length}</span>
                    )}
                  </div>
                  <MaterialIcon name="expand_more" size={20} color="#64748b" />
                </button>
                {postsOpen && (
                  <div className="pub-section-body">
                    {!isConnected ? (
                      <div className="pub-locked">
                        <div className="pub-locked-icon">
                          <MaterialIcon name="lock" size={28} color="#94a3b8" />
                        </div>
                        <p className="pub-locked-title">Connect to view posts</p>
                        <p className="pub-locked-sub">
                          Posts are only visible to connected users.
                        </p>
                        {!isPending && (
                          <button
                            className="pub-btn-connect-inline"
                            onClick={handleConnect}
                            disabled={connLoading}
                          >
                            <MaterialIcon name="person_add" size={15} color="#fff" />
                            {connLoading ? 'Sending…' : 'Send Connection Request'}
                          </button>
                        )}
                        {isPending && (
                          <p className="pub-pending-note">
                            Connection request sent · Awaiting approval
                          </p>
                        )}
                      </div>
                    ) : posts.length === 0 ? (
                      <p className="pub-empty">No posts yet.</p>
                    ) : (
                      <div className="pub-posts-list">
                        {posts.map((p: any) => {
                          const col = POST_TYPE_COLORS[p.type] ?? { bg: '#f1f5f9', text: '#475569' }
                          return (
                            <div
                              key={p.id}
                              className="pub-post-card"
                              onClick={() => router.push(`/posts/${p.id}`)}
                            >
                              <div className="pub-post-top">
                                <span className="pub-post-type" style={{ background: col.bg, color: col.text }}>
                                  {p.type === 'SKILL_EXCHANGE' ? 'SERVICE' : (p.type ?? '').replace('_', ' ')}
                                </span>
                                <span className="pub-post-status">{p.status}</span>
                                {p._count?.proposals != null && (
                                  <span className="pub-post-proposals">
                                    {p._count.proposals} proposals
                                  </span>
                                )}
                              </div>
                              <p className="pub-post-title">{p.title}</p>
                              {p.description && (
                                <p className="pub-post-desc">
                                  {p.description.slice(0, 120)}{p.description.length > 120 ? '…' : ''}
                                </p>
                              )}
                              {Array.isArray(p.skills) && p.skills.length > 0 && (
                                <div className="pub-post-skills">
                                  {p.skills.slice(0, 4).map((s: string) => (
                                    <span key={s} className="pub-post-skill">{s}</span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </main>

        {/* ── RIGHT SIDEBAR ── */}
        <aside className="pub-sidebar-right">
          {!loading && profile && (
            <>
              {/* Profile summary card */}
              <div className="pub-right-card">
                <div className="pub-right-avatar">
                  {profile.profileImage
                    ? <img src={profile.profileImage} alt={profile.fullName} />
                    : <MaterialIcon name="person" size={28} color="#94a3b8" />
                  }
                </div>
                <p className="pub-right-name">{profile.fullName ?? 'User'}</p>
                {profile.title && <p className="pub-right-title">{profile.title}</p>}
                {profile?.role === 'COMPANY' && (
                  <button
                    type="button"
                    className={`pub-btn-connect-full${isFollowing ? ' following-full' : ''}`}
                    style={isFollowing ? {background:'#fff',color:'#0077b5',border:'1.5px solid #bae6fd'} : {}}
                    onClick={handleFollow}
                    disabled={followLoading}
                  >
                    <MaterialIcon name={isFollowing ? 'check' : 'add'} size={15} color={isFollowing ? '#0077b5' : '#fff'} />
                    {followLoading ? '…' : isFollowing ? 'Following' : 'Follow'}
                  </button>
                )}
                {isConnected ? (
                  <button className="pub-btn-message-full" onClick={handleMessage} disabled={msgLoading}>
                    <MaterialIcon name="chat" size={15} color="#fff" />
                    {msgLoading ? 'Opening…' : 'Send Message'}
                  </button>
                ) : (
                  <button
                    className={`pub-btn-connect-full${isPending ? ' pending' : ''}`}
                    onClick={handleConnect}
                    disabled={connLoading || isPending}
                  >
                    <MaterialIcon name={isPending ? 'hourglass_empty' : 'person_add'} size={15} color="#fff" />
                    {connLoading ? 'Sending…' : isPending ? 'Request Sent' : 'Connect'}
                  </button>
                )}
              </div>

              {/* Stats card — rating + tasks only, no connections */}
              {(profile.avgRating > 0 || completedTasks.length > 0) && (
                <div className="pub-stats-card">
                  <p className="pub-stats-title">Stats</p>
                  <div className="pub-stats-grid">
                    {profile.avgRating > 0 && (
                      <div className="pub-stat-item">
                        <span className="pub-stat-val">★ {profile.avgRating.toFixed(1)}</span>
                        <span className="pub-stat-lbl">{profile.totalReviews} Reviews</span>
                      </div>
                    )}
                    {completedTasks.length > 0 && (
                      <div className="pub-stat-item">
                        <span className="pub-stat-val">{completedTasks.length}</span>
                        <span className="pub-stat-lbl">Tasks Done</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Rate card */}
              {profile.hourlyRate > 0 && (
                <div className="pub-rate-card">
                  <p className="pub-rate-lbl">Hourly Rate</p>
                  <p className="pub-rate-val">
                    {fmtCurrency(profile.hourlyRate, profile.currency ?? 'INR')}
                    <span>/hr</span>
                  </p>
                  {profile.availability && (
                    <span className="pub-avail-pill">
                      <span className="pub-avail-dot" style={{ width: 7, height: 7 }} />
                      Available now
                    </span>
                  )}
                </div>
              )}

              {/* Spend Overview — visible to all visitors on client profiles */}
              {profile.role === 'CLIENT' && clientSpend !== null && (
                <div className="pub-spend-card">
                  <p className="pub-spend-title">Spend Overview</p>
                  <div className="pub-spend-list">
                    <div className="pub-spend-row">
                      <span className="pub-spend-lbl">Total Spent</span>
                      <span className="pub-spend-val">{fmtCurrency(clientSpend.totalSpent, 'INR')}</span>
                    </div>
                    <div className="pub-spend-row">
                      <span className="pub-spend-lbl">This Week</span>
                      <span className="pub-spend-val">{fmtCurrency(clientSpend.weeklySpent, 'INR')}</span>
                    </div>
                    <div className="pub-spend-row">
                      <span className="pub-spend-lbl">This Month</span>
                      <span className="pub-spend-val">{fmtCurrency(clientSpend.monthlySpent, 'INR')}</span>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </aside>

        {/* ── MOBILE NAV ── */}
        <nav className="pub-mobile-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.href}
              className="pub-mob-item"
              onClick={() => router.push(item.href)}
            >
              <MaterialIcon name={item.icon} size={22} />
              <span className="pub-mob-label">{item.label}</span>
            </button>
          ))}
        </nav>
      </div>
    </>
  )
}

/* ═══════════════════════════════════════════════
   STYLES
═══════════════════════════════════════════════ */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');

*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}

@keyframes pub-spin{to{transform:rotate(360deg);}}
@keyframes pub-shimmer{0%{background-position:-600px 0}100%{background-position:600px 0}}

/* ── ROOT ── */
.pub-root{display:grid;grid-template-areas:"header""main""mobile-nav";grid-template-rows:60px 1fr 60px;grid-template-columns:1fr;background:#f1f5f9;min-height:100dvh;font-family:'Inter',sans-serif;color:#0f172a;}
@media(min-width:900px){.pub-root{grid-template-areas:"left-sidebar main right-sidebar";grid-template-columns:230px 1fr 260px;grid-template-rows:1fr;}}

/* ── MOBILE HEADER ── */
.pub-header{grid-area:header;display:flex;align-items:center;justify-content:space-between;padding:0 18px;background:#fff;border-bottom:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.05);position:sticky;top:0;z-index:100;}
@media(min-width:900px){.pub-header{display:none;}}
.pub-hdr-left{display:flex;align-items:center;gap:8px;}
.pub-brand{font-size:19px;font-weight:800;color:#0077b5;letter-spacing:-0.03em;font-family:'Inter',sans-serif;}
.pub-back-btn{background:none;border:none;cursor:pointer;padding:6px;border-radius:8px;display:flex;align-items:center;justify-content:center;transition:background .15s;color:#475569;}
.pub-back-btn:hover{background:#f1f5f9;}
.pub-hdr-right{display:flex;align-items:center;gap:8px;}
.pub-hdr-msg-btn{width:38px;height:38px;border-radius:50%;border:1.5px solid #e2e8f0;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .15s;}
.pub-hdr-msg-btn:active{transform:scale(.93);}

/* ── LEFT SIDEBAR ── */
.pub-sidebar-left{display:none;grid-area:left-sidebar;}
@media(min-width:900px){.pub-sidebar-left{display:flex;flex-direction:column;background:#fff;border-right:1px solid #e2e8f0;padding:24px 14px;position:sticky;top:0;height:100dvh;overflow-y:auto;}}
.pub-sidebar-brand{display:flex;align-items:center;gap:8px;padding:0 8px;margin-bottom:24px;}
.pub-sidebar-nav{display:flex;flex-direction:column;gap:3px;flex:1;}
.pub-nav-item{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:12px;border:none;background:transparent;color:#475569;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;text-align:left;width:100%;transition:background .15s,color .15s;}
.pub-nav-item:hover{background:#f0f9ff;color:#0077b5;}
.pub-nav-label{flex:1;}
.pub-sidebar-bottom{display:flex;flex-direction:column;gap:3px;border-top:1px solid #f1f5f9;padding-top:10px;}

/* ── MAIN ── */
.pub-main{grid-area:main;min-width:0;padding-bottom:70px;display:flex;flex-direction:column;gap:0;}
@media(min-width:900px){.pub-main{padding:24px 22px 40px;gap:14px;}}

/* ── LOADER ── */
.pub-loader{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:80px 20px;color:#94a3b8;font-size:14px;}
.pub-spinner{width:36px;height:36px;border:3px solid #e2e8f0;border-top-color:#0077b5;border-radius:50%;animation:pub-spin .8s linear infinite;}

/* ── PROFILE CARD ── */
.pub-card{background:#fff;border-radius:0 0 24px 24px;overflow:visible;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.08);border:1px solid rgba(0,0,0,0.04);}
@media(min-width:900px){.pub-card{border-radius:20px;box-shadow:0 2px 8px rgba(0,0,0,0.05),0 8px 28px rgba(0,0,0,0.09);}}

/* ── COVER ── */
.pub-cover{position:relative;margin:0;border-radius:20px 20px 0 0;overflow:hidden;height:120px;}
.pub-cover-img{width:100%;height:100%;object-fit:cover;object-position:center;display:block;}
.pub-cover-ph{width:100%;height:100%;background:linear-gradient(135deg,#0f4c75 0%,#1b6ca8 30%,#0077b5 55%,#2196c4 80%,#4db8d9 100%);}
.pub-cover-ph::before{content:'';position:absolute;inset:0;background:radial-gradient(ellipse at 20% 50%,rgba(255,255,255,0.15) 0%,transparent 55%);pointer-events:none;}
@media(min-width:900px){.pub-cover{height:150px;}}

/* ── BELOW COVER ── */
.pub-below-cover{display:flex;align-items:flex-end;justify-content:space-between;padding:0 18px;margin-top:-42px;margin-bottom:10px;position:relative;z-index:20;}
@media(min-width:900px){.pub-below-cover{padding:0 22px;margin-top:-46px;margin-bottom:16px;}}
.pub-avatar{width:80px;height:80px;border-radius:14px;overflow:hidden;background:#e2e5e9;border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,0.18);flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.pub-avatar img{width:100%;height:100%;object-fit:cover;object-position:center top;display:block;}
.pub-avatar-ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#dde4ea;}
@media(min-width:900px){.pub-avatar{width:92px;height:92px;border-radius:16px;}}
.pub-action-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}

/* ── BUTTONS ── */
.pub-btn-connect{display:flex;align-items:center;gap:6px;background:linear-gradient(135deg,#0284c7,#0077b5);color:#fff;border:none;border-radius:999px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 3px 12px rgba(0,119,181,0.3);transition:transform .15s,box-shadow .15s;}
.pub-btn-connect:hover{box-shadow:0 5px 18px rgba(0,119,181,0.4);}
.pub-btn-connect:active{transform:scale(.96);}
.pub-btn-connect.pending{background:linear-gradient(135deg,#94a3b8,#64748b);box-shadow:0 2px 8px rgba(100,116,139,0.25);}
.pub-btn-connect:disabled{opacity:.75;cursor:not-allowed;}
.pub-btn-message{display:flex;align-items:center;gap:6px;background:#fff;color:#0077b5;border:1.5px solid #bae6fd;border-radius:999px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 2px 8px rgba(0,119,181,0.12);transition:transform .15s,box-shadow .15s,background .15s;}
.pub-btn-message:hover{background:#f0f9ff;box-shadow:0 4px 14px rgba(0,119,181,0.2);}
.pub-btn-message:active{transform:scale(.96);}
.pub-btn-message:disabled{opacity:.75;cursor:not-allowed;}
.pub-btn-follow{display:flex;align-items:center;gap:6px;background:linear-gradient(135deg,#0284c7,#0077b5);color:#fff;border:none;border-radius:999px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 3px 12px rgba(0,119,181,0.3);transition:transform .15s,box-shadow .15s;}
.pub-btn-follow:hover{box-shadow:0 5px 18px rgba(0,119,181,0.4);}
.pub-btn-follow:active{transform:scale(.96);}
.pub-btn-follow.following{background:#fff;color:#0077b5;border:1.5px solid #bae6fd;box-shadow:0 2px 8px rgba(0,119,181,0.12);}
.pub-btn-follow.following:hover{background:#f0f9ff;}
.pub-btn-follow:disabled{opacity:.75;cursor:not-allowed;}

/* ── PROFILE INFO ── */
.pub-profile-info{padding:2px 18px 18px 20px;display:flex;flex-direction:column;gap:6px;}
@media(min-width:900px){.pub-profile-info{padding:2px 24px 22px;}}
.pub-conn-count{font-size:12px;font-weight:700;color:#0077b5;display:flex;align-items:center;gap:4px;opacity:.85;}
.pub-name-row{display:flex;align-items:flex-start;justify-content:space-between;gap:10px;}
.pub-name{font-size:22px;font-weight:800;line-height:1.15;color:#0f172a;letter-spacing:-0.03em;}
@media(min-width:900px){.pub-name{font-size:26px;}}
.pub-title{font-size:14px;font-weight:500;color:#0077b5;margin-top:2px;}
.pub-title-level{color:#475569;font-weight:700;}
.pub-location{font-size:12px;color:#94a3b8;display:flex;align-items:center;gap:3px;margin-top:2px;}
.pub-bio{font-size:14px;font-weight:400;color:#475569;line-height:1.7;}
.pub-badges-row{display:flex;flex-wrap:wrap;gap:6px;}
.pub-badge{padding:4px 10px;border-radius:999px;font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;display:flex;align-items:center;gap:4px;}
.pub-badge-avail{background:#dcfce7;color:#15803d;border:1px solid #86efac;}
.pub-badge-rating{background:#fef9c3;color:#92400e;}
.pub-badge-rate{background:#e0f2fe;color:#0369a1;border:1px solid #bae6fd;}
.pub-avail-dot{width:7px;height:7px;border-radius:50%;background:currentColor;display:inline-block;}
.pub-tags{display:flex;flex-wrap:wrap;gap:6px;list-style:none;}
.pub-tag{background:linear-gradient(135deg,#e0f2fe,#dbeffe);color:#0369a1;border:1px solid #bae6fd;padding:5px 12px;border-radius:999px;font-size:10.5px;font-weight:600;letter-spacing:.03em;text-transform:uppercase;}
.pub-portfolio-row{display:flex;flex-wrap:wrap;gap:6px;}
.pub-portfolio-link{display:flex;align-items:center;gap:5px;background:#f0f9ff;border:1px solid #bae6fd;border-radius:999px;padding:5px 11px;font-size:12px;font-weight:500;color:#0077b5;text-decoration:none;transition:background .15s;}
.pub-portfolio-link:hover{background:#e0f2fe;}
.pub-portfolio-link span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:120px;}

/* ── SECTION CARDS ── */
.pub-section-card{background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 14px rgba(0,0,0,0.07);border:1px solid rgba(0,0,0,0.04);overflow:hidden;}
@media(max-width:899px){.pub-section-card{border-radius:0;border-left:none;border-right:none;}}
.pub-section-hdr{display:flex;align-items:center;justify-content:space-between;padding:14px 18px 12px;border-bottom:1px solid #f1f5f9;border-left:3px solid #0077b5;}
.pub-section-hdr-left{display:flex;align-items:center;gap:8px;}
.pub-section-title{font-size:15px;font-weight:700;color:#0f172a;}
.pub-section-body{padding:14px 18px 18px;}
.pub-empty{font-size:13px;color:#94a3b8;padding:8px 0;}
.pub-card-divider{height:1px;background:#f1f5f9;margin:0;}

/* ── ACCORDION ── */
.pub-accordion-hdr{width:100%;display:flex;align-items:center;justify-content:space-between;padding:14px 18px 12px;border-left:3px solid #0077b5;background:none;border-top:none;border-right:none;border-bottom:1px solid #f1f5f9;cursor:pointer;font-family:'Inter',sans-serif;text-align:left;transition:background .15s;}
.pub-accordion-hdr:hover{background:#f8fafc;}
.pub-accordion-hdr-left{display:flex;align-items:center;gap:8px;}
.pub-count-badge{font-size:10px;font-weight:800;background:#f1f5f9;color:#64748b;border-radius:999px;padding:2px 8px;}
.pub-count-green{background:#dcfce7;color:#15803d;}

/* ── LOCKED ── */
.pub-locked{display:flex;flex-direction:column;align-items:center;gap:10px;padding:28px 16px;text-align:center;}
.pub-locked-icon{width:52px;height:52px;border-radius:16px;background:#f1f5f9;display:flex;align-items:center;justify-content:center;}
.pub-locked-title{font-size:14px;font-weight:700;color:#0f172a;}
.pub-locked-sub{font-size:12px;color:#94a3b8;max-width:260px;line-height:1.5;}
.pub-btn-connect-inline{display:flex;align-items:center;gap:6px;background:linear-gradient(135deg,#0284c7,#0077b5);color:#fff;border:none;border-radius:999px;padding:10px 20px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 3px 12px rgba(0,119,181,0.28);margin-top:4px;transition:transform .15s;}
.pub-btn-connect-inline:hover{transform:translateY(-1px);}
.pub-btn-connect-inline:disabled{opacity:.7;cursor:not-allowed;}
.pub-pending-note{font-size:12px;color:#92400e;background:#fef9c3;border-radius:999px;padding:6px 14px;font-weight:600;}

/* ── COMPLETED TASKS ── */
.pub-tasks-list{display:flex;flex-direction:column;gap:6px;}
.pub-task-card-simple{display:flex;align-items:center;gap:8px;padding:9px 12px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;}
.pub-task-title-simple{font-size:13px;font-weight:600;color:#0f172a;line-height:1.4;}

/* ── POSTS ── */
.pub-posts-list{display:flex;flex-direction:column;gap:10px;}
.pub-post-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:13px 15px;cursor:pointer;transition:all .18s;}
.pub-post-card:hover{background:#f0f9ff;border-color:#bae6fd;box-shadow:0 3px 12px rgba(0,119,181,0.1);transform:translateY(-1px);}
.pub-post-top{display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;}
.pub-post-type{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;border-radius:6px;padding:3px 9px;}
.pub-post-status{font-size:11px;font-weight:700;color:#64748b;}
.pub-post-proposals{font-size:11px;color:#94a3b8;font-weight:600;margin-left:auto;}
.pub-post-title{font-size:14px;font-weight:700;color:#0f172a;line-height:1.4;margin-bottom:4px;}
.pub-post-desc{font-size:12px;color:#536279;line-height:1.5;}
.pub-post-skills{display:flex;flex-wrap:wrap;gap:5px;margin-top:7px;}
.pub-post-skill{font-size:10px;font-weight:600;background:#e0f2fe;color:#0369a1;border-radius:999px;padding:2px 9px;}

/* ── TIMELINE ── */
.pub-timeline{display:flex;flex-direction:column;gap:14px;}
.pub-timeline-item{display:flex;gap:12px;align-items:flex-start;}
.pub-timeline-dot{width:10px;height:10px;border-radius:50%;background:#0077b5;flex-shrink:0;margin-top:4px;box-shadow:0 0 0 3px rgba(0,119,181,0.18);}
.pub-timeline-dot-edu{background:#8b5cf6;box-shadow:0 0 0 3px rgba(139,92,246,0.18);}
.pub-timeline-body{flex:1;min-width:0;}
.pub-timeline-title{font-size:14px;font-weight:700;color:#0f172a;}
.pub-timeline-sub{font-size:12px;color:#64748b;margin-top:2px;}
.pub-timeline-desc{font-size:13px;color:#536279;line-height:1.6;margin-top:4px;}

/* ── LANGUAGE DISPLAY ── */
.pub-lang-display{display:flex;flex-wrap:wrap;gap:8px;}
.pub-lang-chip{display:flex;align-items:center;gap:6px;background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:7px 12px;}
.pub-lang-name{font-size:13px;font-weight:700;color:#0f172a;}
.pub-lang-prof{font-size:9px;font-weight:800;text-transform:uppercase;letter-spacing:.05em;background:linear-gradient(135deg,#e0f2fe,#dbeffe);color:#0369a1;border:1px solid #bae6fd;padding:2px 7px;border-radius:999px;}

/* ── RIGHT SIDEBAR ── */
.pub-sidebar-right{display:none;grid-area:right-sidebar;}
@media(min-width:900px){.pub-sidebar-right{display:flex;flex-direction:column;gap:10px;padding:24px 14px;background:#f1f5f9;position:sticky;top:0;height:100dvh;overflow-y:auto;}}
.pub-right-card{background:#fff;border-radius:16px;padding:16px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.05);display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;}
.pub-right-avatar{width:60px;height:60px;border-radius:14px;overflow:hidden;background:#e2e5e9;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.1);display:flex;align-items:center;justify-content:center;}
.pub-right-avatar img{width:100%;height:100%;object-fit:cover;}
.pub-right-name{font-size:14px;font-weight:700;color:#0f172a;}
.pub-right-title{font-size:12px;color:#64748b;font-weight:500;}
.pub-btn-message-full{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;background:#fff;color:#0077b5;border:1.5px solid #bae6fd;border-radius:999px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;margin-top:4px;box-shadow:0 2px 8px rgba(0,119,181,0.1);transition:transform .15s,background .15s;}
.pub-btn-message-full:hover{background:#f0f9ff;transform:translateY(-1px);}
.pub-btn-message-full:disabled{opacity:.7;cursor:not-allowed;}
.pub-btn-connect-full{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;background:linear-gradient(135deg,#0284c7,#0077b5);color:#fff;border:none;border-radius:999px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;margin-top:4px;box-shadow:0 3px 10px rgba(0,119,181,0.28);transition:transform .15s;}
.pub-btn-connect-full:hover{transform:translateY(-1px);}
.pub-btn-connect-full.pending{background:linear-gradient(135deg,#94a3b8,#64748b);}
.pub-btn-connect-full:disabled{opacity:.7;cursor:not-allowed;}
.pub-stats-card{background:#fff;border-radius:16px;padding:14px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.05);}
.pub-stats-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:10px;}
.pub-stats-grid{display:grid;grid-template-columns:1fr 1fr;gap:8px;}
.pub-stat-item{display:flex;flex-direction:column;gap:2px;background:#f8fafc;border-radius:10px;padding:10px 12px;}
.pub-stat-val{font-size:16px;font-weight:800;color:#0f172a;}
.pub-stat-lbl{font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:.05em;color:#94a3b8;}
.pub-rate-card{background:linear-gradient(145deg,#cce8ff 0%,#d4eeff 45%,#e4f3ff 100%);border:1px solid #93c5fd;border-radius:16px;padding:14px;}
.pub-rate-lbl{font-size:10px;font-weight:700;letter-spacing:.07em;text-transform:uppercase;color:#0369a1;}
.pub-rate-val{font-size:24px;font-weight:800;color:#0f172a;letter-spacing:-0.02em;line-height:1;margin-top:4px;}
.pub-rate-val span{font-size:14px;font-weight:500;color:#64748b;}
.pub-avail-pill{display:inline-flex;align-items:center;gap:5px;background:#dcfce7;color:#15803d;border-radius:999px;padding:4px 10px;font-size:11px;font-weight:700;margin-top:10px;}

/* ── SPEND OVERVIEW CARD ── */
.pub-spend-card{background:#fff;border-radius:16px;padding:14px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.05);}
.pub-spend-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:10px;}
.pub-spend-list{display:flex;flex-direction:column;gap:6px;}
.pub-spend-row{display:flex;align-items:center;justify-content:space-between;background:#f8fafc;border-radius:10px;padding:9px 11px;}
.pub-spend-lbl{font-size:11px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:.04em;}
.pub-spend-val{font-size:14px;font-weight:800;color:#0f172a;}

/* ── MOBILE BOTTOM NAV ── */
.pub-mobile-nav{grid-area:mobile-nav;display:flex;justify-content:space-around;align-items:center;background:#fff;border-top:1px solid #e2e8f0;z-index:100;position:sticky;bottom:0;box-shadow:0 -2px 12px rgba(0,0,0,0.06);}
@media(min-width:900px){.pub-mobile-nav{display:none;}}
.pub-mob-item{display:flex;flex-direction:column;align-items:center;gap:2px;background:none;border:none;cursor:pointer;color:#94a3b8;font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:.04em;font-family:'Inter',sans-serif;padding:6px 8px;transition:color .15s;}
.pub-mob-label{font-size:9px;}
`
