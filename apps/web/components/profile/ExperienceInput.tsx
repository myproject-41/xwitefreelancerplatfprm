'use client'

interface Experience {
  company: string
  role: string
  startDate: string
  endDate: string
  current: boolean
  description: string
}

interface ExperienceInputProps {
  value: Experience[]
  onChange: (exp: Experience[]) => void
}

const empty: Experience = {
  company: '', role: '', startDate: '',
  endDate: '', current: false, description: '',
}

export default function ExperienceInput({ value, onChange }: ExperienceInputProps) {
  const add = () => onChange([...value, { ...empty }])

  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))

  const update = (i: number, field: keyof Experience, val: any) => {
    const updated = [...value]
    updated[i] = { ...updated[i], [field]: val }
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      {value.map((exp, i) => (
        <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
          <div className="flex justify-between items-center">
            <p className="font-bold text-sm text-gray-700">Experience {i + 1}</p>
            <button
              type="button"
              onClick={() => remove(i)}
              className="text-red-400 hover:text-red-600 text-sm font-bold"
            >
              Remove
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600">Company</label>
              <input
                type="text"
                value={exp.company}
                onChange={e => update(i, 'company', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Google, Startup XYZ..."
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600">Role / Title</label>
              <input
                type="text"
                value={exp.role}
                onChange={e => update(i, 'role', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Senior Developer..."
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-600">Start Date</label>
              <input
                type="month"
                value={exp.startDate}
                onChange={e => update(i, 'startDate', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600">End Date</label>
              <input
                type="month"
                value={exp.endDate}
                onChange={e => update(i, 'endDate', e.target.value)}
                disabled={exp.current}
                className="mt-1 w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
              />
            </div>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={exp.current}
              onChange={e => update(i, 'current', e.target.checked)}
              className="w-4 h-4 accent-blue-600"
            />
            <span className="text-sm text-gray-600">I currently work here</span>
          </label>

          <div>
            <label className="text-xs font-bold text-gray-600">Description</label>
            <textarea
              value={exp.description}
              onChange={e => update(i, 'description', e.target.value)}
              rows={3}
              className="mt-1 w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="What did you build or achieve here..."
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-bold text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
      >
        + Add Experience
      </button>
    </div>
  )
}