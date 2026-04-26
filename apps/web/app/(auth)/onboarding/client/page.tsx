'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import apiClient from '../../../../services/apiClient'
import { authService } from '../../../../services/auth.service'
import { uploadService } from '../../../../services/upload.service'
import { useAuthStore } from '../../../../store/authStore'

export default function ClientOnboarding() {
  const router = useRouter()
  const { setUser, user } = useAuthStore()
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!user) { router.replace('/login'); return }
    if (user.role === 'FREELANCER') { router.replace('/onboarding/freelancer'); return }
    if (user.role === 'COMPANY')    { router.replace('/onboarding/company');    return }
  }, [user])

  const profileInputRef = useRef<HTMLInputElement>(null)
  const [imagePreview, setImagePreview]     = useState<string | null>(null)
  const [profileImage, setProfileImage]     = useState<string | null>(null)
  const [profileUploading, setProfileUploading] = useState(false)
  const [profileHover, setProfileHover]     = useState(false)
  const [fullName, setFullName]             = useState('')
  const [bio, setBio]                       = useState('')
  const [country, setCountry]               = useState('')
  const [city, setCity]                     = useState('')
  const [btnHover, setBtnHover]             = useState(false)
  const [skipHover, setSkipHover]           = useState(false)
  const [nameFocus, setNameFocus]           = useState(false)
  const [bioFocus, setBioFocus]             = useState(false)
  const [countryFocus, setCountryFocus]     = useState(false)
  const [cityFocus, setCityFocus]           = useState(false)

  const bioLen      = bio.trim().length
  const bioValid    = bioLen >= 50
  const isSubmitting = loading || profileUploading

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

  const handleSubmit = async () => {
    if (isSubmitting) return toast.error('Please wait for uploads to finish')
    if (!profileImage) return toast.error('Profile image is required')
    if (!fullName.trim()) return toast.error('Name is required')
    if (!bioValid) return toast.error('Bio must be at least 50 characters')
    setLoading(true)
    try {
      await apiClient.put('/api/users/profile/client', {
        fullName: fullName.trim(),
        profileImage,
        description: bio.trim(),
        ...(country.trim() ? { country: country.trim() } : {}),
        ...(city.trim() ? { city: city.trim() } : {}),
      })
      const me = await authService.getMe()
      setUser(me.data)
      toast.success('Profile saved!')
      router.push('/profile')
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save profile')
    } finally { setLoading(false) }
  }

  const handleProfileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
    setProfileUploading(true)
    try {
      const { file: optimizedFile, previewUrl } = await optimizeSquareImage(file)
      setImagePreview(previewUrl)
      const url = await uploadService.uploadImage(optimizedFile)
      setProfileImage(url)
      setImagePreview(url)
      toast.success('Profile image uploaded!')
    } catch (error: any) {
      setProfileImage(null)
      toast.error(error.response?.data?.message || 'Profile upload failed')
    } finally { setProfileUploading(false); e.target.value = '' }
  }

  return (
    <div style={{ fontFamily: 'Manrope, Inter, sans-serif', background: '#f5f4f1', minHeight: '100vh', padding: '48px 24px 80px' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .ob { animation: fadeUp 0.35s ease both; }
      `}</style>

      <div className="ob" style={{ maxWidth: 680, margin: '0 auto' }}>
        <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', padding: '32px 36px 36px' }}>

          <div style={{ marginBottom: 24 }}>
            <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, color: '#111827' }}>Set Up Your Profile</h2>
            <p style={{ margin: 0, fontSize: 13, color: '#6b7280' }}>Add your photo and details to get started.</p>
          </div>

          {/* Centered square profile image */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10, marginBottom: 28 }}>
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

              {profileImage && !profileUploading && (
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

          <div style={{ height: 1, background: '#f3f4f6', marginBottom: 20 }} />

          {/* Full Name */}
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>
              Full Name <span style={{ color: '#ef4444' }}>*</span>
            </label>
            <input
              type="text"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Julian Montgomery"
              onFocus={() => setNameFocus(true)}
              onBlur={() => setNameFocus(false)}
              style={{
                display: 'block', width: '100%', boxSizing: 'border-box',
                background: nameFocus ? '#fff' : '#f9fafb',
                border: `1.5px solid ${nameFocus ? BRAND : '#e5e7eb'}`,
                borderRadius: 9, padding: '12px 15px',
                fontSize: 15, color: '#111827', outline: 'none', fontFamily: 'inherit',
                transition: 'border-color 0.15s, background 0.15s',
                boxShadow: nameFocus ? '0 0 0 3px rgba(0,93,143,0.08)' : 'none',
              }}
            />
          </div>

          {/* Bio */}
          <div style={{ marginBottom: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 7 }}>
              <label style={{ fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Professional Bio <span style={{ color: '#ef4444' }}>*</span>
              </label>
              <span style={{ fontSize: 11, fontWeight: 600, color: bioValid ? GREEN : '#9ca3af' }}>{bioLen}/500</span>
            </div>
            <textarea
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={5}
              maxLength={500}
              placeholder="Craft your narrative… Highlight your vision or leadership philosophy."
              onFocus={() => setBioFocus(true)}
              onBlur={() => setBioFocus(false)}
              style={{
                display: 'block', width: '100%', boxSizing: 'border-box',
                background: bioFocus ? '#fff' : '#f9fafb',
                border: `1.5px solid ${bioFocus ? BRAND : '#e5e7eb'}`,
                borderRadius: 9, padding: '12px 15px',
                fontSize: 14, color: '#111827', outline: 'none',
                resize: 'none', fontFamily: 'inherit', lineHeight: 1.7,
                transition: 'border-color 0.15s, background 0.15s',
                boxShadow: bioFocus ? '0 0 0 3px rgba(0,93,143,0.08)' : 'none',
              }}
            />
            <div style={{ marginTop: 7, display: 'flex', alignItems: 'center', gap: 9 }}>
              <div style={{ flex: 1, height: 3, background: '#f3f4f6', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 999,
                  width: `${Math.min((bioLen / 50) * 100, 100)}%`,
                  background: bioValid ? GREEN : BRAND,
                  transition: 'width 0.25s ease, background 0.25s ease',
                }} />
              </div>
              <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: 'nowrap', color: bioValid ? GREEN : '#6b7280' }}>
                {bioValid ? '✓ Minimum met' : `${50 - bioLen} more to go`}
              </span>
            </div>
          </div>

          {/* Country + City */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 28 }}>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>Country</label>
              <input
                type="text"
                value={country}
                onChange={e => setCountry(e.target.value)}
                placeholder="e.g. United States"
                onFocus={() => setCountryFocus(true)}
                onBlur={() => setCountryFocus(false)}
                style={{
                  display: 'block', width: '100%', boxSizing: 'border-box',
                  background: countryFocus ? '#fff' : '#f9fafb',
                  border: `1.5px solid ${countryFocus ? BRAND : '#e5e7eb'}`,
                  borderRadius: 9, padding: '12px 15px',
                  fontSize: 15, color: '#111827', outline: 'none', fontFamily: 'inherit',
                  transition: 'border-color 0.15s, background 0.15s',
                  boxShadow: countryFocus ? '0 0 0 3px rgba(0,93,143,0.08)' : 'none',
                }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>City</label>
              <input
                type="text"
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. New York"
                onFocus={() => setCityFocus(true)}
                onBlur={() => setCityFocus(false)}
                style={{
                  display: 'block', width: '100%', boxSizing: 'border-box',
                  background: cityFocus ? '#fff' : '#f9fafb',
                  border: `1.5px solid ${cityFocus ? BRAND : '#e5e7eb'}`,
                  borderRadius: 9, padding: '12px 15px',
                  fontSize: 15, color: '#111827', outline: 'none', fontFamily: 'inherit',
                  transition: 'border-color 0.15s, background 0.15s',
                  boxShadow: cityFocus ? '0 0 0 3px rgba(0,93,143,0.08)' : 'none',
                }}
              />
            </div>
          </div>

          {/* Buttons */}
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              onMouseEnter={() => setBtnHover(true)}
              onMouseLeave={() => setBtnHover(false)}
              style={{
                flex: 1, minWidth: 180,
                background: BRAND,
                color: 'white', border: 'none', borderRadius: 9,
                padding: '13px 18px', fontSize: 14, fontWeight: 700,
                cursor: isSubmitting ? 'not-allowed' : 'pointer',
                opacity: isSubmitting ? 0.65 : 1, fontFamily: 'inherit',
                boxShadow: btnHover && !isSubmitting ? '0 8px 24px rgba(0,119,181,0.42)' : '0 4px 14px rgba(0,119,181,0.25)',
                transform: btnHover && !isSubmitting ? 'translateY(-1px)' : 'translateY(0)',
                transition: 'box-shadow 0.2s, transform 0.2s',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7,
              }}
            >
              {isSubmitting ? (
                <>
                  <div style={{ width: 15, height: 15, borderRadius: '50%', border: '2.5px solid rgba(255,255,255,0.35)', borderTopColor: 'white', animation: 'spin 0.7s linear infinite' }} />
                  {loading ? 'Saving…' : 'Uploading photo…'}
                </>
              ) : (
                <>
                  Continue
                  <span className="material-symbols-outlined" style={{ fontSize: 17 }}>arrow_forward</span>
                </>
              )}
            </button>

            <button
              type="button"
              onMouseEnter={() => setSkipHover(true)}
              onMouseLeave={() => setSkipHover(false)}
              style={{
                padding: '13px 22px',
                background: skipHover ? '#edecea' : '#f3f2ef',
                color: skipHover ? '#374151' : '#6b7280',
                border: '1.5px solid #e5e7eb', borderRadius: 9,
                fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              Skip for now
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
