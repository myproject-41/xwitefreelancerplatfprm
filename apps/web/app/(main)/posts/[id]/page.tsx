'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import PostCard from '../../../../components/feed/PostCard'
import MainHeader from '../../../../components/ui/MainHeader'
import { postService } from '../../../../services/post.service'
import { useAuthStore } from '../../../../store/authStore'

export default function PostDetailsPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const { user } = useAuthStore()
  const [post, setPost] = useState<any | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let ignore = false
    let intervalId: number | undefined

    async function loadPost(showLoader = true) {
      if (!params?.id) return

      if (showLoader) {
        setLoading(true)
      }
      try {
        const res = await postService.getPost(params.id)
        if (!ignore) {
          setPost(res?.data ?? null)
        }
      } catch (error: any) {
        if (!ignore) {
          toast.error(error?.response?.data?.message || 'Failed to load post')
        }
      } finally {
        if (!ignore) {
          setLoading(false)
        }
      }
    }

    void loadPost()
    intervalId = window.setInterval(() => {
      void loadPost(false)
    }, 15000)

    return () => {
      ignore = true
      if (intervalId) {
        window.clearInterval(intervalId)
      }
    }
  }, [params?.id])

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#faf9f6_0%,#f3f4ef_100%)] text-[#1b1c1a]">
      <MainHeader />

      <div className="mx-auto max-w-4xl px-4 pb-24 pt-24 md:px-6">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-5 rounded-full border border-[#d6dce3] bg-white px-4 py-2 text-sm font-bold text-[#005d8f] transition hover:bg-[#f4f8fb]"
        >
          Back
        </button>

        {loading ? (
          <div className="rounded-[24px] border border-[#e4e7eb] bg-white p-10 text-center text-sm text-[#5a6470] shadow-[0_14px_40px_rgba(27,28,26,0.06)]">
            Loading post...
          </div>
        ) : post ? (
          <PostCard post={post} userRole={user?.role ?? ''} viewerId={user?.id} detailMode />
        ) : (
          <div className="rounded-[24px] border border-[#e4e7eb] bg-white p-10 text-center shadow-[0_14px_40px_rgba(27,28,26,0.06)]">
            <p className="text-lg font-bold text-[#1b1c1a]">Post not found</p>
            <p className="mt-2 text-sm text-[#5a6470]">This post may have been removed or is no longer available.</p>
          </div>
        )}
      </div>
    </main>
  )
}
