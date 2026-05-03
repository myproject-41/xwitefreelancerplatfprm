'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import SkillsInput from '../../../components/profile/SkillsInput'
import MainHeader from '../../../components/ui/MainHeader'
import { postService } from '../../../services/post.service'
import { useAuthStore } from '../../../store/authStore'

export default function CreatePostPage() {
  const router = useRouter()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [budget, setBudget] = useState('')
  const [skills, setSkills] = useState<string[]>([])

  const isFreelancer = user?.role === 'FREELANCER'
  const isCompany = user?.role === 'COMPANY'
  const isClient = user?.role === 'CLIENT'

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) return toast.error('Title is required')
    if (title.trim().length < 5) return toast.error('Title must be at least 5 characters')
    if (description.length < 20) return toast.error('Description must be at least 20 characters')

    if ((isCompany || isClient) && !budget) return toast.error('Budget is required')
    const budgetNum = budget ? Number(budget) : undefined
    if (budgetNum !== undefined && isNaN(budgetNum)) return toast.error('Budget must be a valid number')
    if (budgetNum !== undefined && budgetNum <= 0) return toast.error('Budget must be greater than 0')

    router.push('/')
    toast.success(
      isFreelancer ? 'Post published!' : isCompany ? 'Company post published!' : 'Task published!'
    )
    postService.createPost({
      type: isFreelancer ? 'SKILL_EXCHANGE' : isCompany ? 'COLLAB' : 'TASK',
      title: title.trim(),
      description,
      budget: (isCompany || isClient) && budgetNum ? budgetNum : undefined,
      skills: isClient ? skills : [],
    }).catch((error: any) => {
      const fieldErrors = error.response?.data?.errors
      if (fieldErrors?.length) {
        toast.error(fieldErrors[0].message)
      } else {
        toast.error(error.response?.data?.message || 'Failed to create post')
      }
    })
  }

  const inputCls = 'mt-1 w-full rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 text-sm text-[#1b1c1a] outline-none placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#005d8f]/25'

  return (
    <div className="min-h-screen bg-[#f1f5f9]">
      <MainHeader />

      <main className="mx-auto max-w-2xl px-4 pb-28 pt-24 md:px-6">
        {/* Page title */}
        <div className="mb-6 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-[#d6dce3] bg-white text-[#005d8f] transition hover:bg-[#edf5fb]"
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-extrabold text-[#1b1c1a]">
              {isFreelancer ? 'Create Post' : isCompany ? 'Create Company Post' : 'Create Task Post'}
            </h1>
            <p className="text-xs text-[#6b7280]">
              {isFreelancer
                ? 'Share what you can help with — it appears on Home.'
                : isCompany
                  ? 'Share an update or opportunity on Home.'
                  : 'Publish a task on Home.'}
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Title + Description */}
          <div className="space-y-4 rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[#6b7280]">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className={inputCls}
                placeholder={
                  isFreelancer
                    ? 'e.g. I can build your landing page in React'
                    : isCompany
                      ? 'e.g. Looking to collaborate with product designers'
                      : 'e.g. Need help designing a clean landing page'
                }
              />
              {title.length > 0 && title.trim().length < 5 && (
                <p className="mt-1 text-xs text-red-500">Title must be at least 5 characters</p>
              )}
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-widest text-[#6b7280]">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className={`${inputCls} resize-none`}
                placeholder={
                  isFreelancer
                    ? 'Describe your experience, services, and how you can help.'
                    : isCompany
                      ? 'Describe what your company is sharing, offering, or inviting people to.'
                      : 'Describe the task, deliverables, and what kind of help you need.'
                }
              />
              <p className={`mt-1 text-xs ${description.length < 20 ? 'text-red-500' : 'text-emerald-600'}`}>
                {description.length} / 20 minimum characters
              </p>
            </div>
          </div>

          {/* Budget */}
          {(isCompany || isClient) && (
            <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
              <label className="text-xs font-bold uppercase tracking-widest text-[#6b7280]">
                Budget (INR) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={budget}
                onChange={(e) => setBudget(e.target.value)}
                min={1}
                className={inputCls}
                placeholder="e.g. 5000"
              />
              {budget !== '' && Number(budget) <= 0 && (
                <p className="mt-1 text-xs text-red-500">Budget must be greater than 0</p>
              )}
            </div>
          )}

          {/* Skills */}
          {isClient && (
            <div className="rounded-2xl border border-[#e2e8f0] bg-white p-5 shadow-sm">
              <label className="mb-2 block text-xs font-bold uppercase tracking-widest text-[#6b7280]">
                Skills Required
              </label>
              <SkillsInput
                value={skills}
                onChange={setSkills}
                placeholder="Add skills required for this task..."
              />
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-[linear-gradient(135deg,#005d8f_0%,#0077b5_100%)] py-4 text-base font-extrabold text-white shadow-[0_4px_16px_rgba(0,93,143,0.3)] transition hover:opacity-95 active:scale-[0.98] disabled:opacity-60"
          >
            {loading
              ? 'Publishing…'
              : isFreelancer
                ? 'Publish Post'
                : isCompany
                  ? 'Publish Company Post'
                  : 'Publish Task'}
          </button>
        </form>
      </main>
    </div>
  )
}
