'use client'
import { useState } from 'react'
import toast from 'react-hot-toast'
import { reviewService } from '../../services/review.service'

const RATINGS = [
  { value: 2, label: 'Good',      emoji: '👍', stars: '⭐⭐',    color: 'border-blue-300 bg-blue-50 text-[#0160B9]' },
  { value: 3, label: 'Very Good', emoji: '😊', stars: '⭐⭐⭐',  color: 'border-green-300 bg-green-50 text-green-700' },
  { value: 5, label: 'Excellent', emoji: '🌟', stars: '⭐⭐⭐⭐⭐', color: 'border-yellow-300 bg-yellow-50 text-yellow-700' },
]

interface Props {
  escrowId: string
  reviewedId: string
  freelancerName: string
  taskTitle: string
  onClose: () => void
  onDone: () => void
}

export default function ReviewModal({ escrowId, reviewedId, freelancerName, taskTitle, onClose, onDone }: Props) {
  const [selected, setSelected] = useState<number | null>(null)
  const [comment, setComment] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = async () => {
    if (!selected) return toast.error('Please select a rating')
    setLoading(true)
    try {
      await reviewService.createReview({ reviewedId, rating: selected, comment, escrowId })
      toast.success('Review submitted! Thank you.')
      onDone()
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to submit review')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[#e2e8f0] px-5 py-4">
          <div>
            <h2 className="text-base font-extrabold text-[#1b1c1a]">Rate your experience</h2>
            <p className="mt-0.5 text-xs text-[#6b7280]">"{taskTitle}"</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f1f5f9] text-[#6b7280] hover:bg-[#e2e8f0]">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-4 w-4">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          <p className="text-sm text-[#374151]">
            How was working with <span className="font-bold text-[#1b1c1a]">{freelancerName}</span>?
          </p>

          {/* Rating options */}
          <div className="grid grid-cols-3 gap-2">
            {RATINGS.map((r) => (
              <button
                key={r.value}
                onClick={() => setSelected(r.value)}
                className={`flex flex-col items-center gap-1.5 rounded-xl border-2 py-3 px-2 transition-all ${
                  selected === r.value
                    ? r.color + ' scale-[1.03] shadow-md'
                    : 'border-[#e2e8f0] bg-[#f8fafc] hover:border-[#0160B9]/40'
                }`}
              >
                <span className="text-2xl">{r.emoji}</span>
                <span className="text-[10px] leading-none">{r.stars}</span>
                <span className={`text-xs font-bold ${selected === r.value ? '' : 'text-[#374151]'}`}>
                  {r.label}
                </span>
              </button>
            ))}
          </div>

          {/* Comment */}
          <div>
            <label className="text-xs font-bold text-[#6b7280]">Add a comment (optional)</label>
            <textarea
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              placeholder="Describe your experience..."
              className="mt-1 w-full resize-none rounded-xl border border-[#e2e8f0] bg-[#f8fafc] p-3 text-sm text-[#1b1c1a] outline-none placeholder:text-[#9ca3af] focus:ring-2 focus:ring-[#0160B9]/25"
            />
          </div>

          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 rounded-xl border border-[#e2e8f0] py-2.5 text-sm font-bold text-[#374151] hover:bg-[#f8fafc]"
            >
              Skip
            </button>
            <button
              onClick={handleSubmit}
              disabled={loading || !selected}
              className="flex-1 rounded-xl bg-[#0160B9] py-2.5 text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:opacity-50"
            >
              {loading ? 'Submitting…' : 'Submit Review'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
