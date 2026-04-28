'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { useAuthStore } from '../../../store/authStore'
import { agentService } from '../../../services/agent.service'
import { postService } from '../../../services/post.service'

// ─── Types ────────────────────────────────────────────────────────────────────

interface Task {
  id: string
  title: string
  description: string
  budget: number | null
  skills: string[]
  deadline: string | null
  proposalCount: number
  matchScore: number
  matchedSkills?: string[]
  client: { id: string; name: string; image: string | null }
}

interface Freelancer {
  userId: string
  fullName: string | null
  title: string | null
  profileImage: string | null
  skills: string[]
  matchedSkills: string[]
  hourlyRate: number | null
  fixedPrice: number | null
  experienceLevel: string | null
  avgRating: number | null
  totalReviews: number | null
  country: string | null
  matchScore: number
}

interface FreelancerTiers {
  expert: Freelancer[]
  intermediate: Freelancer[]
  beginner: Freelancer[]
}

interface Post {
  id: string
  title: string
  type: string
  description: string
  skills: string[]
  budget: number | null
  status: string
  _count: { proposals: number }
}

type FlowStep =
  | 'home'
  | 'find_tasks_loading'
  | 'find_tasks_result'
  | 'hire_posts_loading'
  | 'hire_posts_list'
  | 'hire_freelancers_loading'
  | 'hire_freelancers_result'

function getInitials(name?: string | null) {
  return (name || 'X')
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || 'X'
}

function Avatar({ src, name, size = 40 }: { src?: string | null; name?: string | null; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: '#e8f4fd', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size * 0.35, fontWeight: 700,
      color: '#005d8f', overflow: 'hidden',
    }}>
      {src
        ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
        : getInitials(name)}
    </div>
  )
}

// ─── Task card ────────────────────────────────────────────────────────────────

function TaskCard({ task, onApply }: { task: Task; onApply: (task: Task) => void }) {
  const [applying, setApplying] = useState(false)
  const [done, setDone] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [coverLetter, setCoverLetter] = useState('')
  const [proposedRate, setProposedRate] = useState('')
  const [estimatedDays, setEstimatedDays] = useState('')

  const submit = async () => {
    if (coverLetter.trim().length < 50) return toast.error('Cover letter must be at least 50 characters')
    const days = Number(estimatedDays)
    if (!estimatedDays || isNaN(days) || days < 1 || days > 365) return toast.error('Enter a valid timeline (1–365 days)')
    setApplying(true)
    try {
      await postService.sendProposal(task.id, {
        coverLetter: coverLetter.trim(),
        proposedRate: proposedRate ? Number(proposedRate) : undefined,
        estimatedDays: days,
      })
      setDone(true)
      setShowForm(false)
      toast.success('Proposal sent!')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to apply')
    } finally {
      setApplying(false)
    }
  }

  return (
    <div style={{ background: '#fff', border: '1.5px solid #e0e7ef', borderRadius: 16, padding: '16px 18px', marginBottom: 12 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Avatar src={task.client.image} name={task.client.name} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1b1c1a' }}>{task.title}</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707881' }}>by {task.client.name}</p>
        </div>
        {task.budget != null && (
          <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '3px 10px', borderRadius: 8, flexShrink: 0 }}>
            ₹{Number(task.budget).toLocaleString('en-IN')}
          </span>
        )}
      </div>

      <p style={{ margin: '10px 0 8px', fontSize: 13, color: '#374151', lineHeight: 1.55 }}>
        {task.description.length > 160 ? `${task.description.slice(0, 160)}…` : task.description}
      </p>

      {task.skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
          {task.skills.slice(0, 6).map(s => (
            <span key={s} style={{
              fontSize: 11, fontWeight: 600, padding: '3px 10px', borderRadius: 20,
              background: task.matchedSkills?.includes(s) ? '#e8f4fd' : '#f3f4f6',
              color: task.matchedSkills?.includes(s) ? '#005d8f' : '#6b7280',
              border: `1px solid ${task.matchedSkills?.includes(s) ? '#bdd8f0' : '#e5e7eb'}`,
            }}>
              {s}
            </span>
          ))}
        </div>
      )}

      {!showForm && !done && (
        <button
          type="button"
          onClick={() => setShowForm(true)}
          style={{
            width: '100%', padding: '10px', borderRadius: 12,
            background: 'linear-gradient(135deg,#005d8f,#0077b5)',
            color: '#fff', border: 'none', fontSize: 14, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Make it →
        </button>
      )}

      {done && (
        <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: 12, fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
          ✓ Proposal sent!
        </div>
      )}

      {showForm && (
        <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 10 }}>
          <textarea
            value={coverLetter}
            onChange={e => setCoverLetter(e.target.value)}
            placeholder="Write your cover letter (min. 50 characters)…"
            rows={4}
            style={{
              width: '100%', padding: '10px 12px', borderRadius: 10,
              border: '1.5px solid #cbd5e1', fontSize: 13, resize: 'vertical',
              fontFamily: 'Inter,sans-serif', outline: 'none', boxSizing: 'border-box',
            }}
          />
          <div style={{ display: 'flex', gap: 8 }}>
            <input
              type="number"
              value={proposedRate}
              onChange={e => setProposedRate(e.target.value)}
              placeholder="Bid amount (₹)"
              style={{
                flex: 1, padding: '9px 12px', borderRadius: 10,
                border: '1.5px solid #cbd5e1', fontSize: 13, outline: 'none',
              }}
            />
            <input
              type="number"
              min={1} max={365}
              value={estimatedDays}
              onChange={e => setEstimatedDays(e.target.value)}
              placeholder="Days to deliver *"
              style={{
                flex: 1, padding: '9px 12px', borderRadius: 10,
                border: '1.5px solid #cbd5e1', fontSize: 13, outline: 'none',
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={submit} disabled={applying}
              style={{
                flex: 1, padding: '10px', borderRadius: 10,
                background: 'linear-gradient(135deg,#005d8f,#0077b5)',
                color: '#fff', border: 'none', fontSize: 13, fontWeight: 700,
                cursor: applying ? 'not-allowed' : 'pointer', opacity: applying ? .65 : 1,
              }}>
              {applying ? 'Sending…' : 'Send Proposal'}
            </button>
            <button type="button" onClick={() => setShowForm(false)}
              style={{
                padding: '10px 16px', borderRadius: 10, background: '#f3f4f6',
                color: '#374151', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer',
              }}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Freelancer card ──────────────────────────────────────────────────────────

function FreelancerCard({
  freelancer,
  taskTitle,
  onRequestSent,
}: {
  freelancer: Freelancer
  taskTitle: string
  onRequestSent: (userId: string) => void
}) {
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  const sendReq = async () => {
    setSending(true)
    try {
      await agentService.sendRequest(freelancer.userId, taskTitle)
      setSent(true)
      onRequestSent(freelancer.userId)
      toast.success('Connection request sent!')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to send request')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ background: '#fff', border: '1.5px solid #e0e7ef', borderRadius: 14, padding: '14px 16px', marginBottom: 10 }}>
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
        <Avatar src={freelancer.profileImage} name={freelancer.fullName} size={42} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1b1c1a' }}>{freelancer.fullName || 'Freelancer'}</p>
          {freelancer.title && <p style={{ margin: 0, fontSize: 12, color: '#707881' }}>{freelancer.title}</p>}
          {freelancer.avgRating != null && freelancer.avgRating > 0 && (
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#d97706' }}>
              ★ {Number(freelancer.avgRating).toFixed(1)} ({freelancer.totalReviews} reviews)
            </p>
          )}
        </div>
        {(freelancer.hourlyRate || freelancer.fixedPrice) && (
          <span style={{ fontSize: 12, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '3px 8px', borderRadius: 8, flexShrink: 0 }}>
            ₹{(freelancer.hourlyRate || freelancer.fixedPrice)?.toLocaleString('en-IN')}{freelancer.hourlyRate ? '/hr' : ''}
          </span>
        )}
      </div>

      {freelancer.matchedSkills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 10 }}>
          {freelancer.matchedSkills.map(s => (
            <span key={s} style={{
              fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
              background: '#e8f4fd', color: '#005d8f', border: '1px solid #bdd8f0',
            }}>
              {s}
            </span>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <Link
          href={`/profile/${freelancer.userId}`}
          style={{
            flex: 1, padding: '8px 12px', borderRadius: 10,
            background: '#f0f7ff', color: '#005d8f',
            border: '1.5px solid #bdd8f0',
            fontSize: 13, fontWeight: 600, textDecoration: 'none',
            textAlign: 'center',
          }}
        >
          View Profile
        </Link>
        {sent ? (
          <div style={{
            flex: 1, padding: '8px 12px', borderRadius: 10,
            background: '#f0fdf4', color: '#16a34a',
            fontSize: 13, fontWeight: 700, textAlign: 'center',
          }}>
            ✓ Request sent
          </div>
        ) : (
          <button type="button" onClick={sendReq} disabled={sending}
            style={{
              flex: 1, padding: '8px 12px', borderRadius: 10,
              background: 'linear-gradient(135deg,#005d8f,#0077b5)',
              color: '#fff', border: 'none',
              fontSize: 13, fontWeight: 700, cursor: sending ? 'not-allowed' : 'pointer',
              opacity: sending ? .65 : 1,
            }}>
            {sending ? '…' : 'Send Request'}
          </button>
        )}
      </div>
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AgentPage() {
  const { user } = useAuthStore()
  const router = useRouter()
  const role = (user as any)?.role as string | undefined

  const isFreelancer = role === 'FREELANCER'
  const isHirer = role === 'CLIENT' || role === 'COMPANY'

  const [step, setStep] = useState<FlowStep>('home')
  const [tasks, setTasks] = useState<Task[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [tiers, setTiers] = useState<FreelancerTiers | null>(null)
  const [activeTier, setActiveTier] = useState<'expert' | 'intermediate' | 'beginner'>('expert')
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set())

  const findJobs = async () => {
    setStep('find_tasks_loading')
    try {
      const res = await agentService.findTasks()
      setTasks(res?.data ?? [])
      setStep('find_tasks_result')
    } catch {
      toast.error('Failed to fetch matching tasks')
      setStep('home')
    }
  }

  const startHire = async () => {
    setStep('hire_posts_loading')
    try {
      const res = await agentService.getMyPosts()
      setPosts(res?.data ?? [])
      setStep('hire_posts_list')
    } catch {
      toast.error('Failed to load your posts')
      setStep('home')
    }
  }

  const selectPost = async (post: Post) => {
    setSelectedPost(post)
    setStep('hire_freelancers_loading')
    try {
      const res = await agentService.findFreelancers(post.id)
      setTiers(res?.data?.tiers ?? null)
      setStep('hire_freelancers_result')
    } catch {
      toast.error('Failed to find freelancers')
      setStep('hire_posts_list')
    }
  }

  const reset = () => {
    setStep('home')
    setTasks([])
    setPosts([])
    setSelectedPost(null)
    setTiers(null)
    setSentRequests(new Set())
  }

  const tierColors: Record<string, { bg: string; color: string; border: string; label: string }> = {
    expert: { bg: '#fef3c7', color: '#d97706', border: '#fde68a', label: 'Expert' },
    intermediate: { bg: '#e8f4fd', color: '#005d8f', border: '#bdd8f0', label: 'Intermediate' },
    beginner: { bg: '#f3f4f6', color: '#374151', border: '#e5e7eb', label: 'Beginner' },
  }

  const totalFreelancers = tiers
    ? tiers.expert.length + tiers.intermediate.length + tiers.beginner.length
    : 0

  return (
    <main style={{ minHeight: '100vh', background: '#EDF1F7', paddingBottom: 100 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        body{font-family:'Inter',sans-serif;}
        .agent-btn{transition:all .15s;font-family:'Inter',sans-serif;}
        .agent-btn:hover{opacity:.9;transform:translateY(-1px);}
        .tier-tab{padding:8px 18px;border-radius:20px;font-size:13px;font-weight:600;border:none;cursor:pointer;transition:all .15s;font-family:'Inter',sans-serif;}
      `}</style>

      {/* Header */}
      <div style={{
        background: 'linear-gradient(135deg,#005d8f 0%,#0077b5 100%)',
        padding: '52px 20px 24px', color: '#fff',
      }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', opacity: .75 }}>
            AI-Powered
          </p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
            <div style={{
              width: 48, height: 48, borderRadius: 14,
              background: 'rgba(255,255,255,.2)',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26,
            }}>
              🤖
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>AI Agent</h1>
              <p style={{ margin: '2px 0 0', fontSize: 13, opacity: .8 }}>
                {isFreelancer ? 'Find tasks matching your skills' : 'Find the right freelancer for your work'}
              </p>
            </div>
          </div>

          {step !== 'home' && (
            <button
              type="button"
              onClick={reset}
              className="agent-btn"
              style={{
                marginTop: 16, padding: '7px 16px', borderRadius: 20,
                background: 'rgba(255,255,255,.2)', color: '#fff',
                border: '1px solid rgba(255,255,255,.35)',
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
              }}
            >
              ← Start over
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '20px auto 0', padding: '0 12px' }}>

        {/* ── Home ── */}
        {step === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{
              background: '#fff', borderRadius: 20,
              boxShadow: '0 2px 16px rgba(0,0,0,.07)', overflow: 'hidden',
            }}>
              <div style={{ padding: '20px 20px 8px', borderBottom: '1px solid #f0f3f6' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#707881' }}>
                  What would you like to do?
                </p>
              </div>

              {isFreelancer && (
                <button
                  type="button"
                  onClick={findJobs}
                  className="agent-btn"
                  style={{
                    width: '100%', padding: '20px', textAlign: 'left',
                    background: 'none', border: 'none', cursor: 'pointer',
                    borderBottom: '1px solid #f0f3f6',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                      background: '#e8f4fd', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                    }}>
                      🔍
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1b1c1a' }}>Find job for me</p>
                      <p style={{ margin: '3px 0 0', fontSize: 13, color: '#707881' }}>
                        I'll search tasks that match your skills and suggest the best ones
                      </p>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: 18, color: '#005d8f' }}>→</span>
                  </div>
                </button>
              )}

              {isHirer && (
                <button
                  type="button"
                  onClick={startHire}
                  className="agent-btn"
                  style={{
                    width: '100%', padding: '20px', textAlign: 'left',
                    background: 'none', border: 'none', cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{
                      width: 48, height: 48, borderRadius: 12, flexShrink: 0,
                      background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                    }}>
                      👥
                    </div>
                    <div>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1b1c1a' }}>Help me hire</p>
                      <p style={{ margin: '3px 0 0', fontSize: 13, color: '#707881' }}>
                        I'll review your posts and find expert, intermediate, and beginner freelancers
                      </p>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: 18, color: '#005d8f' }}>→</span>
                  </div>
                </button>
              )}

              {!isFreelancer && !isHirer && (
                <div style={{ padding: 24, textAlign: 'center', color: '#707881', fontSize: 14 }}>
                  Complete your profile setup to use AI Agent features.
                </div>
              )}
            </div>

            <div style={{
              background: 'rgba(0,93,143,.06)', border: '1px solid #bdd8f0',
              borderRadius: 16, padding: '14px 16px',
            }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#005d8f' }}>
                🤖 How the AI Agent works
              </p>
              <p style={{ margin: '6px 0 0', fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                {isFreelancer
                  ? 'Your agent reads your skills profile and finds open TASK posts that match — ranked by skill overlap. Click "Make it" to send a proposal directly.'
                  : 'Your agent reviews your recent posts and finds freelancers ranked by skill match and experience level. Send a connection request from here — they\'ll be notified.'}
              </p>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {(step === 'find_tasks_loading' || step === 'hire_posts_loading' || step === 'hire_freelancers_loading') && (
          <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,.07)', padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 16 }}>🤖</div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1b1c1a' }}>
              {step === 'find_tasks_loading' ? 'Finding matching tasks…' :
               step === 'hire_posts_loading' ? 'Loading your posts…' :
               'Finding freelancers…'}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#707881' }}>Hang tight, analysing now</p>
          </div>
        )}

        {/* ── Task results (freelancer) ── */}
        {step === 'find_tasks_result' && (
          <div>
            <div style={{ marginBottom: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1b1c1a' }}>
                  {tasks.length > 0 ? `${tasks.length} tasks found` : 'No tasks found'}
                </p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#707881' }}>Ranked by skill match</p>
              </div>
            </div>

            {tasks.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,.07)', padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <p style={{ margin: 0, fontWeight: 700, color: '#1b1c1a', fontSize: 15 }}>No matching tasks right now</p>
                <p style={{ margin: '6px 0 0', color: '#707881', fontSize: 13 }}>
                  Update your skills profile or check back later as new tasks are posted.
                </p>
                <Link href="/post" style={{ display: 'inline-block', marginTop: 16, padding: '10px 20px', borderRadius: 10, background: '#0077b5', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                  Browse all posts
                </Link>
              </div>
            ) : (
              tasks.map(task => (
                <TaskCard key={task.id} task={task} onApply={() => {}} />
              ))
            )}
          </div>
        )}

        {/* ── Posts list (hirer) ── */}
        {step === 'hire_posts_list' && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1b1c1a' }}>
                {posts.length > 0 ? 'Select a post to find freelancers for' : 'No active posts'}
              </p>
              <p style={{ margin: '3px 0 0', fontSize: 12, color: '#707881' }}>Your most recent active posts</p>
            </div>

            {posts.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,.07)', padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <p style={{ margin: 0, fontWeight: 700, color: '#1b1c1a', fontSize: 15 }}>No active posts</p>
                <p style={{ margin: '6px 0 0', color: '#707881', fontSize: 13 }}>Post a task to get started with AI hiring.</p>
                <Link href="/post" style={{ display: 'inline-block', marginTop: 16, padding: '10px 20px', borderRadius: 10, background: '#0077b5', color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
                  Create a post
                </Link>
              </div>
            ) : (
              posts.map(post => (
                <button
                  key={post.id}
                  type="button"
                  onClick={() => selectPost(post)}
                  className="agent-btn"
                  style={{
                    width: '100%', textAlign: 'left', background: '#fff',
                    border: '1.5px solid #e0e7ef', borderRadius: 16, padding: '16px 18px',
                    marginBottom: 10, cursor: 'pointer',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1b1c1a' }}>{post.title}</p>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#707881', lineHeight: 1.5 }}>
                        {post.description.slice(0, 100)}{post.description.length > 100 ? '…' : ''}
                      </p>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#e8f4fd', color: '#005d8f' }}>
                          {post.type}
                        </span>
                        {post.budget && (
                          <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#f0fdf4', color: '#16a34a' }}>
                            ₹{Number(post.budget).toLocaleString('en-IN')}
                          </span>
                        )}
                        <span style={{ fontSize: 11, color: '#707881' }}>
                          {post._count.proposals} proposals
                        </span>
                      </div>
                    </div>
                    <span style={{ fontSize: 18, color: '#005d8f', flexShrink: 0, marginTop: 2 }}>→</span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}

        {/* ── Freelancer results (hirer) ── */}
        {step === 'hire_freelancers_result' && tiers && (
          <div>
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1b1c1a' }}>
                {totalFreelancers > 0 ? `${totalFreelancers} freelancers found` : 'No freelancers found'}
              </p>
              {selectedPost && (
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#707881' }}>
                  For: <strong>{selectedPost.title}</strong>
                </p>
              )}
            </div>

            {totalFreelancers === 0 ? (
              <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,.07)', padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                <p style={{ margin: 0, fontWeight: 700, color: '#1b1c1a', fontSize: 15 }}>No matching freelancers yet</p>
                <p style={{ margin: '6px 0 0', color: '#707881', fontSize: 13 }}>
                  Try adding more skills to your post or browse freelancer profiles manually.
                </p>
              </div>
            ) : (
              <>
                {/* Tier tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 4 }}>
                  {(['expert', 'intermediate', 'beginner'] as const).map(tier => {
                    const c = tierColors[tier]
                    const count = tiers[tier].length
                    if (count === 0) return null
                    const isActive = activeTier === tier
                    return (
                      <button
                        key={tier}
                        type="button"
                        onClick={() => setActiveTier(tier)}
                        className="tier-tab"
                        style={{
                          background: isActive ? c.bg : '#fff',
                          color: isActive ? c.color : '#707881',
                          border: `1.5px solid ${isActive ? c.border : '#e0e7ef'}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {c.label} ({count})
                      </button>
                    )
                  })}
                </div>

                {/* Tier label */}
                <div style={{
                  padding: '8px 14px', borderRadius: 10, marginBottom: 12,
                  background: tierColors[activeTier].bg, border: `1px solid ${tierColors[activeTier].border}`,
                }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: tierColors[activeTier].color }}>
                    {activeTier === 'expert' ? '🏆 Expert freelancers — senior-level, high-rated professionals' :
                     activeTier === 'intermediate' ? '⚡ Intermediate freelancers — solid experience, great value' :
                     '🌱 Beginner freelancers — fresh talent, competitive pricing'}
                  </p>
                </div>

                {tiers[activeTier].map(f => (
                  <FreelancerCard
                    key={f.userId}
                    freelancer={f}
                    taskTitle={selectedPost?.title ?? 'task'}
                    onRequestSent={uid => setSentRequests(s => new Set([...s, uid]))}
                  />
                ))}
              </>
            )}
          </div>
        )}
      </div>
    </main>
  )
}
