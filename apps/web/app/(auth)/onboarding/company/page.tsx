'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import apiClient from '../../../../services/apiClient'
import { authService } from '../../../../services/auth.service'
import ImageUpload from '../../../../components/ui/ImageUpload'
import { useAuthStore } from '../../../../store/authStore'

const INDUSTRIES = [
  'Technology', 'Design', 'Marketing', 'Finance',
  'Healthcare', 'Education', 'E-commerce', 'Media',
  'Real Estate', 'Consulting', 'Manufacturing', 'Other',
]

const EMPLOYEE_SIZES = ['1-10', '11-50', '51-200', '201-500', '500+']

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore',
  'Europe/London', 'Europe/Paris', 'America/New_York',
  'America/Los_Angeles', 'Australia/Sydney',
]

export default function CompanyOnboarding() {
  const router = useRouter()
  const { setUser, user } = useAuthStore()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) { router.replace('/login'); return }
    if (user.role === 'FREELANCER') { router.replace('/onboarding/freelancer'); return }
    if (user.role === 'CLIENT')     { router.replace('/onboarding/client');     return }
  }, [user])
  const [logoPreview, setLogoPreview] = useState<string | null>(null)

  const [companyName, setCompanyName] = useState('')
  const [industry, setIndustry] = useState('')
  const [employeeCount, setEmployeeCount] = useState('')
  const [website, setWebsite] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [timezone, setTimezone] = useState('Asia/Kolkata')
  const [bio, setBio] = useState('')

  const handleSubmit = async () => {
    if (!logoPreview) return toast.error('Company logo is required')
    if (!companyName.trim()) return toast.error('Company name is required')
    if (!industry) return toast.error('Industry is required')
    if (!employeeCount) return toast.error('Company size is required')
    if (!country.trim() || !city.trim()) return toast.error('Location is required')
    if (bio.trim().length < 50) return toast.error('Bio must be at least 50 characters')

    setLoading(true)
    try {
      await apiClient.put('/api/users/profile/company', {
        companyName: companyName.trim(),
        industry,
        employeeCount,
        website: website.trim(),
        country: country.trim(),
        city: city.trim(),
        timezone,
        location: `${city.trim()}, ${country.trim()}`,
        description: bio.trim(),
        profileImage: logoPreview,
      })

      const me = await authService.getMe()
      setUser(me.data)
      toast.success('Company profile saved!')
      router.push('/profile/company')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 space-y-5">
        <div>
          <h2 className="text-xl font-extrabold text-gray-800">Company Onboarding</h2>
          <p className="text-sm text-gray-500 mt-1">
            Add your company logo, business details, and hiring identity.
          </p>
        </div>

        <div className="flex flex-col items-center gap-3">
          <ImageUpload
            value={logoPreview}
            onChange={(url) => setLogoPreview(url)}
            shape="square"
            size="md"
            placeholder="🏢"
          />
          <p className="text-xs text-gray-500">Upload company logo</p>
        </div>

        <div>
          <label className="text-sm font-bold text-gray-700">
            Company Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Acme Labs"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <label className="text-sm font-bold text-gray-700">
              Industry <span className="text-red-500">*</span>
            </label>
            <select
              value={industry}
              onChange={(e) => setIndustry(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select industry</option>
              {INDUSTRIES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700">
              Company Size <span className="text-red-500">*</span>
            </label>
            <select
              value={employeeCount}
              onChange={(e) => setEmployeeCount(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              <option value="">Select size</option>
              {EMPLOYEE_SIZES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-gray-700">Website</label>
          <input
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            className="mt-1 w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://yourcompany.com"
          />
        </div>

        <div className="grid gap-5 sm:grid-cols-3">
          <div>
            <label className="text-sm font-bold text-gray-700">
              Country <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="India"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700">
              City <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Bengaluru"
            />
          </div>

          <div>
            <label className="text-sm font-bold text-gray-700">Timezone</label>
            <select
              value={timezone}
              onChange={(e) => setTimezone(e.target.value)}
              className="mt-1 w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            >
              {TIMEZONES.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-sm font-bold text-gray-700">
            Bio <span className="text-red-500">*</span>
          </label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={4}
            className="mt-1 w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            placeholder="Tell freelancers what your company does and what kind of work you hire for."
          />
          <p className={`text-xs mt-1 ${bio.trim().length < 50 ? 'text-red-400' : 'text-green-500'}`}>
            {bio.trim().length} / 50 minimum characters
          </p>
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-60"
        >
          {loading ? 'Saving...' : 'Complete Setup'}
        </button>
      </div>
    </div>
  )
}
