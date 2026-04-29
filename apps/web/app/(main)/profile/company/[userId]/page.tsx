'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import toast from 'react-hot-toast'
import apiClient from '../../../../../services/apiClient'
import { chatService } from '../../../../../services/chat.service'
import { networkService } from '../../../../../services/network.service'
import { useAuthStore } from '../../../../../store/authStore'
import { authService } from '../../../../../services/auth.service'

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

export default function CompanyPublicProfilePage() {
  const router = useRouter()
  const params = useParams()
  const userId = params?.userId as string
  const { user: me } = useAuthStore()

  const [profile, setProfile]             = useState<any>(null)
  const [posts, setPosts]                 = useState<any[]>([])
  const [loading, setLoading]             = useState(true)
  const [isFollowing, setIsFollowing]     = useState(false)
  const [followLoading, setFollowLoading] = useState(false)
  const [followerCount, setFollowerCount] = useState(0)
  const [postsOpen, setPostsOpen]         = useState(true)
  const [msgLoading, setMsgLoading]       = useState(false)
  const [convId, setConvId]               = useState<string | null>(null)

  const isMe = me?.id === userId

  useEffect(() => {
    if (!userId) return
    if (isMe) {
      router.replace('/profile/company')
      return
    }
    loadAll()
  }, [userId, isMe])

  // Pre-fetch conversation so Message button navigates instantly
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
      const requests: Promise<any>[] = [
        apiClient.get(`/api/users/public/${userId}`),
        apiClient.get(`/api/posts/user/${userId}`),
        apiClient.get(`/api/users/${userId}/followers`),
      ]
      if (authService.isLoggedIn()) requests.push(networkService.isFollowing(userId))

      const [profileRes, postsRes, followersRes, isFollowingRes] = await Promise.allSettled(requests)

      if (profileRes.status === 'fulfilled') {
        const d = profileRes.value.data
        const p = d?.data ?? d
        if (!p || p.role !== 'COMPANY') {
          router.replace(`/profile/${userId}`)
          return
        }
        setProfile(p)
      } else {
        toast.error('Company not found')
        router.replace('/network')
        return
      }

      if (postsRes.status === 'fulfilled') {
        const d = postsRes.value.data
        const arr = Array.isArray(d) ? d : Array.isArray(d?.data) ? d.data : (d?.posts ?? [])
        setPosts(arr)
      }

      if (followersRes.status === 'fulfilled') {
        setFollowerCount(followersRes.value.data?.total ?? 0)
      }

      if (isFollowingRes?.status === 'fulfilled') {
        const data = isFollowingRes.value?.data ?? isFollowingRes.value
        setIsFollowing(data?.isFollowing ?? false)
      }
    } catch {
      toast.error('Could not load profile')
    } finally {
      setLoading(false)
    }
  }

  async function handleFollow() {
    if (!authService.isLoggedIn()) { toast.error('Please sign in to follow'); return }
    if (followLoading) return
    setFollowLoading(true)
    const wasFollowing = isFollowing
    setIsFollowing(!wasFollowing)
    setFollowerCount(c => wasFollowing ? Math.max(0, c - 1) : c + 1)
    try {
      if (wasFollowing) {
        await networkService.unfollow(userId)
        toast.success('Unfollowed')
      } else {
        await networkService.follow(userId)
        toast.success('Now following!')
      }
    } catch (e: any) {
      const msg: string = e?.response?.data?.message ?? ''
      if (!wasFollowing && msg.toLowerCase().includes('already following')) {
        // Already following on server — keep state as following, don't revert
        setIsFollowing(true)
        setFollowerCount(c => c) // no change needed
      } else if (wasFollowing && (e?.response?.status === 404 || msg.toLowerCase().includes('not found'))) {
        // Already unfollowed on server — keep state as unfollowed
        setIsFollowing(false)
      } else {
        setIsFollowing(wasFollowing)
        setFollowerCount(c => wasFollowing ? c + 1 : Math.max(0, c - 1))
        toast.error(msg || 'Could not update follow')
      }
    } finally {
      setFollowLoading(false)
    }
  }

  async function handleMessage() {
    if (!authService.isLoggedIn()) { toast.error('Please sign in to message'); return }
    if (convId) { router.push(`/messages/${convId}`); return }
    setMsgLoading(true)
    try {
      const res = await chatService.getOrCreateConversation(userId)
      const conv = res?.data ?? res
      if (conv?.id) router.push(`/messages/${conv.id}`)
    } catch {
      toast.error('Could not open conversation')
    } finally {
      setMsgLoading(false)
    }
  }

  return (
    <>
      <style>{STYLES}</style>
      <link rel="stylesheet" href="https://fonts.googleapis.com/icon?family=Material+Icons+Round" />

      <div className="cp-pub-root">
        {/* ── MOBILE HEADER ── */}
        <header className="cp-pub-header">
          <div className="cp-pub-hdr-left">
            <button className="cp-pub-back-btn" onClick={() => router.back()}>
              <MaterialIcon name="arrow_back" size={20} />
            </button>
            <span className="cp-pub-brand">Xwite</span>
          </div>
          <div className="cp-pub-hdr-right">
            <button className="cp-pub-hdr-msg-btn" onClick={handleMessage} disabled={msgLoading}>
              <MaterialIcon name="chat" size={20} color="#0077b5" />
            </button>
          </div>
        </header>

        {/* ── LEFT SIDEBAR ── */}
        <aside className="cp-pub-sidebar-left">
          <div style={{ padding: '0 8px', marginBottom: 24 }}>
            <span className="cp-pub-brand" style={{ fontSize: 19 }}>Xwite</span>
          </div>
          <nav style={{ display: 'flex', flexDirection: 'column', gap: 3, flex: 1 }}>
            {NAV_ITEMS.map(item => (
              <button key={item.href} className="cp-pub-nav-item" onClick={() => router.push(item.href)}>
                <MaterialIcon name={item.icon} size={20} />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
          <div style={{ borderTop: '1px solid #f1f5f9', paddingTop: 10 }}>
            <button className="cp-pub-nav-item" onClick={() => router.back()}>
              <MaterialIcon name="arrow_back" size={20} />
              <span>Go Back</span>
            </button>
          </div>
        </aside>

        {/* ── MAIN ── */}
        <main className="cp-pub-main">
          {loading ? (
            <div className="cp-pub-loader">
              <div className="cp-pub-spinner" />
              <p>Loading profile…</p>
            </div>
          ) : !profile ? null : (
            <>
              {/* ── PROFILE CARD ── */}
              <div className="cp-pub-card">
                {/* Cover */}
                <div className="cp-pub-cover">
                  {profile.coverImage
                    ? <img src={profile.coverImage} alt="Cover" className="cp-pub-cover-img" />
                    : <div className="cp-pub-cover-ph" />
                  }
                </div>

                {/* Logo + actions row */}
                <div className="cp-pub-below-cover">
                  <div className="cp-pub-logo">
                    {profile.profileImage
                      ? <img src={profile.profileImage} alt={profile.fullName} />
                      : (
                        <div className="cp-pub-logo-ph">
                          <MaterialIcon name="business" size={36} color="#94a3b8" />
                        </div>
                      )
                    }
                  </div>
                  <div className="cp-pub-action-row">
                    <button
                      type="button"
                      className={`cp-pub-btn-follow${isFollowing ? ' following' : ''}`}
                      onClick={handleFollow}
                      disabled={followLoading}
                    >
                      <MaterialIcon
                        name={isFollowing ? 'check' : 'add'}
                        size={16}
                        color={isFollowing ? '#0077b5' : '#fff'}
                      />
                      {followLoading ? '…' : isFollowing ? 'Following' : 'Follow'}
                    </button>
                    <button
                      type="button"
                      className="cp-pub-btn-message"
                      onClick={handleMessage}
                      disabled={msgLoading}
                    >
                      <MaterialIcon name="chat" size={16} color="#0077b5" />
                      {msgLoading ? 'Opening…' : 'Message'}
                    </button>
                  </div>
                </div>

                {/* Company info */}
                <div className="cp-pub-info">
                  <div className="cp-pub-followers-row">
                    <MaterialIcon name="people" size={14} color="#0077b5" />
                    <span className="cp-pub-follower-count">{followerCount} followers</span>
                  </div>

                  <h1 className="cp-pub-name">{profile.fullName || 'Company'}</h1>

                  {profile.industry && (
                    <p className="cp-pub-industry">
                      <MaterialIcon name="domain" size={14} color="#64748b" />
                      {profile.industry}
                      {profile.employeeCount ? ` · ${profile.employeeCount} employees` : ''}
                    </p>
                  )}

                  {(profile.city || profile.country) && (
                    <p className="cp-pub-location">
                      <MaterialIcon name="location_on" size={13} color="#94a3b8" />
                      {[profile.city, profile.country].filter(Boolean).join(', ')}
                    </p>
                  )}

                  {profile.website && (
                    <a
                      href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="cp-pub-website"
                    >
                      <MaterialIcon name="language" size={13} color="#0077b5" />
                      {profile.website.replace(/^https?:\/\//, '')}
                    </a>
                  )}

                  {profile.bio && <p className="cp-pub-bio">{profile.bio}</p>}
                </div>
              </div>

              {/* ── POSTS ── */}
              <div className="cp-pub-section-card">
                <button
                  className="cp-pub-accordion-hdr"
                  onClick={() => setPostsOpen(v => !v)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <MaterialIcon name="article" size={18} color="#0077b5" />
                    <span className="cp-pub-section-title">Posts</span>
                    {posts.length > 0 && (
                      <span className="cp-pub-count-badge">{posts.length}</span>
                    )}
                  </div>
                  <MaterialIcon name={postsOpen ? 'expand_less' : 'expand_more'} size={20} color="#64748b" />
                </button>

                {postsOpen && (
                  <div className="cp-pub-section-body">
                    {posts.length === 0 ? (
                      <p className="cp-pub-empty">No posts yet.</p>
                    ) : (
                      <div className="cp-pub-posts-list">
                        {posts.map((p: any) => {
                          const col = POST_TYPE_COLORS[p.type] ?? { bg: '#f1f5f9', text: '#475569' }
                          return (
                            <div
                              key={p.id}
                              className="cp-pub-post-card"
                              onClick={() => router.push(`/posts/${p.id}`)}
                            >
                              <div className="cp-pub-post-top">
                                <span className="cp-pub-post-type" style={{ background: col.bg, color: col.text }}>
                                  {p.type === 'SKILL_EXCHANGE' ? 'SERVICE' : (p.type ?? '').replace('_', ' ')}
                                </span>
                                <span className="cp-pub-post-status">{p.status}</span>
                                {p._count?.proposals != null && (
                                  <span className="cp-pub-post-proposals">{p._count.proposals} proposals</span>
                                )}
                              </div>
                              <p className="cp-pub-post-title">{p.title}</p>
                              {p.description && (
                                <p className="cp-pub-post-desc">
                                  {p.description.slice(0, 130)}{p.description.length > 130 ? '…' : ''}
                                </p>
                              )}
                              {p.budget != null && (
                                <p className="cp-pub-post-budget">
                                  ₹{Number(p.budget).toLocaleString('en-IN')}
                                </p>
                              )}
                              {Array.isArray(p.skills) && p.skills.length > 0 && (
                                <div className="cp-pub-post-skills">
                                  {p.skills.slice(0, 5).map((s: string) => (
                                    <span key={s} className="cp-pub-post-skill">{s}</span>
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
        <aside className="cp-pub-sidebar-right">
          {!loading && profile && (
            <>
              <div className="cp-pub-right-card">
                <div className="cp-pub-right-logo">
                  {profile.profileImage
                    ? <img src={profile.profileImage} alt={profile.fullName} />
                    : <MaterialIcon name="business" size={28} color="#94a3b8" />
                  }
                </div>
                <p className="cp-pub-right-name">{profile.fullName ?? 'Company'}</p>
                {profile.industry && (
                  <p className="cp-pub-right-industry">{profile.industry}</p>
                )}
                <p className="cp-pub-right-followers">{followerCount} followers</p>
                <button
                  type="button"
                  className={`cp-pub-btn-follow-full${isFollowing ? ' following' : ''}`}
                  onClick={handleFollow}
                  disabled={followLoading}
                >
                  <MaterialIcon
                    name={isFollowing ? 'check' : 'add'}
                    size={15}
                    color={isFollowing ? '#0077b5' : '#fff'}
                  />
                  {followLoading ? '…' : isFollowing ? 'Following' : 'Follow'}
                </button>
                <button
                  type="button"
                  className="cp-pub-btn-msg-full"
                  onClick={handleMessage}
                  disabled={msgLoading}
                >
                  <MaterialIcon name="chat" size={15} color="#fff" />
                  {msgLoading ? 'Opening…' : 'Message'}
                </button>
              </div>

              {(profile.website || profile.employeeCount) && (
                <div className="cp-pub-details-card">
                  <p className="cp-pub-details-title">Company Details</p>
                  {profile.employeeCount && (
                    <div className="cp-pub-detail-row">
                      <MaterialIcon name="people" size={15} color="#64748b" />
                      <span>{profile.employeeCount} employees</span>
                    </div>
                  )}
                  {profile.industry && (
                    <div className="cp-pub-detail-row">
                      <MaterialIcon name="domain" size={15} color="#64748b" />
                      <span>{profile.industry}</span>
                    </div>
                  )}
                  {profile.website && (
                    <div className="cp-pub-detail-row">
                      <MaterialIcon name="language" size={15} color="#0077b5" />
                      <a
                        href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ color: '#0077b5', textDecoration: 'none', fontWeight: 600 }}
                      >
                        {profile.website.replace(/^https?:\/\//, '')}
                      </a>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </aside>

      </div>
    </>
  )
}

const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0;}
@keyframes cp-pub-spin{to{transform:rotate(360deg);}}

.cp-pub-root{display:grid;grid-template-areas:"header""main";grid-template-rows:60px 1fr;grid-template-columns:1fr;background:#f1f5f9;min-height:100dvh;font-family:'Inter',sans-serif;color:#0f172a;}
@media(min-width:900px){.cp-pub-root{grid-template-areas:"left-sidebar main right-sidebar";grid-template-columns:230px 1fr 260px;grid-template-rows:1fr;}}

.cp-pub-header{grid-area:header;display:flex;align-items:center;justify-content:space-between;padding:0 18px;background:#fff;border-bottom:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.05);position:sticky;top:0;z-index:100;}
@media(min-width:900px){.cp-pub-header{display:none;}}
.cp-pub-hdr-left{display:flex;align-items:center;gap:8px;}
.cp-pub-brand{font-size:19px;font-weight:800;color:#0077b5;letter-spacing:-0.03em;font-family:'Inter',sans-serif;}
.cp-pub-back-btn{background:none;border:none;cursor:pointer;padding:6px;border-radius:8px;display:flex;align-items:center;justify-content:center;transition:background .15s;color:#475569;}
.cp-pub-back-btn:hover{background:#f1f5f9;}

.cp-pub-sidebar-left{display:none;grid-area:left-sidebar;}
@media(min-width:900px){.cp-pub-sidebar-left{display:flex;flex-direction:column;background:#fff;border-right:1px solid #e2e8f0;padding:24px 14px;position:sticky;top:0;height:100dvh;overflow-y:auto;}}
.cp-pub-nav-item{display:flex;align-items:center;gap:12px;padding:11px 12px;border-radius:12px;border:none;background:transparent;color:#475569;font-size:14px;font-weight:600;cursor:pointer;font-family:'Inter',sans-serif;text-align:left;width:100%;transition:background .15s,color .15s;}
.cp-pub-nav-item:hover{background:#f0f9ff;color:#0077b5;}

.cp-pub-main{grid-area:main;min-width:0;padding-top:8px;padding-bottom:70px;display:flex;flex-direction:column;gap:0;}
@media(min-width:900px){.cp-pub-main{padding:24px 22px 40px;gap:14px;}}

.cp-pub-loader{display:flex;flex-direction:column;align-items:center;justify-content:center;gap:14px;padding:80px 20px;color:#94a3b8;font-size:14px;}
.cp-pub-spinner{width:36px;height:36px;border:3px solid #e2e8f0;border-top-color:#0077b5;border-radius:50%;animation:cp-pub-spin .8s linear infinite;}

.cp-pub-card{background:#fff;border-radius:0 0 24px 24px;overflow:visible;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 16px rgba(0,0,0,0.08);border:1px solid rgba(0,0,0,0.04);}
@media(min-width:900px){.cp-pub-card{border-radius:20px;}}

.cp-pub-cover{position:relative;margin:0;border-radius:20px 20px 0 0;overflow:hidden;height:130px;}
@media(min-width:900px){.cp-pub-cover{height:160px;}}
.cp-pub-cover-img{width:100%;height:100%;object-fit:cover;display:block;}
.cp-pub-cover-ph{width:100%;height:100%;background:linear-gradient(135deg,#0f4c75 0%,#1b6ca8 30%,#0077b5 55%,#2196c4 80%,#4db8d9 100%);}

.cp-pub-below-cover{display:flex;align-items:flex-end;justify-content:space-between;padding:0 18px;margin-top:-44px;margin-bottom:10px;position:relative;z-index:20;}
@media(min-width:900px){.cp-pub-below-cover{padding:0 24px;margin-top:-48px;}}
.cp-pub-logo{width:84px;height:84px;border-radius:14px;overflow:hidden;background:#e2e5e9;border:3px solid #fff;box-shadow:0 2px 12px rgba(0,0,0,0.18);flex-shrink:0;display:flex;align-items:center;justify-content:center;}
.cp-pub-logo img{width:100%;height:100%;object-fit:cover;display:block;}
.cp-pub-logo-ph{width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:#dde4ea;}
@media(min-width:900px){.cp-pub-logo{width:96px;height:96px;}}
.cp-pub-action-row{display:flex;align-items:center;gap:8px;flex-wrap:wrap;}

.cp-pub-btn-follow{display:flex;align-items:center;gap:6px;background:linear-gradient(135deg,#0284c7,#0077b5);color:#fff;border:none;border-radius:999px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 3px 12px rgba(0,119,181,0.3);transition:all .15s;}
.cp-pub-btn-follow:hover{box-shadow:0 5px 18px rgba(0,119,181,0.4);}
.cp-pub-btn-follow:active{transform:scale(.96);}
.cp-pub-btn-follow.following{background:#fff;color:#0077b5;border:1.5px solid #bae6fd;box-shadow:0 2px 8px rgba(0,119,181,0.12);}
.cp-pub-btn-follow.following:hover{background:#fff;}
.cp-pub-btn-follow:disabled{opacity:.75;cursor:not-allowed;}
.cp-pub-btn-message{display:flex;align-items:center;gap:6px;background:#fff;color:#0077b5;border:1.5px solid #bae6fd;border-radius:999px;padding:10px 18px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 2px 8px rgba(0,119,181,0.12);transition:all .15s;}
.cp-pub-btn-message:hover{background:#f0f9ff;}
.cp-pub-btn-message:active{transform:scale(.96);}
.cp-pub-btn-message:disabled{opacity:.75;cursor:not-allowed;}

.cp-pub-info{padding:2px 18px 18px 20px;display:flex;flex-direction:column;gap:7px;}
@media(min-width:900px){.cp-pub-info{padding:4px 24px 22px;}}
.cp-pub-followers-row{display:flex;align-items:center;gap:4px;}
.cp-pub-follower-count{font-size:12px;font-weight:700;color:#0077b5;}
.cp-pub-name{font-size:22px;font-weight:800;line-height:1.15;color:#0f172a;letter-spacing:-0.03em;}
@media(min-width:900px){.cp-pub-name{font-size:26px;}}
.cp-pub-industry{font-size:13px;font-weight:500;color:#475569;display:flex;align-items:center;gap:5px;}
.cp-pub-location{font-size:12px;color:#94a3b8;display:flex;align-items:center;gap:3px;}
.cp-pub-website{font-size:12px;font-weight:600;color:#0077b5;text-decoration:none;display:flex;align-items:center;gap:4px;}
.cp-pub-website:hover{text-decoration:underline;}
.cp-pub-bio{font-size:14px;color:#475569;line-height:1.7;}

.cp-pub-section-card{background:#fff;border-radius:16px;box-shadow:0 1px 3px rgba(0,0,0,0.04),0 4px 14px rgba(0,0,0,0.07);border:1px solid rgba(0,0,0,0.04);overflow:hidden;}
@media(max-width:899px){.cp-pub-section-card{margin:10px 12px 0;}}
.cp-pub-accordion-hdr{width:100%;display:flex;align-items:center;justify-content:space-between;padding:14px 18px 12px;border-left:3px solid #0077b5;background:none;border-top:none;border-right:none;border-bottom:1px solid #f1f5f9;cursor:pointer;font-family:'Inter',sans-serif;text-align:left;transition:background .15s;}
.cp-pub-accordion-hdr:hover{background:#f8fafc;}
.cp-pub-section-title{font-size:15px;font-weight:700;color:#0f172a;}
.cp-pub-count-badge{font-size:10px;font-weight:800;background:#f1f5f9;color:#64748b;border-radius:999px;padding:2px 8px;}
.cp-pub-section-body{padding:14px 18px 18px;}
.cp-pub-empty{font-size:13px;color:#94a3b8;padding:8px 0;}

.cp-pub-posts-list{display:flex;flex-direction:column;gap:10px;}
.cp-pub-post-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:13px 15px;cursor:pointer;transition:all .18s;}
.cp-pub-post-card:hover{background:#f0f9ff;border-color:#bae6fd;box-shadow:0 3px 12px rgba(0,119,181,0.1);transform:translateY(-1px);}
.cp-pub-post-top{display:flex;align-items:center;gap:8px;margin-bottom:6px;flex-wrap:wrap;}
.cp-pub-post-type{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.04em;border-radius:6px;padding:3px 9px;}
.cp-pub-post-status{font-size:11px;font-weight:700;color:#64748b;}
.cp-pub-post-proposals{font-size:11px;color:#94a3b8;font-weight:600;margin-left:auto;}
.cp-pub-post-title{font-size:14px;font-weight:700;color:#0f172a;line-height:1.4;margin-bottom:4px;}
.cp-pub-post-desc{font-size:12px;color:#536279;line-height:1.5;margin-bottom:4px;}
.cp-pub-post-budget{font-size:13px;font-weight:800;color:#0077b5;margin-bottom:4px;}
.cp-pub-post-skills{display:flex;flex-wrap:wrap;gap:5px;margin-top:6px;}
.cp-pub-post-skill{font-size:10px;font-weight:600;background:#e0f2fe;color:#0369a1;border-radius:999px;padding:2px 9px;}

.cp-pub-sidebar-right{display:none;grid-area:right-sidebar;}
@media(min-width:900px){.cp-pub-sidebar-right{display:flex;flex-direction:column;gap:10px;padding:24px 14px;background:#f1f5f9;position:sticky;top:0;height:100dvh;overflow-y:auto;}}
.cp-pub-right-card{background:#fff;border-radius:16px;padding:16px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.05);display:flex;flex-direction:column;align-items:center;gap:8px;text-align:center;}
.cp-pub-right-logo{width:64px;height:64px;border-radius:14px;overflow:hidden;background:#e2e5e9;border:2px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,0.1);display:flex;align-items:center;justify-content:center;}
.cp-pub-right-logo img{width:100%;height:100%;object-fit:cover;}
.cp-pub-right-name{font-size:14px;font-weight:700;color:#0f172a;}
.cp-pub-right-industry{font-size:12px;color:#64748b;}
.cp-pub-right-followers{font-size:12px;font-weight:700;color:#0077b5;}
.cp-pub-btn-follow-full{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;background:linear-gradient(135deg,#0284c7,#0077b5);color:#fff;border:none;border-radius:999px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 3px 10px rgba(0,119,181,0.28);transition:all .15s;}
.cp-pub-btn-follow-full:hover{transform:translateY(-1px);}
.cp-pub-btn-follow-full.following{background:#fff;color:#0077b5;border:1.5px solid #bae6fd;box-shadow:0 2px 8px rgba(0,119,181,0.12);}
.cp-pub-btn-follow-full.following:hover{background:#fff;}
.cp-pub-btn-follow-full:disabled{opacity:.7;cursor:not-allowed;}
.cp-pub-btn-msg-full{display:flex;align-items:center;justify-content:center;gap:6px;width:100%;background:#fff;color:#0077b5;border:1.5px solid #bae6fd;border-radius:999px;padding:10px 16px;font-size:13px;font-weight:700;cursor:pointer;font-family:'Inter',sans-serif;box-shadow:0 2px 8px rgba(0,119,181,0.12);transition:all .15s;margin-top:2px;}
.cp-pub-btn-msg-full:hover{background:#f0f9ff;transform:translateY(-1px);}
.cp-pub-btn-msg-full:disabled{opacity:.7;cursor:not-allowed;}
.cp-pub-details-card{background:#fff;border-radius:16px;padding:14px;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,0.05);}
.cp-pub-details-title{font-size:10px;font-weight:800;text-transform:uppercase;letter-spacing:.06em;color:#94a3b8;margin-bottom:10px;}
.cp-pub-detail-row{display:flex;align-items:center;gap:8px;padding:7px 0;border-bottom:1px solid #f1f5f9;font-size:12px;font-weight:500;color:#475569;}
.cp-pub-detail-row:last-child{border-bottom:none;}

.cp-pub-hdr-right{display:flex;align-items:center;gap:8px;}
.cp-pub-hdr-msg-btn{width:38px;height:38px;border-radius:50%;border:1.5px solid #e2e8f0;background:#fff;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:transform .15s;}
.cp-pub-hdr-msg-btn:active{transform:scale(.93);}
.cp-pub-hdr-msg-btn:disabled{opacity:.6;cursor:not-allowed;}
`
