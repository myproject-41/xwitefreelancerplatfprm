'use client'

interface HourlyRateInputProps {
  hourlyRate: number | ''
  currency: string
  fixedPrice: boolean
  minBudget: number | ''
  onHourlyRateChange: (v: number | '') => void
  onCurrencyChange: (v: string) => void
  onFixedPriceChange: (v: boolean) => void
  onMinBudgetChange: (v: number | '') => void
}

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AUD', 'CAD', 'SGD']

export default function HourlyRateInput({
  hourlyRate, currency, fixedPrice, minBudget,
  onHourlyRateChange, onCurrencyChange,
  onFixedPriceChange, onMinBudgetChange,
}: HourlyRateInputProps) {
  return (
    <div className="space-y-4">
      {/* Hourly Rate */}
      <div>
        <label className="text-sm font-bold text-gray-700">
          Hourly Rate <span className="text-red-500">*</span>
        </label>
        <div className="mt-1 flex gap-2">
          <select
            value={currency}
            onChange={e => onCurrencyChange(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
          >
            {CURRENCIES.map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
          <input
            type="number"
            min={1}
            value={hourlyRate}
            onChange={e => onHourlyRateChange(e.target.value ? Number(e.target.value) : '')}
            className="flex-1 border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. 1500"
          />
          <span className="flex items-center text-sm text-gray-500 font-medium">/ hr</span>
        </div>
        {hourlyRate && (
          <p className="text-xs text-green-600 mt-1 font-medium">
            ≈ {currency} {Number(hourlyRate) * 160}/month (full-time)
          </p>
        )}
      </div>

      {/* Fixed Price Toggle */}
      <div className="flex items-center justify-between bg-gray-50 rounded-xl p-4 border border-gray-200">
        <div>
          <p className="font-bold text-sm text-gray-700">Accept Fixed Price Projects</p>
          <p className="text-xs text-gray-500 mt-0.5">Toggle on if you work on project basis</p>
        </div>
        <button
          type="button"
          onClick={() => onFixedPriceChange(!fixedPrice)}
          className={`relative w-12 h-6 rounded-full transition-colors ${
            fixedPrice ? 'bg-blue-600' : 'bg-gray-300'
          }`}
        >
          <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
            fixedPrice ? 'translate-x-6' : 'translate-x-0.5'
          }`} />
        </button>
      </div>

      {/* Min Budget (shows only if fixed price on) */}
      {fixedPrice && (
        <div>
          <label className="text-sm font-bold text-gray-700">
            Minimum Project Budget ({currency})
          </label>
          <input
            type="number"
            min={1}
            value={minBudget}
            onChange={e => onMinBudgetChange(e.target.value ? Number(e.target.value) : '')}
            className="mt-1 w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g. 10000"
          />
          <p className="text-xs text-gray-400 mt-1">
            Minimum budget you accept for a fixed price project
          </p>
        </div>
      )}
    </div>
  )
}