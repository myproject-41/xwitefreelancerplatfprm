'use client'

import { useDeferredValue, useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import PostCard from '../../components/feed/PostCard'
import MainHeader from '../../components/ui/MainHeader'
import { networkService } from '../../services/network.service'
import { postService } from '../../services/post.service'
import { authService } from '../../services/auth.service'
import { useAuthStore } from '../../store/authStore'
import { useFeedStore } from '../../store/feedStore'

const HIDDEN_TRENDING_SKILLS = new Set(['2d post'])

type FeedPost = {
  id: string
  title?: string
  type?: string
  status?: string
  skills?: string[]
  createdAt?: string
  _count?: {
    proposals?: number
  }
}

function getDisplayName(user: any) {
  return (
    user?.freelancerProfile?.fullName ||
    user?.companyProfile?.companyName ||
    user?.clientProfile?.fullName ||
    user?.email ||
    'Xwite Member'
  )
}

function getProfileTitle(user: any) {
  return (
    user?.freelancerProfile?.title ||
    user?.companyProfile?.industry ||
    user?.clientProfile?.workPreference ||
    user?.role?.replace('_', ' ') ||
    'Collaborator'
  )
}

function getProfileImage(user: any) {
  return (
    user?.freelancerProfile?.profileImage ||
    user?.companyProfile?.profileImage ||
    user?.clientProfile?.profileImage ||
    null
  )
}

function getCoverImage(user: any) {
  return (
    user?.freelancerProfile?.coverImage ||
    user?.companyProfile?.coverImage ||
    user?.clientProfile?.coverImage ||
    null
  )
}

function getSkills(user: any) {
  return (
    user?.freelancerProfile?.skills ||
    user?.companyProfile?.hiringSkills ||
    user?.companyProfile?.workType ||
    user?.clientProfile?.taskCategories ||
    []
  )
}

function getInitials(name: string) {
  const parts = name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)

  return parts.map((part) => part[0]?.toUpperCase()).join('') || 'X'
}

function formatRole(role?: string) {
  return role ? role.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : 'Member'
}

function timeAgo(date?: string) {
  if (!date) return 'Recently'
  const diff = Date.now() - new Date(date).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function getNetworkUserInfo(user: any) {
  return {
    id: user?.id || '',
    name:
      user?.freelancerProfile?.fullName ||
      user?.companyProfile?.companyName ||
      user?.clientProfile?.fullName ||
      user?.email ||
      'Xwite Member',
    title:
      user?.freelancerProfile?.title ||
      user?.companyProfile?.industry ||
      user?.clientProfile?.workPreference ||
      formatRole(user?.role),
    image:
      user?.freelancerProfile?.profileImage ||
      user?.companyProfile?.profileImage ||
      user?.clientProfile?.profileImage ||
      null,
    country:
      user?.freelancerProfile?.country ||
      user?.companyProfile?.country ||
      user?.clientProfile?.country ||
      '',
  }
}

function BoltIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
      <path d="M13 2 5 13h5l-1 9 8-11h-5l1-9Z" />
    </svg>
  )
}

export default function HomePage() {
  const router = useRouter()
  const { user, setUser } = useAuthStore()
  const cachedPosts = useFeedStore((state) => state.posts)
  const setCachedPosts = useFeedStore((state) => state.setPosts)
  const [posts, setPosts] = useState<FeedPost[]>(cachedPosts)
  const [loading, setLoading] = useState(cachedPosts.length === 0)
  const [error, setError] = useState('')
  const [sentActions, setSentActions] = useState<Record<string, true>>({})
  const [peopleYouMayKnow, setPeopleYouMayKnow] = useState<any[]>([])
  const [postLikers, setPostLikers] = useState<any[]>([])
  const [showLikersModal, setShowLikersModal] = useState(false)
  const search = useFeedStore((state) => state.search)
  const deferredSearch = useDeferredValue(search.trim())

  useEffect(() => {
    let ignore = false
    let intervalId: number | undefined

    async function loadFeed(showLoader = true) {
      if (!authService.isLoggedIn()) { setLoading(false); return }
      // On first load refresh user so skills/profile are always current
      let currentUser = user
      if (showLoader) {
        try {
          const res = await authService.getMe()
          if (!ignore && res?.data) { setUser(res.data); currentUser = res.data }
        } catch { /* fall back to cached user */ }
      }
      if (!currentUser) { setLoading(false); return }

      if (showLoader) {
        setLoading(true)
      }
      if (showLoader || !posts.length) {
        setError('')
      }

      try {
        const res = await postService.getFeed({
          page: 1,
          limit: 20,
          search: deferredSearch || undefined,
        })
        if (ignore) return
        const nextPosts = res?.data?.posts ?? []
        setPosts(nextPosts)
        setCachedPosts(nextPosts)
      } catch (err: any) {
        if (ignore) return
        setError(err?.response?.data?.message || 'Failed to load home')
      } finally {
        if (!ignore) setLoading(false)
      }
    }

    void loadFeed()
    intervalId = window.setInterval(() => {
      void loadFeed(false)
    }, 15000)

    return () => {
      ignore = true
      if (intervalId) {
        window.clearInterval(intervalId)
      }
    }
  }, [deferredSearch])

  useEffect(() => {
    let ignore = false
    let intervalId: number | undefined

    async function loadSidebarData() {
      if (!user && !authService.isLoggedIn()) return

      try {
        const [suggestionsRes, likersRes] = await Promise.allSettled([
          networkService.getSuggestions(),
          postService.getMyPostLikers(),
        ])

        if (ignore) return

        if (suggestionsRes.status === 'fulfilled') setPeopleYouMayKnow(suggestionsRes.value?.data ?? [])
        if (likersRes.status === 'fulfilled')      setPostLikers(likersRes.value?.data ?? [])
      } catch { /* silent */ }
    }

    void loadSidebarData()
    intervalId = window.setInterval(() => {
      void loadSidebarData()
    }, 15000)

    return () => {
      ignore = true
      if (intervalId) {
        window.clearInterval(intervalId)
      }
    }
  }, [user])

  const visiblePosts = useMemo(() => {
    if (!deferredSearch) return posts

    const query = deferredSearch.toLowerCase()
    return posts.filter((post: any) => {
      const haystack = [
        post.title,
        post.description,
        ...(post.skills ?? []),
        post.client?.freelancerProfile?.fullName,
        post.client?.companyProfile?.companyName,
        post.client?.clientProfile?.fullName,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(query)
    })
  }, [deferredSearch, posts])

  const feedInsights = useMemo(() => {
    const skillsMap = new Map<string, number>()

    visiblePosts.forEach((post) => {
      post.skills?.forEach((skill: string) => {
        const normalized = skill.trim()
        if (!normalized) return
        if (HIDDEN_TRENDING_SKILLS.has(normalized.toLowerCase())) return
        skillsMap.set(normalized, (skillsMap.get(normalized) ?? 0) + 1)
      })
    })

    const trendingSkills = [...skillsMap.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([skill, count]) => ({ skill, count }))

    return { trendingSkills, fromPosts: trendingSkills.length > 0 }
  }, [visiblePosts])

  if (!user) {
    return (
      <main className="min-h-screen bg-[linear-gradient(180deg,#faf9f6_0%,#f3f4ef_100%)] px-6 py-24 text-[#1b1c1a]">
        <div className="mx-auto max-w-3xl rounded-[28px] border border-[#e3e2df] bg-white/90 p-8 shadow-[0_20px_60px_rgba(27,28,26,0.08)] backdrop-blur">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#e8f1f8] px-4 py-2 text-sm font-semibold text-[#005d8f]">
            <BoltIcon />
            Xwite Home
          </div>
          <h1 className="mt-6 max-w-2xl text-4xl font-extrabold tracking-tight text-[#1b1c1a] sm:text-5xl">
            A collaboration home built for people who actually want to ship together.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#5a6470] sm:text-lg">
            Sign in to see live tasks, collaboration requests, and skill exchange posts in the new home layout.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/login"
              className="inline-flex items-center justify-center rounded-full bg-[#005d8f] px-6 py-3 text-sm font-bold text-white shadow-[0_12px_30px_rgba(0,93,143,0.2)] transition hover:bg-[#0b6ea3]"
            >
              Login
            </Link>
            <Link
              href="/signup"
              className="inline-flex items-center justify-center rounded-full border border-[#bfc7d1] bg-white px-6 py-3 text-sm font-bold text-[#404850] transition hover:bg-[#f7f7f5]"
            >
              Create Account
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const displayName = getDisplayName(user)
  const profileTitle = getProfileTitle(user)
  const profileImage = getProfileImage(user)
  const coverImage = getCoverImage(user)
  const skills = getSkills(user).slice(0, 6)
  const totalResponses = visiblePosts.reduce((sum, post) => sum + (post._count?.proposals ?? 0), 0)
  const isFreelancer = user.role === 'FREELANCER'
  const visibleLikers = postLikers.slice(0, 3)
  const visibleSuggestions = peopleYouMayKnow.slice(0, 3)

  const handlePostActionComplete = (postId: string) => {
    setSentActions((current) => ({
      ...current,
      [postId]: true,
    }))
  }

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#faf9f6_0%,#f4f3f0_48%,#efeeeb_100%)] text-[#1b1c1a]">
      <MainHeader />

      <div className="mx-auto grid max-w-screen-xl grid-cols-1 gap-8 px-4 pb-24 pt-24 md:px-6 lg:grid-cols-12">
        <aside className="hidden space-y-4 lg:col-span-3 lg:block">
          <div className="overflow-hidden rounded-xl border border-zinc-200/10 bg-white shadow-sm">
            <div
              className="h-14 bg-[linear-gradient(90deg,rgba(0,93,143,0.2),rgba(69,97,122,0.2))]"
              style={coverImage ? { backgroundImage: `url(${coverImage})`, backgroundSize: 'cover', backgroundPosition: 'center' } : undefined}
            />
            <div className="-mt-8 px-4 pb-5 text-center">
              <div className="mx-auto flex h-20 w-20 items-center justify-center overflow-hidden rounded-xl border-4 border-white bg-[#edf5fb]">
                {profileImage ? (
                  <img src={profileImage} alt={displayName} className="h-full w-full object-cover" />
                ) : (
                  <span className="text-2xl font-extrabold text-[#005d8f]">{getInitials(displayName)}</span>
                )}
              </div>

              <h2 className="mt-2 text-lg font-bold">{displayName}</h2>
              <p className="mt-0.5 text-xs text-[#404850]">{profileTitle}</p>

              <div className="mt-4 space-y-2 border-t border-[#e9e8e5] pt-3 text-left text-xs">
                <div className="flex justify-between">
                  <span className="text-[#404850]">Role</span>
                  <span className="font-bold text-[#005d8f]">{formatRole(user.role)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#404850]">Visible Posts</span>
                  <span className="font-bold text-[#005d8f]">{visiblePosts.length}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[#404850]">Responses</span>
                  <span className="font-bold text-[#005d8f]">{totalResponses}</span>
                </div>
              </div>
            </div>
          </div>

          {isFreelancer ? (
            <div className="rounded-xl border border-zinc-200/10 bg-white p-4 shadow-sm">
              <h3 className="text-sm font-bold">Skills to Offer</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {skills.length ? (
                  skills.map((skill: string) => (
                    <span key={skill} className="rounded-full bg-[#c3e0fe] px-3 py-1 text-[10px] font-bold uppercase text-[#48647d]">
                      {skill}
                    </span>
                  ))
                ) : (
                  <p className="text-sm text-[#404850]">No profile skills added yet.</p>
                )}
              </div>
            </div>
          ) : null}
        </aside>

        <section className="space-y-5 lg:col-span-6">
          {loading ? (
            <div className="rounded-xl border border-zinc-200/10 bg-white p-10 text-center text-sm text-[#404850] shadow-sm">
              Loading home...
            </div>
          ) : error ? (
            <div className="rounded-xl border border-zinc-200/10 bg-white p-10 text-center shadow-sm">
              <p className="text-lg font-bold text-[#1b1c1a]">Unable to load home</p>
              <p className="mt-2 text-sm text-[#404850]">{error}</p>
            </div>
          ) : visiblePosts.length === 0 ? (
            <div className="rounded-xl border border-zinc-200/10 bg-white p-10 text-center shadow-sm">
              <p className="text-lg font-bold text-[#1b1c1a]">{deferredSearch ? 'No matching posts found' : 'No posts available'}</p>
              <p className="mt-2 text-sm text-[#404850]">
                {deferredSearch
                  ? `Try another search for "${deferredSearch}".`
                  : 'Check back later or create a new post from the Post tab.'}
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              {visiblePosts.map((post) => (
                <PostCard
                  key={post.id}
                  post={post}
                  userRole={user.role}
                  viewerId={user.id}
                  hasCompletedAction={Boolean(sentActions[post.id])}
                  onActionComplete={handlePostActionComplete}
                />
              ))}
            </div>
          )}
        </section>

        <aside className="hidden space-y-5 lg:col-span-3 lg:block">
          <div className="rounded-xl border border-zinc-200/10 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4 text-orange-500">
                  <path d="M13 2 5 13h5l-1 9 8-11h-5l1-9Z" />
                </svg>
                <h3 className="text-sm font-bold">Trendy Skills</h3>
              </div>
              <span className="rounded-full bg-orange-50 px-2.5 py-1 text-[10px] font-bold text-orange-600">
                {visiblePosts.length} posts
              </span>
            </div>
            {feedInsights.trendingSkills.length ? (
              <div className="mt-3 space-y-2">
                {feedInsights.trendingSkills.map(({ skill, count }, idx) => (
                  <div key={skill} className="flex items-center gap-2">
                    <span className="w-4 shrink-0 text-[10px] font-bold text-[#b0b8c4]">#{idx + 1}</span>
                    <div className="flex flex-1 items-center justify-between overflow-hidden rounded-lg bg-[#f4f7fa] px-3 py-1.5">
                      <span className="truncate text-[11px] font-bold uppercase text-[#1b3a52]">{skill}</span>
                      <span className="ml-2 shrink-0 rounded-full bg-[#005d8f]/10 px-2 py-0.5 text-[10px] font-extrabold text-[#005d8f]">
                        {count} {count === 1 ? 'post' : 'posts'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : skills.length ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {skills.map((skill: string) => (
                  <span key={skill} className="rounded-full bg-[#c3e0fe] px-3 py-1 text-[10px] font-bold uppercase text-[#48647d]">
                    {skill}
                  </span>
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#404850]">No tagged skills yet.</p>
            )}
          </div>

          <div className="rounded-xl border border-zinc-200/10 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold">People Who Liked Your Posts</h3>
            </div>
            <div className="mt-3 space-y-3">
              {visibleLikers.length ? (
                visibleLikers.map((u: any) => {
                  const liker = getNetworkUserInfo(u)
                  return (
                    <button
                      key={liker.id}
                      type="button"
                      onClick={() => liker.id && router.push(`/profile/${liker.id}`)}
                      className="flex w-full items-center gap-3 rounded-lg bg-[#f4f3f0] p-3 text-left transition hover:bg-[#ece9e2]"
                    >
                      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#c3e0fe] text-sm font-bold text-[#005d8f]">
                        {liker.image ? (
                          <img src={liker.image} alt={liker.name} className="h-full w-full object-cover" />
                        ) : (
                          getInitials(liker.name)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold leading-5 text-[#1b1c1a]">{liker.name}</p>
                        <p className="truncate text-[10px] text-[#404850]">{liker.title}</p>
                      </div>
                    </button>
                  )
                })
              ) : (
                <p className="text-sm text-[#404850]">No likes on your posts yet.</p>
              )}
            </div>
            {postLikers.length > 3 ? (
              <div className="mt-4 border-t border-[#ece9e2] pt-3">
                <button
                  onClick={() => setShowLikersModal(true)}
                  className="text-[11px] font-bold text-[#005d8f] hover:underline"
                >
                  View all
                </button>
              </div>
            ) : null}
          </div>

          {showLikersModal ? (
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
              onClick={() => setShowLikersModal(false)}
            >
              <div
                className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-sm font-bold text-[#1b1c1a]">People Who Liked Your Posts</h2>
                  <button
                    onClick={() => setShowLikersModal(false)}
                    className="text-[#707881] hover:text-[#1b1c1a]"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <div className="max-h-72 space-y-3 overflow-y-auto">
                  {postLikers.map((u: any) => {
                    const liker = getNetworkUserInfo(u)
                    return (
                      <button
                        key={liker.id}
                        type="button"
                        onClick={() => { setShowLikersModal(false); liker.id && router.push(`/profile/${liker.id}`) }}
                        className="flex w-full items-center gap-3 rounded-lg bg-[#f4f3f0] p-3 text-left transition hover:bg-[#ece9e2]"
                      >
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#c3e0fe] text-sm font-bold text-[#005d8f]">
                          {liker.image ? (
                            <img src={liker.image} alt={liker.name} className="h-full w-full object-cover" />
                          ) : (
                            getInitials(liker.name)
                          )}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-bold text-[#1b1c1a]">{liker.name}</p>
                          {liker.title ? <p className="truncate text-[10px] text-[#404850]">{liker.title}</p> : null}
                        </div>
                      </button>
                    )
                  })}
                </div>
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-zinc-200/10 bg-white p-5 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-sm font-bold">May Also Know People</h3>
            </div>
            <div className="mt-3 space-y-3">
              {visibleSuggestions.length ? (
                visibleSuggestions.map((person: any) => {
                  const suggestion = getNetworkUserInfo(person)
                  return (
                    <button
                      key={suggestion.id}
                      type="button"
                      onClick={() => suggestion.id && router.push(`/profile/${suggestion.id}`)}
                      className="flex w-full items-center gap-3 rounded-lg bg-[#f8fafc] p-3 text-left transition hover:bg-[#edf5fb]"
                    >
                      <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full bg-[#dceefc] text-sm font-bold text-[#005d8f]">
                        {suggestion.image ? (
                          <img src={suggestion.image} alt={suggestion.name} className="h-full w-full object-cover" />
                        ) : (
                          getInitials(suggestion.name)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-[#1b1c1a]">{suggestion.name}</p>
                        <p className="truncate text-[10px] text-[#404850]">
                          {suggestion.title}
                          {suggestion.country ? ` - ${suggestion.country}` : ''}
                        </p>
                      </div>
                    </button>
                  )
                })
              ) : (
                <p className="text-sm text-[#404850]">No suggestions available right now.</p>
              )}
            </div>
            {peopleYouMayKnow.length > 3 ? (
              <div className="mt-4 border-t border-[#ece9e2] pt-3">
                <Link href="/network?section=overview" className="text-[11px] font-bold text-[#005d8f] hover:underline">
                  See all in Network
                </Link>
              </div>
            ) : null}
          </div>
        </aside>
      </div>
    </main>
  )
}
