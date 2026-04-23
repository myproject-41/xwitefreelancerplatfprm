'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { postService } from '../../services/post.service'
import { networkService } from '../../services/network.service'

interface PostCardProps {
  post: any
  userRole: string
  viewerId?: string
  hasCompletedAction?: boolean
  onActionComplete?: (postId: string) => void
  detailMode?: boolean
}

function HeartIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M12 20s-7-4.6-7-10.1C5 7.2 6.9 5.5 9.2 5.5c1.5 0 2.3.6 2.8 1.3.5-.7 1.3-1.3 2.8-1.3C17.1 5.5 19 7.2 19 9.9 19 15.4 12 20 12 20Z" />
    </svg>
  )
}

function ShareIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M14 5h5v5" />
      <path d="M10 14 19 5" />
      <path d="M19 13v4a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4" />
    </svg>
  )
}

function BookmarkIcon({ filled = false }: { filled?: boolean }) {
  return (
    <svg viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="1.8" className="h-4 w-4">
      <path d="M7 4.5h10v15l-5-3-5 3v-15Z" />
    </svg>
  )
}

function MoreIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="h-4 w-4">
      <circle cx="6.5" cy="12" r="1.5" />
      <circle cx="12" cy="12" r="1.5" />
      <circle cx="17.5" cy="12" r="1.5" />
    </svg>
  )
}

function formatRole(value?: string) {
  return value ? value.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase()) : 'Member'
}

function getAuthor(post: any) {
  const profile = post.client

  return {
    role: profile?.role,
    name:
      profile?.companyProfile?.companyName ||
      profile?.clientProfile?.fullName ||
      profile?.freelancerProfile?.fullName ||
      'Anonymous',
    image:
      profile?.companyProfile?.profileImage ||
      profile?.clientProfile?.profileImage ||
      profile?.freelancerProfile?.profileImage ||
      null,
    country:
      profile?.companyProfile?.country ||
      profile?.clientProfile?.country ||
      profile?.freelancerProfile?.country ||
      '',
    title:
      profile?.companyProfile?.industry ||
      profile?.clientProfile?.workPreference ||
      profile?.freelancerProfile?.title ||
      formatRole(profile?.role),
  }
}

function getInitials(name: string) {
  const parts = name
    .split(' ')
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2)

  return parts.map((part) => part[0]?.toUpperCase()).join('') || 'X'
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const hours = Math.floor(diff / 3600000)
  if (hours < 1) return 'Just now'
  if (hours < 24) return `${hours}h ago`
  return `${Math.floor(hours / 24)}d ago`
}

function formatTimestamp(date?: string) {
  if (!date) return ''

  try {
    return new Intl.DateTimeFormat('en-IN', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(date))
  } catch {
    return date
  }
}

function compactBudget(post: any) {
  if (!post.budget) return null

  try {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(post.budget)
  } catch {
    return `INR ${post.budget}`
  }
}

export default function PostCard({
  post,
  userRole,
  viewerId,
  hasCompletedAction = false,
  onActionComplete,
  detailMode = false,
}: PostCardProps) {
  const router = useRouter()
  const [showProposal, setShowProposal] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const [proposedRate, setProposedRate] = useState('')
  const [loading, setLoading] = useState(false)
  const [liked, setLiked] = useState(Boolean(post.viewerHasLiked))
  const [likesCount, setLikesCount] = useState(Number(post.likesCount ?? 0))
  const [likeLoading, setLikeLoading] = useState(false)
  const [bookmarked, setBookmarked] = useState(false)
  const [localActionCompleted, setLocalActionCompleted] = useState(false)
  const [, setClock] = useState(() => Date.now())
  const [showLikersModal, setShowLikersModal] = useState(false)
  const [likers, setLikers] = useState<any[]>([])
  const [likersLoading, setLikersLoading] = useState(false)

  const author = getAuthor(post)
  const targetUserId = post.client?.id || post.clientId || ''
  const isOwner = Boolean(viewerId && targetUserId && viewerId === targetUserId)
  const budget = compactBudget(post)
  const actionKind =
    author.role === 'FREELANCER'
      ? 'connect'
      : author.role === 'CLIENT'
        ? 'collaborate'
        : 'apply'

  const actionLabel =
    actionKind === 'connect'
      ? 'Connect'
      : actionKind === 'collaborate'
        ? 'Collaborate'
        : 'Apply'

  const proposalHeading =
    actionKind === 'connect'
      ? 'Connect with this freelancer'
      : actionKind === 'collaborate'
        ? 'Send a collaboration message'
        : 'Apply to this opportunity'

  const proposalPlaceholder =
    actionKind === 'collaborate'
      ? 'Share how you would like to collaborate on this post.'
      : 'Explain why you are a strong fit for this opportunity.'

  const requiresRate = false
  const completedLabel =
    actionKind === 'connect'
      ? post.viewerConnectionStatus === 'ACCEPTED'
        ? 'Connected'
        : 'Request Sent'
      : actionKind === 'collaborate'
        ? 'Task In Progress'
        : 'Applied'
  const hasExistingConnection =
    actionKind === 'connect' &&
    (post.viewerConnectionStatus === 'ACCEPTED' ||
      (post.viewerConnectionStatus === 'PENDING' && Boolean(post.viewerInitiatedConnection)))
  const hasExistingProposal = actionKind !== 'connect' && Boolean(post.viewerHasApplied)
  const isActionCompleted = localActionCompleted || hasCompletedAction || hasExistingConnection || hasExistingProposal
  const postHref = `/posts/${post.id}`

  useEffect(() => {
    const interval = window.setInterval(() => {
      setClock(Date.now())
    }, 60000)

    return () => {
      window.clearInterval(interval)
    }
  }, [])

  useEffect(() => {
    setLiked(Boolean(post.viewerHasLiked))
    setLikesCount(Number(post.likesCount ?? 0))
  }, [post.id, post.viewerHasLiked, post.likesCount])

  const openPost = () => {
    router.push(postHref)
  }

  const handleLike = async () => {
    if (!viewerId || likeLoading) return

    const nextLiked = !liked
    const previousLiked = liked
    const previousCount = likesCount

    setLiked(nextLiked)
    setLikesCount((current) => Math.max(0, current + (nextLiked ? 1 : -1)))
    setLikeLoading(true)

    try {
      const res = nextLiked
        ? await postService.likePost(post.id)
        : await postService.unlikePost(post.id)

      setLiked(Boolean(res?.data?.viewerHasLiked))
      setLikesCount(Number(res?.data?.likesCount ?? 0))
    } catch (error: any) {
      setLiked(previousLiked)
      setLikesCount(previousCount)
      toast.error(error?.response?.data?.message || 'Failed to update like')
    } finally {
      setLikeLoading(false)
    }
  }

  const handleShare = async () => {
    const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}${postHref}` : postHref
    const sharePayload = {
      title: post.title || 'Xwite post',
      text: post.description || 'Check out this post on Xwite.',
      url: shareUrl,
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(sharePayload)
        toast.success('Post shared successfully!')
        return
      }

      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Post link copied to clipboard!')
        return
      }

      toast.success(`Share this link: ${shareUrl}`)
    } catch (error: any) {
      if (error?.name === 'AbortError') return
      toast.error('Unable to share this post right now')
    }
  }

  const openLikersModal = async () => {
    setShowLikersModal(true)
    if (likers.length) return
    setLikersLoading(true)
    try {
      const res = await postService.getPostLikers(post.id)
      setLikers(res?.data ?? [])
    } catch {
      setLikers([])
    } finally {
      setLikersLoading(false)
    }
  }

  const handleProposal = async () => {
    if (loading) return
    if (coverLetter.length < 50) return toast.error('Cover letter must be at least 50 characters')
    if (requiresRate && !proposedRate.trim()) return toast.error('Rate is required to apply')
    const previousCoverLetter = coverLetter
    const previousProposedRate = proposedRate

    setLoading(true)
    setLocalActionCompleted(true)
    setShowProposal(false)
    setCoverLetter('')
    setProposedRate('')

    try {
      await postService.sendProposal(post.id, {
        coverLetter: previousCoverLetter,
        proposedRate: requiresRate && previousProposedRate ? Number(previousProposedRate) : undefined,
      })
      toast.success(
        actionKind === 'collaborate'
          ? 'Collaboration message sent to the client!'
          : 'Application sent to the client!'
      )
      onActionComplete?.(post.id)
    } catch (error: any) {
      setLocalActionCompleted(false)
      setCoverLetter(previousCoverLetter)
      setProposedRate(previousProposedRate)
      toast.error(error.response?.data?.message || `Failed to ${actionLabel.toLowerCase()}`)
    } finally {
      setLoading(false)
    }
  }

  const handleConnect = async () => {
    if (loading) return
    if (!targetUserId) return toast.error('Unable to find this user')
    setLoading(true)
    setLocalActionCompleted(true)
    setShowProposal(false)

    try {
      await networkService.sendRequest(targetUserId)
      toast.success('Connection request sent. The freelancer can accept or ignore it from Network.')
      onActionComplete?.(post.id)
    } catch (error: any) {
      setLocalActionCompleted(false)
      toast.error(error.response?.data?.message || 'Failed to send connection request')
    } finally {
      setLoading(false)
    }
  }

  const postStatus: string = post.status ?? 'OPEN'
  const isInProgress = postStatus === 'IN_PROGRESS'
  const isCompleted  = postStatus === 'COMPLETED' || postStatus === 'CLOSED'
  const isNotOpen    = postStatus !== 'OPEN'
  const showViewerTaskStatus = !isOwner && isActionCompleted && actionKind === 'collaborate'
  const showClosedStatus = !isOwner && isNotOpen && !showViewerTaskStatus && (isCompleted || hasExistingProposal)
  const showInProgressBadge = isInProgress && (isOwner || isActionCompleted)

  return (
    <article className="relative overflow-hidden rounded-xl border border-[rgba(228,228,231,0.1)] bg-white shadow-[0_1px_3px_rgba(0,0,0,0.08)] transition hover:shadow-[0_8px_24px_rgba(27,28,26,0.08)]">
      {/* Status badge — top-right corner */}
      {showInProgressBadge && (
        <span className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-blue-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-blue-700">
          <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-500" />
          In Progress
        </span>
      )}
      {isCompleted && (
        <span className="absolute right-3 top-3 z-10 flex items-center gap-1 rounded-full bg-green-100 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-green-700">
          <span className="h-1.5 w-1.5 rounded-full bg-green-500" />
          Done
        </span>
      )}
      <div className="p-5">
        <div className="mb-4 flex items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-3">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#edf5fb] text-sm font-bold text-[#005d8f]">
              {author.image ? (
                <img src={author.image} alt={author.name} className="h-full w-full object-cover" />
              ) : (
                getInitials(author.name)
              )}
            </div>

            <div className="min-w-0">
              <p className="truncate font-[Manrope] text-sm font-bold text-[#1b1c1a]">{author.name}</p>
              <p className="truncate text-[11px] text-[#404850]">
                {author.title}
                {author.country ? ` - ${author.country}` : ''}
                {post.createdAt ? ` - ${timeAgo(post.createdAt)}` : ''}
              </p>
              {post.createdAt ? (
                <p className="mt-1 truncate text-[10px] text-[#707881]">{formatTimestamp(post.createdAt)}</p>
              ) : null}
            </div>
          </div>

          <button
            type="button"
            onClick={() => toast('More actions coming soon!')}
            className="rounded-full p-1 text-[#404850] transition hover:bg-[#f4f3f0]"
            aria-label="Post actions"
          >
            <MoreIcon />
          </button>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex flex-wrap items-center gap-2">
            {budget ? (
              <span className="text-sm font-extrabold text-[#005d8f]">{budget}</span>
            ) : null}
          </div>

          <button
            type="button"
            onClick={detailMode ? undefined : openPost}
            className={`text-left font-[Manrope] text-xl font-extrabold leading-[1.35] tracking-[-0.015em] text-[#005d8f] ${
              detailMode ? 'cursor-default' : 'hover:underline'
            }`}
          >
            {post.title}
          </button>

          <p className={`text-sm leading-[1.6] text-[#1b1c1a] ${expanded || detailMode ? '' : 'line-clamp-4'}`}>
            {post.description}
          </p>

          {post.description?.length > 180 && !detailMode ? (
            <button
              onClick={() => setExpanded((value) => !value)}
              className="-mt-1 w-fit text-xs font-bold text-[#005d8f] hover:underline"
            >
              {expanded ? 'Show less' : 'Read more'}
            </button>
          ) : null}

          {post.skills?.length > 0 ? (
            <div className="flex flex-wrap gap-2 py-2">
              {post.skills.slice(0, 6).map((skill: string) => (
                <span
                  key={skill}
                  className="rounded-full bg-[#e9e8e5] px-3 py-1 text-[10px] font-bold uppercase tracking-[0.06em] text-[#005d8f]"
                >
                  {skill}
                </span>
              ))}
            </div>
          ) : null}

          {!detailMode ? (
            <button
              type="button"
              onClick={openPost}
              className="w-fit text-xs font-bold uppercase tracking-[0.18em] text-[#707881] transition hover:text-[#005d8f]"
            >
              View post
            </button>
          ) : null}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-[#ece9e2] pt-4 text-xs text-[#707881]">
          <div className="inline-flex items-center gap-1.5">
            <button
              onClick={() => void handleLike()}
              disabled={!viewerId || likeLoading}
              className={`inline-flex items-center gap-1.5 transition ${
                liked ? 'text-[#005d8f]' : 'hover:text-[#005d8f]'
              } ${!viewerId || likeLoading ? 'cursor-not-allowed opacity-70' : ''}`}
            >
              <HeartIcon filled={liked} />
              <span>{likesCount}</span>
            </button>
            {likesCount > 3 ? (
              <button
                onClick={() => void openLikersModal()}
                className="ml-1 text-[11px] font-semibold text-[#005d8f] hover:underline"
              >
                View
              </button>
            ) : null}
          </div>

          <button
            onClick={() => void handleShare()}
            className="inline-flex items-center gap-1.5 transition hover:text-[#005d8f]"
          >
            <ShareIcon />
            <span>Share</span>
          </button>

          <button
            onClick={() => {
              const next = !bookmarked
              setBookmarked(next)
              toast.success(next ? 'Post saved!' : 'Removed from saved')
            }}
            className={`ml-auto inline-flex items-center gap-1.5 transition ${bookmarked ? 'text-[#005d8f]' : 'hover:text-[#005d8f]'}`}
          >
            <BookmarkIcon filled={bookmarked} />
            <span>{bookmarked ? 'Saved' : 'Save'}</span>
          </button>
        </div>

        <div className="mt-6 flex gap-3">
          {userRole ? (
            showClosedStatus ? (
              <span className={`flex-1 rounded-lg px-4 py-2.5 text-center text-sm font-bold cursor-not-allowed ${
                isCompleted
                  ? 'bg-green-50 text-green-700 border border-green-200'
                  : 'bg-blue-50 text-blue-700 border border-blue-200'
              }`}>
                {isCompleted ? '✓ Task Completed' : '⏳ Task In Progress'}
              </span>
            ) : (
              <button
                onClick={() => {
                  if (isOwner) {
                    if (!detailMode) openPost()
                    return
                  }
                  if (isActionCompleted) return
                  if (actionKind === 'connect') {
                    void handleConnect()
                    return
                  }
                  setShowProposal((value) => !value)
                }}
                disabled={!isOwner && isActionCompleted}
                className={`flex-1 rounded-lg px-4 py-2.5 text-sm font-bold transition ${
                  isOwner
                    ? 'border border-[#d7dde4] bg-white text-[#005d8f] shadow-none hover:bg-[#f8fafc]'
                    : isActionCompleted
                      ? 'cursor-not-allowed border border-[#d7dde4] bg-white text-[#6b7280] shadow-none'
                    : 'bg-[linear-gradient(to_right,#005d8f,#0077b5)] text-white shadow-[0_2px_8px_rgba(0,93,143,0.3)] hover:opacity-95 active:scale-[0.97]'
                }`}
              >
                {isOwner
                  ? 'View'
                  : isActionCompleted
                  ? completedLabel
                  : showProposal
                      ? 'Cancel'
                      : actionLabel}
              </button>
            )
          ) : null}
        </div>

        {showProposal && actionKind !== 'connect' && !isActionCompleted ? (
          <div className="mt-5 rounded-[20px] border border-[#ece9e2] bg-[#fbfaf7] p-4">
            <p className="text-sm font-extrabold text-[#1b1c1a]">{proposalHeading}</p>

            <div className="mt-4">
              <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#707881]">
                Message
              </label>
              <textarea
                value={coverLetter}
                onChange={(e) => setCoverLetter(e.target.value)}
                rows={4}
                className="mt-2 w-full resize-none rounded-2xl border-none bg-[#efeeeb] p-3 text-sm text-[#1b1c1a] outline-none ring-0 placeholder:text-[#8b949e] focus:ring-2 focus:ring-[#005d8f]"
                placeholder={proposalPlaceholder}
              />
              <p className={`mt-1 text-xs ${coverLetter.length < 50 ? 'text-red-500' : 'text-emerald-600'}`}>
                {coverLetter.length} / 50 minimum
              </p>
            </div>

            {requiresRate ? (
              <div className="mt-4">
                <label className="text-[11px] font-bold uppercase tracking-[0.18em] text-[#707881]">
                  Your Rate
                </label>
                <input
                  type="number"
                  value={proposedRate}
                  onChange={(e) => setProposedRate(e.target.value)}
                  className="mt-2 w-full rounded-2xl border-none bg-[#efeeeb] p-3 text-sm text-[#1b1c1a] outline-none placeholder:text-[#8b949e] focus:ring-2 focus:ring-[#005d8f]"
                  placeholder="Your proposed rate in INR"
                />
              </div>
            ) : null}

            <button
              onClick={handleProposal}
              disabled={loading}
              className="mt-4 w-full rounded-full bg-[linear-gradient(135deg,#005d8f_0%,#0077b5_100%)] py-3 text-sm font-bold text-white shadow-[0_12px_28px_rgba(0,93,143,0.22)] transition hover:opacity-95 disabled:opacity-60"
            >
              {actionLabel}
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
              <h2 className="text-sm font-bold text-[#1b1c1a]">People Who Liked This Post</h2>
              <button
                onClick={() => setShowLikersModal(false)}
                className="text-[#707881] hover:text-[#1b1c1a]"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-5 w-5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
            {likersLoading ? (
              <p className="text-center text-sm text-[#707881]">Loading...</p>
            ) : likers.length ? (
              <div className="max-h-72 space-y-3 overflow-y-auto">
                {likers.map((u: any) => {
                  const name =
                    u.freelancerProfile?.fullName ||
                    u.companyProfile?.companyName ||
                    u.clientProfile?.fullName ||
                    'Xwite Member'
                  const title =
                    u.freelancerProfile?.title ||
                    u.companyProfile?.industry ||
                    u.clientProfile?.workPreference ||
                    u.role?.replace(/_/g, ' ')
                  const image =
                    u.freelancerProfile?.profileImage ||
                    u.companyProfile?.profileImage ||
                    u.clientProfile?.profileImage ||
                    null
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => { setShowLikersModal(false); router.push(`/users/${u.id}`) }}
                      className="flex w-full items-center gap-3 rounded-lg bg-[#f4f3f0] p-3 text-left transition hover:bg-[#ece9e2]"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#c3e0fe] text-sm font-bold text-[#005d8f]">
                        {image ? (
                          <img src={image} alt={name} className="h-full w-full object-cover" />
                        ) : (
                          getInitials(name)
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-xs font-bold text-[#1b1c1a]">{name}</p>
                        {title ? <p className="truncate text-[10px] text-[#404850]">{title}</p> : null}
                      </div>
                    </button>
                  )
                })}
              </div>
            ) : (
              <p className="text-sm text-[#404850]">No likes yet.</p>
            )}
          </div>
        </div>
      ) : null}
    </article>
  )
}
