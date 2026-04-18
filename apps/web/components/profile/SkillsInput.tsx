'use client'
import { useState } from 'react'

const SUGGESTED_SKILLS = [
  'React', 'Next.js', 'TypeScript', 'JavaScript', 'Node.js',
  'Python', 'Django', 'FastAPI', 'PostgreSQL', 'MongoDB',
  'AWS', 'Docker', 'Kubernetes', 'Figma', 'UI/UX Design',
  'Tailwind CSS', 'GraphQL', 'REST API', 'Machine Learning',
  'Data Analysis', 'React Native', 'Flutter', 'iOS', 'Android',
  'WordPress', 'Shopify', 'SEO', 'Content Writing', 'Copywriting',
  'Video Editing', 'Motion Graphics', 'Branding', 'Logo Design',
]

interface SkillsInputProps {
  value: string[]
  onChange: (skills: string[]) => void
  placeholder?: string
}

export default function SkillsInput({ value, onChange, placeholder }: SkillsInputProps) {
  const [input, setInput] = useState('')
  const [showSuggestions, setShowSuggestions] = useState(false)

  const filtered = SUGGESTED_SKILLS.filter(
    s => s.toLowerCase().includes(input.toLowerCase()) && !value.includes(s)
  )

  const addSkill = (skill: string) => {
    const trimmed = skill.trim()
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed])
    }
    setInput('')
    setShowSuggestions(false)
  }

  const removeSkill = (skill: string) => {
    onChange(value.filter(s => s !== skill))
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault()
      if (input.trim()) addSkill(input)
    }
    if (e.key === 'Backspace' && !input && value.length > 0) {
      removeSkill(value[value.length - 1])
    }
  }

  return (
    <div className="relative">
      <div className="min-h-12 w-full border border-gray-200 rounded-xl p-2 flex flex-wrap gap-2 focus-within:ring-2 focus-within:ring-blue-500 bg-white">
        {value.map(skill => (
          <span
            key={skill}
            className="flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm font-medium"
          >
            {skill}
            <button
              type="button"
              onClick={() => removeSkill(skill)}
              className="text-blue-500 hover:text-blue-700 font-bold ml-1"
            >
              ×
            </button>
          </span>
        ))}
        <input
          type="text"
          value={input}
          onChange={e => {
            setInput(e.target.value)
            setShowSuggestions(true)
          }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          placeholder={value.length === 0 ? (placeholder || 'Type a skill and press Enter...') : ''}
          className="flex-1 min-w-32 outline-none text-sm p-1 bg-transparent"
        />
      </div>

      {/* Suggestions dropdown */}
      {showSuggestions && input && filtered.length > 0 && (
        <div className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-xl shadow-lg z-50 mt-1 max-h-48 overflow-y-auto">
          {filtered.slice(0, 8).map(skill => (
            <button
              key={skill}
              type="button"
              onMouseDown={() => addSkill(skill)}
              className="w-full text-left px-4 py-2 text-sm hover:bg-blue-50 hover:text-blue-600 transition-colors"
            >
              {skill}
            </button>
          ))}
        </div>
      )}

      {/* Popular suggestions */}
      {showSuggestions && !input && (
        <div className="mt-2 flex flex-wrap gap-2">
          {SUGGESTED_SKILLS.filter(s => !value.includes(s)).slice(0, 10).map(skill => (
            <button
              key={skill}
              type="button"
              onMouseDown={() => addSkill(skill)}
              className="text-xs bg-gray-100 hover:bg-blue-100 hover:text-blue-600 text-gray-600 px-3 py-1 rounded-full transition-colors"
            >
              + {skill}
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-1">
        Press Enter or comma to add. Min 3 skills required.
      </p>
    </div>
  )
}