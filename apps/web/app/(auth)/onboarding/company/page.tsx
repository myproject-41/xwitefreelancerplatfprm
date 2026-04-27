'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import apiClient from '../../../../services/apiClient'
import { authService } from '../../../../services/auth.service'
import { uploadService } from '../../../../services/upload.service'
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
  const logoInputRef = useRef<HTMLInputElement>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [logoUploading, setLogoUploading] = useState(false)
  const [logoHover, setLogoHover] = useState(false)

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
        file: new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'logo'}.webp`, { type: 'image/webp' }),
        previewUrl: URL.createObjectURL(blob),
      }
    } finally { URL.revokeObjectURL(sourceUrl) }
  }

  useEffect(() => {
    return () => { if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview) }
  }, [imagePreview])

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setLogoUploading(true)
    try {
      const { file: optimizedFile, previewUrl } = await optimizeSquareImage(file)
      setImagePreview(previewUrl)
      const url = await uploadService.uploadImage(optimizedFile)
      setLogoPreview(url)
      setImagePreview(url)
      toast.success('Logo uploaded!')
    } catch (error: any) {
      setLogoPreview(null)
      toast.error(error.response?.data?.message || 'Logo upload failed')
    } finally { setLogoUploading(false); e.target.value = '' }
  }

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

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <div style={{ position: 'relative', width: 96, height: 96 }}>
            <div
              onClick={() => logoInputRef.current?.click()}
              onMouseEnter={() => setLogoHover(true)}
              onMouseLeave={() => setLogoHover(false)}
              style={{
                width: 96, height: 96,
                borderRadius: 14,
                overflow: 'hidden',
                background: imagePreview ? 'transparent' : '#e2e5e9',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                position: 'relative',
                border: logoHover && !imagePreview ? `2px dashed ${BRAND}` : '1.5px solid #e5e7eb',
                transition: 'border 0.2s',
              }}
            >
              {imagePreview ? (
                <img src={imagePreview} alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <span className="material-symbols-outlined" style={{ fontSize: 40, color: logoHover ? BRAND : '#adb5bd', transition: 'color 0.2s' }}>business</span>
              )}
              {imagePreview && logoHover && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 14 }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 26, color: 'white' }}>edit</span>
                </div>
              )}
              {logoUploading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5 }}>
                  <div style={{ width: 22, height: 22, borderRadius: '50%', border: `3px solid ${BRAND}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
                  <span style={{ fontSize: 10, fontWeight: 700, color: BRAND }}>Uploading…</span>
                </div>
              )}
            </div>
            {logoPreview && !logoUploading && (
              <div style={{
                position: 'absolute', top: -6, right: -6,
                width: 20, height: 20, borderRadius: '50%',
                background: GREEN, border: '2px solid white',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 2px 6px rgba(22,163,74,0.5)',
              }}>
                <span className="material-symbols-outlined" style={{ fontSize: 11, color: 'white', fontVariationSettings: "'FILL' 1" }}>check</span>
              </div>
            )}
            <button
              type="button"
              onClick={() => logoInputRef.current?.click()}
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
          <span style={{ fontSize: 12, color: '#9ca3af', fontWeight: 500 }}>Upload company logo</span>
        </div>
        <input ref={logoInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleLogoChange} style={{ display: 'none' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

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
