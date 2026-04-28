'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
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

type AgentStep = { icon: string; text: string }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getInitials(name?: string | null) {
  return (name || 'X').split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'X'
}

function Avatar({ src, name, size = 40 }: { src?: string | null; name?: string | null; size?: number }) {
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: '#e8f4fd', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: size * 0.36, fontWeight: 700,
      color: '#005d8f', overflow: 'hidden',
    }}>
      {src ? <img src={src} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : getInitials(name)}
    </div>
  )
}

// ─── Step-by-step animation component ────────────────────────────────────────

function StepProgress({
  steps,
  currentStep,
}: {
  steps: AgentStep[]
  currentStep: number
}) {
  return (
    <div style={{ padding: '14px 0', display: 'flex', flexDirection: 'column', gap: 10 }}>
      {steps.map((s, i) => {
        const done = i < currentStep
        const active = i === currentStep
        return (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: i > currentStep ? 0.35 : 1, transition: 'opacity .3s' }}>
            <div style={{
              width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
              background: done ? '#dcfce7' : active ? '#e8f4fd' : '#f3f4f6',
              border: `2px solid ${done ? '#16a34a' : active ? '#005d8f' : '#e5e7eb'}`,
              transition: 'all .3s',
            }}>
              {done ? '✓' : s.icon}
            </div>
            <span style={{
              fontSize: 13, fontWeight: active ? 700 : 500,
              color: done ? '#16a34a' : active ? '#005d8f' : '#9ca3af',
              transition: 'color .3s',
            }}>
              {s.text}
              {active && <span className="dots-anim">...</span>}
            </span>
          </div>
        )
      })}
    </div>
  )
}

// ─── Freelancer task card ─────────────────────────────────────────────────────

const PROPOSAL_STEPS: AgentStep[] = [
  { icon: '🔍', text: 'Reading task details' },
  { icon: '💡', text: 'Analysing your skills' },
  { icon: '✍️', text: 'Writing your proposal' },
  { icon: '✅', text: 'Done' },
]

function TaskCard({ task }: { task: Task }) {
  const [phase, setPhase] = useState<'idle' | 'running' | 'done' | 'sent'>('idle')
  const [currentStep, setCurrentStep] = useState(0)
  const [draft, setDraft] = useState<{ coverLetter: string; proposedRate?: number; estimatedDays: number } | null>(null)
  const [coverLetter, setCoverLetter] = useState('')
  const [proposedRate, setProposedRate] = useState('')
  const [estimatedDays, setEstimatedDays] = useState('')
  const [customize, setCustomize] = useState(false)
  const [sending, setSending] = useState(false)
  const cancelled = useRef(false)

  const runMakeIt = async () => {
    cancelled.current = false
    setPhase('running')
    setCurrentStep(0)

    // Step 0 → 1 (0.8s each)
    await new Promise(r => setTimeout(r, 800))
    if (cancelled.current) return
    setCurrentStep(1)

    await new Promise(r => setTimeout(r, 800))
    if (cancelled.current) return
    setCurrentStep(2)

    // Step 2: actual API call
    try {
      const res = await agentService.generateProposal(task.id)
      if (cancelled.current) return
      const d = res?.data
      setDraft(d)
      setCoverLetter(d?.coverLetter ?? '')
      setProposedRate(d?.proposedRate ? String(d.proposedRate) : '')
      setEstimatedDays(d?.estimatedDays ? String(d.estimatedDays) : '7')
      setCurrentStep(3)
      await new Promise(r => setTimeout(r, 400))
      setPhase('done')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'AI generation failed')
      setPhase('idle')
    }
  }

  const cancel = () => {
    cancelled.current = true
    setPhase('idle')
    setCurrentStep(0)
  }

  const sendProposal = async () => {
    if (coverLetter.trim().length < 50) return toast.error('Cover letter must be at least 50 characters')
    const days = Number(estimatedDays)
    if (!days || days < 1 || days > 365) return toast.error('Enter a valid timeline (1–365 days)')
    setSending(true)
    try {
      await postService.sendProposal(task.id, {
        coverLetter: coverLetter.trim(),
        proposedRate: proposedRate ? Number(proposedRate) : undefined,
        estimatedDays: days,
      })
      setPhase('sent')
      toast.success('Proposal sent!')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to send proposal')
    } finally {
      setSending(false)
    }
  }

  return (
    <div style={{ background: '#fff', border: '1.5px solid #e0e7ef', borderRadius: 18, padding: '16px 18px', marginBottom: 14, boxShadow: '0 1px 6px rgba(0,0,0,.04)' }}>
      {/* Header row */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
        <Avatar src={task.client.image} name={task.client.name} size={36} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1b1c1a' }}>{task.title}</p>
          <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707881' }}>by {task.client.name} · {task.proposalCount} proposals</p>
        </div>
        {task.budget != null && (
          <span style={{ fontSize: 13, fontWeight: 700, color: '#16a34a', background: '#f0fdf4', padding: '3px 10px', borderRadius: 8, flexShrink: 0 }}>
            ₹{Number(task.budget).toLocaleString('en-IN')}
          </span>
        )}
      </div>

      <p style={{ margin: '10px 0 8px', fontSize: 13, color: '#374151', lineHeight: 1.55 }}>
        {task.description.length > 150 ? `${task.description.slice(0, 150)}…` : task.description}
      </p>

      {task.skills.length > 0 && (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 12 }}>
          {task.skills.slice(0, 6).map(s => (
            <span key={s} style={{
              fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20,
              background: '#e8f4fd', color: '#005d8f', border: '1px solid #bdd8f0',
            }}>{s}</span>
          ))}
        </div>
      )}

      {/* Sent state */}
      {phase === 'sent' && (
        <div style={{ padding: '12px 14px', background: '#f0fdf4', borderRadius: 12, fontSize: 13, fontWeight: 700, color: '#16a34a' }}>
          ✓ Proposal sent successfully!
        </div>
      )}

      {/* Running steps */}
      {phase === 'running' && (
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: '4px 14px 4px' }}>
          <StepProgress steps={PROPOSAL_STEPS} currentStep={currentStep} />
          <button type="button" onClick={cancel}
            style={{ fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0 8px', fontFamily: 'Inter,sans-serif' }}>
            Cancel
          </button>
        </div>
      )}

      {/* Done — show generated proposal */}
      {phase === 'done' && draft && (
        <div style={{ background: '#f8fafc', border: '1px solid #e0e7ef', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#005d8f' }}>
              🤖 AI-Generated Proposal
            </p>
            <button type="button" onClick={() => setCustomize(c => !c)}
              style={{
                fontSize: 12, fontWeight: 600, padding: '4px 12px', borderRadius: 20,
                background: customize ? '#005d8f' : '#f0f7ff', color: customize ? '#fff' : '#005d8f',
                border: '1.5px solid #bdd8f0', cursor: 'pointer', fontFamily: 'Inter,sans-serif',
              }}>
              ✎ {customize ? 'Done' : 'Customize'}
            </button>
          </div>

          {customize ? (
            <textarea
              value={coverLetter}
              onChange={e => setCoverLetter(e.target.value)}
              rows={6}
              style={{
                width: '100%', padding: '10px 12px', borderRadius: 10,
                border: '1.5px solid #bdd8f0', fontSize: 13, lineHeight: 1.6,
                fontFamily: 'Inter,sans-serif', resize: 'vertical', outline: 'none',
                boxSizing: 'border-box',
              }}
            />
          ) : (
            <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{coverLetter}</p>
          )}

          <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
            <input
              type="number"
              value={proposedRate}
              onChange={e => setProposedRate(e.target.value)}
              placeholder="Bid (₹)"
              style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e0e7ef', fontSize: 13, outline: 'none' }}
            />
            <input
              type="number"
              min={1} max={365}
              value={estimatedDays}
              onChange={e => setEstimatedDays(e.target.value)}
              placeholder="Days *"
              style={{ flex: 1, padding: '8px 12px', borderRadius: 10, border: '1.5px solid #e0e7ef', fontSize: 13, outline: 'none' }}
            />
          </div>
        </div>
      )}

      {/* Action row: Make it + Customize | Send Proposal */}
      {phase === 'idle' && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'space-between', alignItems: 'center' }}>
          <button type="button" onClick={runMakeIt}
            style={{
              padding: '10px 20px', borderRadius: 12,
              background: 'linear-gradient(135deg,#7c3aed,#9333ea)',
              color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
            }}>
            🤖 Make it
          </button>
          <Link href={`/posts/${task.id}`}
            style={{
              padding: '10px 18px', borderRadius: 12,
              background: 'linear-gradient(135deg,#005d8f,#0077b5)',
              color: '#fff', fontSize: 13, fontWeight: 700, textDecoration: 'none',
            }}>
            Send Proposal →
          </Link>
        </div>
      )}

      {phase === 'done' && (
        <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
          <button type="button" onClick={() => setPhase('idle')}
            style={{ padding: '10px 16px', borderRadius: 12, background: '#f3f4f6', color: '#374151', border: 'none', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>
            Redo
          </button>
          <button type="button" onClick={sendProposal} disabled={sending}
            style={{
              padding: '10px 22px', borderRadius: 12,
              background: 'linear-gradient(135deg,#005d8f,#0077b5)',
              color: '#fff', border: 'none', fontSize: 13, fontWeight: 700,
              cursor: sending ? 'not-allowed' : 'pointer', opacity: sending ? .65 : 1,
            }}>
            {sending ? 'Sending…' : 'Send Proposal →'}
          </button>
        </div>
      )}
    </div>
  )
}

// ─── Client freelancer card ───────────────────────────────────────────────────

const INVITE_STEPS: AgentStep[] = [
  { icon: '🔍', text: 'Reviewing your task' },
  { icon: '👤', text: 'Checking freelancer profile' },
  { icon: '✍️', text: 'Crafting invitation' },
  { icon: '📨', text: 'Ready to send' },
]

function FreelancerCard({
  freelancer,
  postId,
  postTitle,
}: {
  freelancer: Freelancer
  postId: string
  postTitle: string
}) {
  const [phase, setPhase] = useState<'idle' | 'running' | 'done' | 'notified'>('idle')
  const [currentStep, setCurrentStep] = useState(0)
  const [invitation, setInvitation] = useState('')
  const [customize, setCustomize] = useState(false)
  const [notifying, setNotifying] = useState(false)
  const cancelled = useRef(false)

  const runMakeIt = async () => {
    cancelled.current = false
    setPhase('running')
    setCurrentStep(0)

    await new Promise(r => setTimeout(r, 700))
    if (cancelled.current) return
    setCurrentStep(1)

    await new Promise(r => setTimeout(r, 700))
    if (cancelled.current) return
    setCurrentStep(2)

    try {
      const res = await agentService.generateInvite(postId, freelancer.userId)
      if (cancelled.current) return
      setInvitation(res?.data?.invitation ?? '')
      setCurrentStep(3)
      await new Promise(r => setTimeout(r, 400))
      setPhase('done')
      toast.success(`${freelancer.fullName || 'Freelancer'} has been notified!`)
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'AI generation failed')
      setPhase('idle')
    }
  }

  const directNotify = async () => {
    setNotifying(true)
    try {
      await agentService.notifyFreelancer(postId, freelancer.userId)
      setPhase('notified')
      toast.success('Freelancer notified!')
    } catch (e: any) {
      toast.error(e?.response?.data?.message || 'Failed to notify')
    } finally {
      setNotifying(false)
    }
  }

  return (
    <div style={{ background: '#fff', border: '1.5px solid #e0e7ef', borderRadius: 18, padding: '16px 18px', marginBottom: 12, boxShadow: '0 1px 6px rgba(0,0,0,.04)' }}>
      {/* Header */}
      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 8 }}>
        <Avatar src={freelancer.profileImage} name={freelancer.fullName} size={44} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1b1c1a' }}>{freelancer.fullName || 'Freelancer'}</p>
          {freelancer.title && <p style={{ margin: 0, fontSize: 12, color: '#707881' }}>{freelancer.title}</p>}
          {freelancer.avgRating != null && freelancer.avgRating > 0 && (
            <p style={{ margin: '2px 0 0', fontSize: 11, color: '#d97706' }}>
              ★ {Number(freelancer.avgRating).toFixed(1)} ({freelancer.totalReviews})
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
              fontSize: 11, fontWeight: 600, padding: '2px 9px', borderRadius: 20,
              background: '#e8f4fd', color: '#005d8f', border: '1px solid #bdd8f0',
            }}>{s}</span>
          ))}
        </div>
      )}

      {/* View Profile + Notify row */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
        <Link href={`/profile/${freelancer.userId}`}
          style={{
            flex: 1, padding: '9px 12px', borderRadius: 10,
            background: '#f0f7ff', color: '#005d8f',
            border: '1.5px solid #bdd8f0',
            fontSize: 13, fontWeight: 600, textDecoration: 'none', textAlign: 'center',
          }}>
          View Profile
        </Link>

        {phase === 'notified' ? (
          <div style={{ flex: 1, padding: '9px 12px', borderRadius: 10, background: '#f0fdf4', color: '#16a34a', fontSize: 13, fontWeight: 700, textAlign: 'center' }}>
            ✓ Notified
          </div>
        ) : (
          <button type="button" onClick={directNotify} disabled={notifying || phase !== 'idle'}
            style={{
              flex: 1, padding: '9px 12px', borderRadius: 10,
              background: 'linear-gradient(135deg,#005d8f,#0077b5)',
              color: '#fff', border: 'none',
              fontSize: 13, fontWeight: 700, cursor: notifying || phase !== 'idle' ? 'not-allowed' : 'pointer',
              opacity: notifying || phase !== 'idle' ? .65 : 1,
            }}>
            {notifying ? '…' : '🔔 Notify'}
          </button>
        )}
      </div>

      {/* Running steps */}
      {phase === 'running' && (
        <div style={{ background: '#f8fafc', borderRadius: 12, padding: '4px 14px 4px' }}>
          <StepProgress steps={INVITE_STEPS} currentStep={currentStep} />
          <button type="button" onClick={() => { cancelled.current = true; setPhase('idle') }}
            style={{ fontSize: 12, color: '#9ca3af', background: 'none', border: 'none', cursor: 'pointer', padding: '4px 0 8px', fontFamily: 'Inter,sans-serif' }}>
            Cancel
          </button>
        </div>
      )}

      {/* Done — show AI invitation */}
      {phase === 'done' && (
        <div style={{ background: '#f8fafc', border: '1px solid #e0e7ef', borderRadius: 12, padding: '14px 16px', marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <p style={{ margin: 0, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.08em', color: '#7c3aed' }}>
              🤖 AI-Generated Invitation (sent ✓)
            </p>
          </div>
          <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.65, whiteSpace: 'pre-wrap' }}>{invitation}</p>
        </div>
      )}

      {/* Make it button */}
      {phase === 'idle' && (
        <button type="button" onClick={runMakeIt}
          style={{
            width: '100%', padding: '10px', borderRadius: 12,
            background: 'linear-gradient(135deg,#7c3aed,#9333ea)',
            color: '#fff', border: 'none', fontSize: 13, fontWeight: 700, cursor: 'pointer',
          }}>
          🤖 Make it — AI sends personalized invite
        </button>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type FlowStep =
  | 'home'
  | 'find_tasks_loading'
  | 'find_tasks_result'
  | 'hire_posts_loading'
  | 'hire_posts_list'
  | 'hire_freelancers_loading'
  | 'hire_freelancers_result'

export default function AgentPage() {
  const { user } = useAuthStore()
  const role = (user as any)?.role as string | undefined

  const isFreelancer = role === 'FREELANCER'
  const isHirer = role === 'CLIENT' || role === 'COMPANY'

  const [step, setStep] = useState<FlowStep>('home')
  const [tasks, setTasks] = useState<Task[]>([])
  const [posts, setPosts] = useState<Post[]>([])
  const [selectedPost, setSelectedPost] = useState<Post | null>(null)
  const [tiers, setTiers] = useState<{ expert: Freelancer[]; intermediate: Freelancer[]; beginner: Freelancer[] } | null>(null)
  const [activeTier, setActiveTier] = useState<'expert' | 'intermediate' | 'beginner'>('expert')

  const findJobs = async () => {
    setStep('find_tasks_loading')
    try {
      const res = await agentService.findTasks()
      setTasks(res?.data ?? [])
      setStep('find_tasks_result')
    } catch {
      toast.error('Failed to find tasks')
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
    setStep('home'); setTasks([]); setPosts([]); setSelectedPost(null); setTiers(null)
  }

  const totalFreelancers = tiers
    ? tiers.expert.length + tiers.intermediate.length + tiers.beginner.length
    : 0

  const tierMeta = {
    expert: { label: 'Expert', emoji: '🏆', bg: '#fef3c7', color: '#d97706', border: '#fde68a', desc: 'Senior-level, high-rated professionals' },
    intermediate: { label: 'Intermediate', emoji: '⚡', bg: '#e8f4fd', color: '#005d8f', border: '#bdd8f0', desc: 'Solid experience, great value' },
    beginner: { label: 'Beginner', emoji: '🌱', bg: '#f3f4f6', color: '#374151', border: '#e5e7eb', desc: 'Fresh talent, competitive pricing' },
  }

  return (
    <main style={{ minHeight: '100vh', background: '#EDF1F7', paddingBottom: 100 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');
        *,*::before,*::after{box-sizing:border-box;}
        body,button,input,textarea{font-family:'Inter',sans-serif;}
        .dots-anim::after{content:'';animation:dots 1.2s steps(3,end) infinite;}
        @keyframes dots{0%{content:''} 33%{content:'.'} 66%{content:'..'} 100%{content:'...'}}
        .ag-btn{transition:transform .12s,opacity .12s;} .ag-btn:hover{opacity:.88;transform:translateY(-1px);}
      `}</style>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg,#005d8f,#0077b5)', padding: '52px 20px 24px', color: '#fff' }}>
        <div style={{ maxWidth: 640, margin: '0 auto' }}>
          <p style={{ margin: 0, fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.14em', opacity: .75 }}>AI-Powered</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 6 }}>
            <div style={{ width: 48, height: 48, borderRadius: 14, background: 'rgba(255,255,255,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 26 }}>
              🤖
            </div>
            <div>
              <h1 style={{ margin: 0, fontSize: 24, fontWeight: 800 }}>AI Agent</h1>
              <p style={{ margin: '2px 0 0', fontSize: 13, opacity: .8 }}>
                {isFreelancer ? 'Find tasks · Auto-write proposals with OpenAI' : 'Find freelancers · Send AI-crafted invitations'}
              </p>
            </div>
          </div>
          {step !== 'home' && (
            <button type="button" onClick={reset} className="ag-btn"
              style={{ marginTop: 16, padding: '7px 16px', borderRadius: 20, background: 'rgba(255,255,255,.2)', color: '#fff', border: '1px solid rgba(255,255,255,.35)', fontSize: 12, fontWeight: 600, cursor: 'pointer' }}>
              ← Start over
            </button>
          )}
        </div>
      </div>

      <div style={{ maxWidth: 640, margin: '20px auto 0', padding: '0 12px' }}>

        {/* ── Home ── */}
        {step === 'home' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,.07)', overflow: 'hidden' }}>
              <div style={{ padding: '18px 20px 10px', borderBottom: '1px solid #f0f3f6' }}>
                <p style={{ margin: 0, fontSize: 12, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.1em', color: '#707881' }}>What would you like to do?</p>
              </div>

              {isFreelancer && (
                <button type="button" onClick={findJobs} className="ag-btn"
                  style={{ width: '100%', padding: '20px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', borderBottom: '1px solid #f0f3f6' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: '#ede9fe', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>🔍</div>
                    <div>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1b1c1a' }}>Find job for me</p>
                      <p style={{ margin: '3px 0 0', fontSize: 13, color: '#707881' }}>AI finds matching tasks · auto-writes your proposal</p>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: 18, color: '#7c3aed' }}>→</span>
                  </div>
                </button>
              )}

              {isHirer && (
                <button type="button" onClick={startHire} className="ag-btn"
                  style={{ width: '100%', padding: '20px', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    <div style={{ width: 48, height: 48, borderRadius: 12, background: '#f0fdf4', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>👥</div>
                    <div>
                      <p style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#1b1c1a' }}>Help me hire</p>
                      <p style={{ margin: '3px 0 0', fontSize: 13, color: '#707881' }}>AI finds freelancers · sends personalized invitations</p>
                    </div>
                    <span style={{ marginLeft: 'auto', fontSize: 18, color: '#005d8f' }}>→</span>
                  </div>
                </button>
              )}
            </div>

            <div style={{ background: 'rgba(124,58,237,.06)', border: '1px solid #ddd6fe', borderRadius: 14, padding: '14px 16px' }}>
              <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: '#7c3aed' }}>🤖 Powered by OpenAI</p>
              <p style={{ margin: '5px 0 0', fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                {isFreelancer
                  ? '"Make it" uses OpenAI to write a tailored proposal based on your skills and the task. Customize before sending.'
                  : '"Make it" uses OpenAI to craft a personalized invitation for each freelancer and notifies them instantly. Or use "Notify" for a quick direct notification.'}
              </p>
            </div>
          </div>
        )}

        {/* ── Loading ── */}
        {(step === 'find_tasks_loading' || step === 'hire_posts_loading' || step === 'hire_freelancers_loading') && (
          <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,.07)', padding: 48, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 14 }}>🤖</div>
            <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1b1c1a' }}>
              {step === 'find_tasks_loading' ? 'Finding matching tasks…' : step === 'hire_posts_loading' ? 'Loading your posts…' : 'Finding freelancers…'}
            </p>
            <p style={{ margin: '6px 0 0', fontSize: 13, color: '#707881' }}>Just a moment</p>
          </div>
        )}

        {/* ── Task results (freelancer) ── */}
        {step === 'find_tasks_result' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1b1c1a' }}>
                {tasks.length > 0 ? `${tasks.length} matching tasks` : 'No matching tasks found'}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707881' }}>Ranked by skill match · Click "Make it" to auto-write a proposal</p>
            </div>

            {tasks.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,.07)', padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>🔍</div>
                <p style={{ margin: 0, fontWeight: 700, color: '#1b1c1a', fontSize: 15 }}>No matching tasks right now</p>
                <p style={{ margin: '6px 0 0', color: '#707881', fontSize: 13 }}>Update your skills profile or check back as new tasks are posted.</p>
              </div>
            ) : (
              tasks.map(task => <TaskCard key={task.id} task={task} />)
            )}
          </>
        )}

        {/* ── Posts list (hirer) ── */}
        {step === 'hire_posts_list' && (
          <>
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1b1c1a' }}>
                {posts.length > 0 ? 'Select a post to find freelancers' : 'No active posts'}
              </p>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707881' }}>Your most recent active posts</p>
            </div>

            {posts.length === 0 ? (
              <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,.07)', padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>📋</div>
                <p style={{ margin: 0, fontWeight: 700, color: '#1b1c1a', fontSize: 15 }}>No active posts</p>
              </div>
            ) : (
              posts.map(post => (
                <button key={post.id} type="button" onClick={() => selectPost(post)} className="ag-btn"
                  style={{ width: '100%', textAlign: 'left', background: '#fff', border: '1.5px solid #e0e7ef', borderRadius: 18, padding: '16px 18px', marginBottom: 10, cursor: 'pointer', boxShadow: '0 1px 6px rgba(0,0,0,.04)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ margin: 0, fontSize: 14, fontWeight: 700, color: '#1b1c1a' }}>{post.title}</p>
                      <p style={{ margin: '4px 0 0', fontSize: 12, color: '#707881', lineHeight: 1.5 }}>{post.description.slice(0, 100)}{post.description.length > 100 ? '…' : ''}</p>
                      <div style={{ display: 'flex', gap: 8, marginTop: 8, flexWrap: 'wrap' }}>
                        <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#e8f4fd', color: '#005d8f' }}>{post.type}</span>
                        {post.budget && <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20, background: '#f0fdf4', color: '#16a34a' }}>₹{Number(post.budget).toLocaleString('en-IN')}</span>}
                        <span style={{ fontSize: 11, color: '#707881' }}>{post._count.proposals} proposals</span>
                      </div>
                    </div>
                    <span style={{ fontSize: 18, color: '#005d8f', flexShrink: 0, marginTop: 2 }}>→</span>
                  </div>
                </button>
              ))
            )}
          </>
        )}

        {/* ── Freelancer results (hirer) ── */}
        {step === 'hire_freelancers_result' && tiers && (
          <>
            <div style={{ marginBottom: 14 }}>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 700, color: '#1b1c1a' }}>
                {totalFreelancers > 0 ? `${totalFreelancers} freelancers found` : 'No matching freelancers'}
              </p>
              {selectedPost && (
                <p style={{ margin: '2px 0 0', fontSize: 12, color: '#707881' }}>
                  For: <strong>{selectedPost.title}</strong> · Click "Notify" to ping directly · "Make it" for AI invite
                </p>
              )}
            </div>

            {totalFreelancers === 0 ? (
              <div style={{ background: '#fff', borderRadius: 20, boxShadow: '0 2px 16px rgba(0,0,0,.07)', padding: 48, textAlign: 'center' }}>
                <div style={{ fontSize: 40, marginBottom: 12 }}>👥</div>
                <p style={{ margin: 0, fontWeight: 700, color: '#1b1c1a', fontSize: 15 }}>No matching freelancers yet</p>
              </div>
            ) : (
              <>
                {/* Tier tabs */}
                <div style={{ display: 'flex', gap: 8, marginBottom: 16, overflowX: 'auto', paddingBottom: 2 }}>
                  {(['expert', 'intermediate', 'beginner'] as const).map(tier => {
                    const m = tierMeta[tier]
                    if (!tiers[tier].length) return null
                    const isActive = activeTier === tier
                    return (
                      <button key={tier} type="button" onClick={() => setActiveTier(tier)}
                        style={{
                          padding: '8px 18px', borderRadius: 20, fontSize: 13, fontWeight: 600,
                          border: `1.5px solid ${isActive ? m.border : '#e0e7ef'}`,
                          background: isActive ? m.bg : '#fff', color: isActive ? m.color : '#707881',
                          cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'Inter,sans-serif',
                          transition: 'all .15s',
                        }}>
                        {m.emoji} {m.label} ({tiers[tier].length})
                      </button>
                    )
                  })}
                </div>

                <div style={{ padding: '8px 14px', borderRadius: 10, marginBottom: 12, background: tierMeta[activeTier].bg, border: `1px solid ${tierMeta[activeTier].border}` }}>
                  <p style={{ margin: 0, fontSize: 12, fontWeight: 700, color: tierMeta[activeTier].color }}>
                    {tierMeta[activeTier].emoji} {tierMeta[activeTier].label} · {tierMeta[activeTier].desc}
                  </p>
                </div>

                {tiers[activeTier].map(f => (
                  <FreelancerCard
                    key={f.userId}
                    freelancer={f}
                    postId={selectedPost!.id}
                    postTitle={selectedPost!.title}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </main>
  )
}
