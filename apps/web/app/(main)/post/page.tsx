'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import SkillsInput from '../../../components/profile/SkillsInput'
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

    const budgetNum = budget ? Number(budget) : undefined
    if (budgetNum !== undefined && isNaN(budgetNum)) return toast.error('Budget must be a valid number')

    setLoading(true)
    try {
      await postService.createPost({
        type: isFreelancer ? 'SKILL_EXCHANGE' : isCompany ? 'COLLAB' : 'TASK',
        title: title.trim(),
        description,
        budget: isClient && budgetNum ? budgetNum : undefined,
        skills: isClient ? skills : [],
      })
      toast.success(
        isFreelancer ? 'Post published!' : isCompany ? 'Company post published!' : 'Task published!'
      )
      router.push('/')
    } catch (error: any) {
      // Show the first Zod field error if available, otherwise the message
      const fieldErrors = error.response?.data?.errors
      if (fieldErrors?.length) {
        toast.error(fieldErrors[0].message)
      } else {
        toast.error(error.response?.data?.message || 'Failed to create post')
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="flex items-center gap-3 border-b border-gray-200 bg-white px-4 py-4">
        <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700">
          Back
        </button>
        <div>
          <h1 className="text-lg font-extrabold text-gray-800">
            {isFreelancer ? 'Create Post' : isCompany ? 'Create Company Post' : 'Create Task Post'}
          </h1>
          <p className="text-sm text-gray-500">
            {isFreelancer
              ? 'Share what you can help with so it appears on Home.'
              : isCompany
                ? 'Share a company update or opportunity directly on Home.'
              : 'Publish a task directly on Home.'}
          </p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6">
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4 rounded-2xl border border-gray-200 bg-white p-5">
            <div>
              <label className="text-sm font-bold text-gray-700">
                Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={
                  isFreelancer
                    ? 'e.g. I can build your landing page in React'
                    : isCompany
                      ? 'e.g. We are looking to collaborate with product designers'
                    : 'e.g. Need help designing a clean landing page'
                }
              />
              {title.length > 0 && title.trim().length < 5 && (
                <p className="mt-0.5 text-xs text-red-400">Title must be at least 5 characters</p>
              )}
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={5}
                className="mt-1 w-full resize-none rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder={
                  isFreelancer
                    ? 'Describe your experience, services, and the kind of work you can help with.'
                    : isCompany
                      ? 'Describe what your company is sharing, offering, or inviting people to join.'
                    : 'Describe the task, deliverables, and what kind of help you need.'
                }
              />
              <p className={`mt-0.5 text-xs ${description.length < 20 ? 'text-red-400' : 'text-green-500'}`}>
                {description.length} / 20 minimum characters
              </p>
            </div>
          </div>

          {isClient ? (
            <>
              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <label className="text-sm font-bold text-gray-700">Budget (optional)</label>
                <input
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="e.g. 5000"
                />
              </div>

              <div className="rounded-2xl border border-gray-200 bg-white p-5">
                <label className="mb-2 block text-sm font-bold text-gray-700">Skills Required</label>
                <SkillsInput
                  value={skills}
                  onChange={setSkills}
                  placeholder="Add skills required for this task..."
                />
              </div>
            </>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-blue-600 py-4 text-base font-extrabold text-white shadow-lg transition-all hover:bg-blue-700 active:scale-95 disabled:opacity-60"
          >
            {loading
              ? 'Publishing...'
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
