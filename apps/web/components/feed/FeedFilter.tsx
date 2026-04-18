'use client'

interface FeedFilterProps {
  active: string
  onChange: (filter: string) => void
  userRole: string
}

export default function FeedFilter({ active, onChange, userRole }: FeedFilterProps) {
  const filters = [
    { value: 'ALL', label: '🌐 All' },
    { value: 'JOB', label: '💼 Jobs' },
    { value: 'TASK', label: '📋 Tasks' },
    { value: 'COLLAB', label: '🤝 Collab' },
    { value: 'SKILL_EXCHANGE', label: '🔄 Skill Exchange' },
  ]

  return (
    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
      {filters.map(f => (
        <button
          key={f.value}
          onClick={() => onChange(f.value)}
          className={`flex-shrink-0 px-4 py-2 rounded-full text-sm font-bold transition-all ${
            active === f.value
              ? 'bg-blue-600 text-white shadow-sm'
              : 'bg-white border border-gray-200 text-gray-600 hover:border-blue-300 hover:text-blue-600'
          }`}
        >
          {f.label}
        </button>
      ))}
    </div>
  )
}