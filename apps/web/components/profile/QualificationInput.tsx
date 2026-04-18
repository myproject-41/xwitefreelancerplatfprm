'use client'

interface Qualification {
  degree: string
  institution: string
  year: string
  description: string
}

interface QualificationInputProps {
  value: Qualification[]
  onChange: (q: Qualification[]) => void
}

const empty: Qualification = {
  degree: '', institution: '', year: '', description: '',
}

export default function QualificationInput({ value, onChange }: QualificationInputProps) {
  const add = () => onChange([...value, { ...empty }])
  const remove = (i: number) => onChange(value.filter((_, idx) => idx !== i))
  const update = (i: number, field: keyof Qualification, val: string) => {
    const updated = [...value]
    updated[i] = { ...updated[i], [field]: val }
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      {value.map((q, i) => (
        <div key={i} className="bg-gray-50 rounded-xl p-4 border border-gray-200 space-y-3">
          <div className="flex justify-between items-center">
            <p className="font-bold text-sm text-gray-700">Qualification {i + 1}</p>
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
              <label className="text-xs font-bold text-gray-600">Degree / Certificate</label>
              <input
                type="text"
                value={q.degree}
                onChange={e => update(i, 'degree', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="B.Tech, MBA, AWS Certified..."
              />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600">Institution</label>
              <input
                type="text"
                value={q.institution}
                onChange={e => update(i, 'institution', e.target.value)}
                className="mt-1 w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="IIT, MIT, Coursera..."
              />
            </div>
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600">Year</label>
            <input
              type="text"
              value={q.year}
              onChange={e => update(i, 'year', e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="2022"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-gray-600">Description (optional)</label>
            <textarea
              value={q.description}
              onChange={e => update(i, 'description', e.target.value)}
              rows={2}
              className="mt-1 w-full border border-gray-200 rounded-lg p-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              placeholder="Brief description..."
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={add}
        className="w-full py-3 border-2 border-dashed border-gray-300 rounded-xl text-sm font-bold text-gray-500 hover:border-blue-400 hover:text-blue-500 transition-colors"
      >
        + Add Qualification
      </button>
    </div>
  )
}