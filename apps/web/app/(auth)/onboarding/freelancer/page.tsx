'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import SkillsInput from '../../../../components/profile/SkillsInput'
import ExperienceInput from '../../../../components/profile/ExperienceInput'
import QualificationInput from '../../../../components/profile/QualificationInput'
import HourlyRateInput from '../../../../components/profile/HourlyRateInput'
import apiClient from '../../../../services/apiClient'
import { authService } from '../../../../services/auth.service'
import { uploadService } from '../../../../services/upload.service'
import { useAuthStore } from '../../../../store/authStore'

const TIMEZONES = [
  'Asia/Kolkata', 'Asia/Dubai', 'Asia/Singapore',
  'Europe/London', 'Europe/Paris', 'America/New_York',
  'America/Los_Angeles', 'Australia/Sydney', 'Asia/Tokyo',
]

const LANGUAGES = [
  'English', 'Hindi', 'Spanish', 'French', 'German',
  'Arabic', 'Portuguese', 'Russian', 'Japanese', 'Chinese',
  'Tamil', 'Telugu', 'Bengali', 'Marathi', 'Punjabi',
]

const PROFICIENCY = ['BASIC', 'CONVERSATIONAL', 'FLUENT', 'NATIVE']
const EXPERIENCE_LEVELS = ['Beginner', 'Intermediate', 'Expert']
const AVAILABILITY_OPTIONS = [
  { value: true, label: 'Available Now', description: 'Open to new freelance work immediately.' },
  { value: false, label: 'Not Immediately Available', description: 'Clients will see your notice period instead.' },
]

export default function FreelancerOnboarding() {
  const router = useRouter()
  const { setUser, user } = useAuthStore()
  const [step, setStep] = useState(1)

  useEffect(() => {
    if (!user) { router.replace('/login'); return }
    if (user.role === 'COMPANY') { router.replace('/onboarding/company'); return }
    if (user.role === 'CLIENT')  { router.replace('/onboarding/client');  return }
  }, [user])
  const [loading, setLoading] = useState(false)
  const [profileImageUrl, setProfileImageUrl] = useState<string | null>(null)
  const profileInputRef = useRef<HTMLInputElement>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [profileUploading, setProfileUploading] = useState(false)
  const [profileHover, setProfileHover] = useState(false)

  const BRAND = '#005d8f'
  const GREEN = '#16a34a'

  const optimizeSquareImage = async (file: File) => {
    const sourceUrl = URL.createObjectURL(file)
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('Could not read image'))
        img.src = sourceUrl
      })
      const cropSize = Math.min(image.naturalWidth, image.naturalHeight)
      const cropX = (image.naturalWidth - cropSize) / 2
      const cropY = (image.naturalHeight - cropSize) / 2
      const outputSize = 512
      const canvas = document.createElement('canvas')
      canvas.width = outputSize
      canvas.height = outputSize
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas not supported')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(image, cropX, cropY, cropSize, cropSize, 0, 0, outputSize, outputSize)
      const blob = await new Promise<Blob>((res, rej) => {
        canvas.toBlob(b => { if (!b) rej(new Error('Failed')); else res(b) }, 'image/webp', 0.92)
      })
      return {
        file: new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'profile'}.webp`, { type: 'image/webp' }),
        previewUrl: URL.createObjectURL(blob),
      }
    } finally { URL.revokeObjectURL(sourceUrl) }
  }

  useEffect(() => {
    return () => { if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview) }
  }, [imagePreview])

  const handleProfileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setProfileUploading(true)
    try {
      const { file: optimizedFile, previewUrl } = await optimizeSquareImage(file)
      setImagePreview(previewUrl)
      const url = await uploadService.uploadImage(optimizedFile)
      setProfileImageUrl(url)
      setImagePreview(url)
      toast.success('Profile image uploaded!')
    } catch (error: any) {
      setProfileImageUrl(null)
      toast.error(error.response?.data?.message || 'Profile upload failed')
    } finally { setProfileUploading(false); e.target.value = '' }
  }

  const [fullName, setFullName] = useState('')
  const [title, setTitle] = useState('')
  const [bio, setBio] = useState('')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [timezone, setTimezone] = useState('Asia/Kolkata')

  const [skills, setSkills] = useState<string[]>([])
  const [hourlyRate, setHourlyRate] = useState<number | ''>('')
  const [currency, setCurrency] = useState('INR')
  const [fixedPrice, setFixedPrice] = useState(false)
  const [minBudget, setMinBudget] = useState<number | ''>('')
  const [experienceLevel, setExperienceLevel] = useState('Intermediate')
  const [availability, setAvailability] = useState(true)
  const [noticePeriod, setNoticePeriod] = useState('IMMEDIATELY')
  const [languages, setLanguages] = useState<{ language: string; proficiency: string }[]>([
    { language: 'English', proficiency: 'FLUENT' },
  ])

  const [experience, setExperience] = useState<any[]>([])
  const [qualifications, setQualifications] = useState<any[]>([])
  const [portfolioUrls, setPortfolioUrls] = useState<{ label: string; url: string }[]>([
    { label: 'GitHub', url: '' },
  ])

  const addLanguage = () => {
    setLanguages((current) => [...current, { language: 'Hindi', proficiency: 'BASIC' }])
  }

  const updateLanguage = (index: number, field: 'language' | 'proficiency', value: string) => {
    setLanguages((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    )
  }

  const removeLanguage = (index: number) => {
    setLanguages((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const addPortfolio = () => {
    setPortfolioUrls((current) => [...current, { label: 'Portfolio', url: '' }])
  }

  const updatePortfolio = (index: number, field: 'label' | 'url', value: string) => {
    setPortfolioUrls((current) =>
      current.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [field]: value } : item
      )
    )
  }

  const removePortfolio = (index: number) => {
    setPortfolioUrls((current) => current.filter((_, itemIndex) => itemIndex !== index))
  }

  const validateStep1 = () => {
    if (!profileImageUrl) return toast.error('Profile image is required')
    if (!fullName.trim()) return toast.error('Name is required')
    if (!title.trim()) return toast.error('Title is required')
    if (!country.trim()) return toast.error('Country is required')
    if (bio.trim().length < 50) return toast.error('Bio must be at least 50 characters')
    return true
  }

  const validateStep2 = () => {
    if (skills.length < 3) return toast.error('Add at least 3 skills')
    if (!hourlyRate || Number(hourlyRate) <= 0) return toast.error('Hourly rate is required')
    return true
  }

  const handleSubmit = async () => {
    setLoading(true)
    try {
      await apiClient.put('/api/users/profile/freelancer', {
        fullName: fullName.trim(),
        title: title.trim(),
        bio: bio.trim(),
        profileImage: profileImageUrl,
        skills,
        hourlyRate: Number(hourlyRate),
        experienceLevel,
        country: country.trim(),
        city: city.trim(),
        timezone,
        languages,
        portfolioUrls: portfolioUrls
          .filter((item) => item.url.trim())
          .map((item) => ({ label: item.label.trim() || 'Portfolio', url: item.url.trim() })),
        availability,
        currency,
        fixedPrice,
        minBudget: minBudget ? Number(minBudget) : null,
        noticePeriod: availability ? 'IMMEDIATELY' : noticePeriod,
        experience,
        qualifications,
      })

      const me = await authService.getMe()
      setUser(me.data)
      toast.success('Freelancer profile saved!')
      router.push('/profile/freelancer')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save profile')
    } finally {
      setLoading(false)
    }
  }

  const isStep1Valid =
    !!profileImageUrl &&
    !!fullName.trim() &&
    !!title.trim() &&
    !!country.trim() &&
    bio.trim().length >= 50

  const isStep2Valid =
    skills.length >= 3 &&
    !!hourlyRate &&
    Number(hourlyRate) > 0

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          {['Profile', 'Rates', 'Portfolio'].map((label, index) => (
            <div
              key={label}
              className={`flex items-center gap-2 text-sm font-bold ${
                step === index + 1 ? 'text-blue-600' : step > index + 1 ? 'text-green-500' : 'text-gray-400'
              }`}
            >
              <span
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-extrabold ${
                  step === index + 1
                    ? 'bg-blue-600 text-white'
                    : step > index + 1
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-200 text-gray-500'
                }`}
              >
                {step > index + 1 ? '✓' : index + 1}
              </span>
              <span className="hidden sm:inline">{label}</span>
            </div>
          ))}
        </div>
        <div className="h-2 bg-gray-200 rounded-full">
          <div
            className="h-2 bg-blue-600 rounded-full transition-all"
            style={{ width: `${((step - 1) / 2) * 100}%` }}
          />
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
        {step === 1 && (
          <div className="space-y-5">
            <h2 className="text-xl font-extrabold text-gray-800">Freelancer Onboarding</h2>

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <div style={{ position: 'relative', width: 96, height: 96 }}>
                <div
                  onClick={() => profileInputRef.current?.click()}
                  onMouseEnter={() => setProfileHover(true)}
                  onMouseLeave={() => setProfileHover(false)}
                  style={{
                    width: 96, height: 96,
                    borderRadius: 14,
                    overflow: 'hidden',
                    background: imagePreview ? 'transparent' : '#e2e5e9',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                    border: profileHover && !imagePreview ? `2px dashed ${BRAND}` : '1.5px solid #e5e7eb',
                    transition: 'border 0.2s',
                  }}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: 40, color: profileHover ? BRAND : '#adb5bd', transition: 'color 0.2s' }}>person</span>
                  )}
                  {imagePreview && profileHover && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 14 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 26, color: 'white' }}>edit</span>
                    </div>
                  )}
                  {profileUploading && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', border: `3px solid ${BRAND}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: BRAND }}>Uploading…</span>
                    </div>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => profileInputRef.current?.click()}
                  style={{
                    position: 'absolute', bottom: -4, right: -8,
                    width: 26, height: 26, borderRadius: '50%',
                    background: BRAND, color: 'white',
                    border: '2px solid white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,93,143,0.45)',
                    zIndex: 5,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>photo_camera</span>
                </button>
              </div>
              <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>Upload profile photo</span>
            </div>
            <input ref={profileInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleProfileChange} style={{ display: 'none' }} />
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-gray-700">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="text-sm font-bold text-gray-700">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Senior React Developer"
                />
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
                placeholder="Tell clients about your services, niche, and what kind of freelance work you do."
              />
              <p className={`text-xs mt-1 ${bio.trim().length < 50 ? 'text-red-400' : 'text-green-500'}`}>
                {bio.trim().length} / 50 minimum characters
              </p>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Skills <span className="text-red-500">*</span>
              </label>
              <div className="mt-1">
                <SkillsInput value={skills} onChange={setSkills} />
              </div>
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
                <label className="text-sm font-bold text-gray-700">City</label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Mumbai"
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

            <button
              type="button"
              onClick={() => {
                if (validateStep1()) setStep(2)
              }}
              disabled={!isStep1Valid}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Continue →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6">
            <h2 className="text-xl font-extrabold text-gray-800">Rates, Experience, Availability</h2>

            <div>
              <label className="text-sm font-bold text-gray-700">
                Experience Level <span className="text-red-500">*</span>
              </label>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {EXPERIENCE_LEVELS.map((level) => (
                  <button
                    key={level}
                    type="button"
                    onClick={() => setExperienceLevel(level)}
                    className={`rounded-xl border-2 px-4 py-3 text-sm font-bold transition-colors ${
                      experienceLevel === level
                        ? 'border-blue-600 bg-blue-50 text-blue-700'
                        : 'border-gray-200 text-gray-600 hover:border-gray-300'
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>

            <HourlyRateInput
              hourlyRate={hourlyRate}
              currency={currency}
              fixedPrice={fixedPrice}
              minBudget={minBudget}
              onHourlyRateChange={setHourlyRate}
              onCurrencyChange={setCurrency}
              onFixedPriceChange={setFixedPrice}
              onMinBudgetChange={setMinBudget}
            />

            <div>
              <label className="text-sm font-bold text-gray-700">Availability</label>
              <div className="mt-2 grid gap-2">
                {AVAILABILITY_OPTIONS.map((option) => (
                  <button
                    key={option.label}
                    type="button"
                    onClick={() => setAvailability(option.value)}
                    className={`rounded-xl border-2 p-4 text-left transition-colors ${
                      availability === option.value
                        ? 'border-blue-600 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <p className="font-bold text-sm text-gray-800">{option.label}</p>
                    <p className="text-xs text-gray-500 mt-1">{option.description}</p>
                  </button>
                ))}
              </div>
            </div>

            {!availability && (
              <div>
                <label className="text-sm font-bold text-gray-700">Notice Period</label>
                <select
                  value={noticePeriod}
                  onChange={(e) => setNoticePeriod(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  <option value="ONE_WEEK">1 Week</option>
                  <option value="TWO_WEEKS">2 Weeks</option>
                  <option value="ONE_MONTH">1 Month</option>
                  <option value="MORE_THAN_ONE_MONTH">More than 1 Month</option>
                </select>
              </div>
            )}

            <div>
              <label className="text-sm font-bold text-gray-700">Languages</label>
              <div className="mt-2 space-y-2">
                {languages.map((item, index) => (
                  <div key={`${item.language}-${index}`} className="flex gap-2 items-center">
                    <select
                      value={item.language}
                      onChange={(e) => updateLanguage(index, 'language', e.target.value)}
                      className="flex-1 border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {LANGUAGES.map((language) => (
                        <option key={language} value={language}>{language}</option>
                      ))}
                    </select>
                    <select
                      value={item.proficiency}
                      onChange={(e) => updateLanguage(index, 'proficiency', e.target.value)}
                      className="flex-1 border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {PROFICIENCY.map((level) => (
                        <option key={level} value={level}>{level}</option>
                      ))}
                    </select>
                    {languages.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeLanguage(index)}
                        className="text-red-500 text-lg font-bold px-2"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addLanguage}
                  className="text-sm text-blue-600 font-bold hover:underline"
                >
                  + Add language
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-50"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={() => {
                  if (validateStep2()) setStep(3)
                }}
                disabled={!isStep2Valid}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continue →
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6">
            <h2 className="text-xl font-extrabold text-gray-800">Proof of Work</h2>

            <div>
              <label className="text-sm font-bold text-gray-700">Experience</label>
              <div className="mt-2">
                <ExperienceInput value={experience} onChange={setExperience} />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">Qualifications</label>
              <div className="mt-2">
                <QualificationInput value={qualifications} onChange={setQualifications} />
              </div>
            </div>

            <div>
              <label className="text-sm font-bold text-gray-700">Portfolio Links</label>
              <p className="text-xs text-gray-500 mt-1">
                Add multiple links like GitHub, personal website, Behance, Dribbble, or LinkedIn.
              </p>
              <div className="mt-2 space-y-2">
                {portfolioUrls.map((item, index) => (
                  <div key={`${item.label}-${index}`} className="flex gap-2">
                    <select
                      value={item.label}
                      onChange={(e) => updatePortfolio(index, 'label', e.target.value)}
                      className="w-36 border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                      {['GitHub', 'Portfolio', 'Website', 'LinkedIn', 'Behance', 'Dribbble', 'Other'].map((label) => (
                        <option key={label} value={label}>{label}</option>
                      ))}
                    </select>
                    <input
                      type="url"
                      value={item.url}
                      onChange={(e) => updatePortfolio(index, 'url', e.target.value)}
                      className="flex-1 border border-gray-200 rounded-xl p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="https://..."
                    />
                    {portfolioUrls.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removePortfolio(index)}
                        className="text-red-500 text-lg font-bold px-2"
                      >
                        ×
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addPortfolio}
                  className="text-sm text-blue-600 font-bold hover:underline"
                >
                  + Add link
                </button>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setStep(2)}
                className="flex-1 border border-gray-300 text-gray-600 py-3 rounded-xl font-bold hover:bg-gray-50"
              >
                ← Back
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                className="flex-1 bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 disabled:opacity-60"
              >
                {loading ? 'Saving...' : 'Complete Profile'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
