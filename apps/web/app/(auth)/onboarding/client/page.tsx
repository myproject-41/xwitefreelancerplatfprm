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
  const coverInputRef = useRef<HTMLInputElement>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [profileImage, setProfileImage] = useState<string | null>(null)
  const [profileUploading, setProfileUploading] = useState(false)
  const [coverPreview, setCoverPreview] = useState<string | null>(null)
  const [coverImage, setCoverImage] = useState<string | null>(null)
  const [coverUploading, setCoverUploading] = useState(false)
  const [fullName, setFullName] = useState('')
  const [bio, setBio] = useState('')
  const [coverHover, setCoverHover] = useState(false)
  const [profileHover, setProfileHover] = useState(false)
  const [btnHover, setBtnHover] = useState(false)
  const [skipHover, setSkipHover] = useState(false)
  const [nameFocus, setNameFocus] = useState(false)
  const [bioFocus, setBioFocus] = useState(false)
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [countryFocus, setCountryFocus] = useState(false)
  const [cityFocus, setCityFocus] = useState(false)

  const bioLen   = bio.trim().length
  const bioValid = bioLen >= 50

  // Use preview state for images so checklist ticks instantly on file select,
  // not only after the CDN upload finishes (which can take several seconds).
  const checklist = [
    { label: 'Profile photo',   done: !!imagePreview    },
    { label: 'Cover image',     done: !!coverPreview    },
    { label: 'Full name',       done: !!fullName.trim() },
    { label: 'Bio (50+ chars)', done: bioValid          },
  ]
  const doneCount    = checklist.filter(c => c.done).length
  const BASE_PCT     = 20
  const pct          = BASE_PCT + doneCount * 20
  const isSubmitting = loading || coverUploading || profileUploading

  const BRAND  = '#005d8f'
  const BRAND2 = '#005d8f'
  const GREEN  = '#16a34a'

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

  const optimizeCoverImage = async (file: File) => {
    const sourceUrl = URL.createObjectURL(file)
    try {
      const image = await new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image()
        img.onload = () => resolve(img)
        img.onerror = () => reject(new Error('Could not read image'))
        img.src = sourceUrl
      })
      const targetRatio = 16 / 4.6
      const sourceRatio = image.naturalWidth / image.naturalHeight
      let cropWidth = image.naturalWidth, cropHeight = image.naturalHeight, cropX = 0, cropY = 0
      if (sourceRatio > targetRatio) { cropWidth = image.naturalHeight * targetRatio; cropX = (image.naturalWidth - cropWidth) / 2 }
      else { cropHeight = image.naturalWidth / targetRatio; cropY = (image.naturalHeight - cropHeight) / 2 }
      const outputWidth = 1600
      const outputHeight = Math.round(outputWidth / targetRatio)
      const canvas = document.createElement('canvas')
      canvas.width = outputWidth
      canvas.height = outputHeight
      const ctx = canvas.getContext('2d')
      if (!ctx) throw new Error('Canvas not supported')
      ctx.imageSmoothingEnabled = true
      ctx.imageSmoothingQuality = 'high'
      ctx.drawImage(image, cropX, cropY, cropWidth, cropHeight, 0, 0, outputWidth, outputHeight)
      const blob = await new Promise<Blob>((res, rej) => {
        canvas.toBlob(b => { if (!b) rej(new Error('Failed')); else res(b) }, 'image/webp', 0.9)
      })
      return {
        file: new File([blob], `${file.name.replace(/\.[^.]+$/, '') || 'cover'}.webp`, { type: 'image/webp' }),
        previewUrl: URL.createObjectURL(blob),
      }
    } finally { URL.revokeObjectURL(sourceUrl) }
  }

  useEffect(() => {
    return () => {
      if (imagePreview?.startsWith('blob:')) URL.revokeObjectURL(imagePreview)
      if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview)
    }
  }, [coverPreview, imagePreview])

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
        ...(coverImage ? { coverImage } : {}),
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

  const handleCoverChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    if (coverPreview?.startsWith('blob:')) URL.revokeObjectURL(coverPreview)
    setCoverUploading(true)
    try {
      const { file: optimizedFile, previewUrl } = await optimizeCoverImage(file)
      setCoverPreview(previewUrl)
      const url = await uploadService.uploadImage(optimizedFile)
      setCoverImage(url)
      setCoverPreview(url)
      toast.success('Cover image uploaded!')
    } catch (error: any) {
      setCoverImage(null)
      toast.error(error.response?.data?.message || 'Cover upload failed')
    } finally { setCoverUploading(false); e.target.value = '' }
  }

  return (
    <div style={{ fontFamily: 'Manrope, Inter, sans-serif', background: '#f5f4f1', minHeight: '100vh', padding: '48px 24px 80px' }}>
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(14px); } to { opacity:1; transform:translateY(0); } }
        .ob { animation: fadeUp 0.35s ease both; }
      `}</style>

      <div className="ob" style={{ maxWidth: 1080, margin: '0 auto', display: 'flex', gap: 28, alignItems: 'flex-start' }}>

        {/* ══ LEFT COLUMN ═════════════════════════════════════════ */}
        <div style={{ flex: 1, minWidth: 0 }}>

          {/* Form card */}
          <div style={{ background: 'white', borderRadius: 16, border: '1px solid #e5e7eb', boxShadow: '0 2px 12px rgba(0,0,0,0.05)', padding: '32px 36px 36px' }}>

            {/* Section header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20, paddingBottom: 14, borderBottom: '1px solid #f3f4f6' }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: '#e8f2fb', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 17, color: BRAND }}>photo_camera</span>
              </div>
              <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: '#111827' }}>Profile Assets</h3>
            </div>

            {/* COVER */}
            <div
              onClick={() => coverInputRef.current?.click()}
              onMouseEnter={() => setCoverHover(true)}
              onMouseLeave={() => setCoverHover(false)}
              style={{
                height: 180,
                borderRadius: 10,
                overflow: 'hidden',
                background: coverPreview ? 'transparent' : '#f0f0ef',
                border: coverHover && !coverPreview
                  ? `2px dashed ${BRAND}`
                  : '1px solid #e5e7eb',
                display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                cursor: 'pointer', position: 'relative',
                transition: 'border-color 0.2s',
              }}
            >
              {coverPreview ? (
                <img src={coverPreview} alt="Cover" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
              ) : (
                <>
                  <span className="material-symbols-outlined" style={{ fontSize: 34, color: coverHover ? BRAND : '#d1d5db', transition: 'color 0.2s' }}>add_photo_alternate</span>
                  <span style={{ marginTop: 6, fontSize: 13, fontWeight: 600, color: coverHover ? BRAND : '#9ca3af', transition: 'color 0.2s' }}>Click to upload cover photo</span>
                  <span style={{ fontSize: 11, color: '#d1d5db', marginTop: 2 }}>Recommended: 1584 × 396px</span>
                </>
              )}

              {/* ✅ Cover uploaded badge — shown when coverImage is set (not just preview) */}
              {coverImage && !coverUploading && (
                <div style={{
                  position: 'absolute', top: 10, right: 10,
                  background: 'rgba(22,163,74,0.9)',
                  borderRadius: 999, padding: '4px 10px',
                  display: 'flex', alignItems: 'center', gap: 5,
                  zIndex: 3,
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'white', fontVariationSettings: "'FILL' 1" }}>check_circle</span>
                  <span style={{ fontSize: 11, fontWeight: 700, color: 'white' }}>Uploaded</span>
                </div>
              )}

              {(coverHover || coverPreview) && (
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); coverInputRef.current?.click() }}
                  style={{
                    position: 'absolute', bottom: 10, right: 10,
                    background: 'rgba(0,0,0,0.52)', backdropFilter: 'blur(4px)',
                    color: 'white', border: 'none', borderRadius: 999,
                    padding: '5px 13px', fontSize: 11, fontWeight: 700,
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, zIndex: 2,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 13 }}>edit</span>
                  {coverPreview ? 'Change' : 'Upload'}
                </button>
              )}

              {coverUploading && (
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.82)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 8, zIndex: 4 }}>
                  <div style={{ width: 26, height: 26, borderRadius: '50%', border: `3px solid ${BRAND}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
                  <span style={{ fontSize: 12, fontWeight: 600, color: BRAND }}>Uploading cover…</span>
                </div>
              )}
            </div>

            {/* AVATAR ROW */}
            <div style={{ marginTop: -64, paddingLeft: 20, marginBottom: 16, position: 'relative', zIndex: 10 }}>
              <div style={{ position: 'relative', display: 'inline-block', width: 128, height: 128 }}>

                <div
                  onClick={() => profileInputRef.current?.click()}
                  onMouseEnter={() => setProfileHover(true)}
                  onMouseLeave={() => setProfileHover(false)}
                  style={{
                    width: 128, height: 128,
                    borderRadius: 14,
                    overflow: 'hidden',
                    background: imagePreview ? 'transparent' : '#e2e5e9',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    position: 'relative',
                    boxShadow: profileHover
                      ? '0 10px 30px rgba(0,0,0,0.3), 0 2px 8px rgba(0,0,0,0.15)'
                      : '0 6px 22px rgba(0,0,0,0.22), 0 1px 5px rgba(0,0,0,0.12)',
                    outline: profileHover && !imagePreview ? `2px dashed ${BRAND}` : '2px solid transparent',
                    outlineOffset: 3,
                    transition: 'box-shadow 0.2s, outline 0.2s',
                  }}
                >
                  {imagePreview ? (
                    <img src={imagePreview} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <span className="material-symbols-outlined" style={{ fontSize: 48, color: profileHover ? BRAND : '#adb5bd', transition: 'color 0.2s' }}>person</span>
                  )}

                  {imagePreview && profileHover && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.42)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 14 }}>
                      <span className="material-symbols-outlined" style={{ fontSize: 30, color: 'white' }}>edit</span>
                    </div>
                  )}

                  {profileUploading && (
                    <div style={{ position: 'absolute', inset: 0, background: 'rgba(255,255,255,0.85)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5, borderRadius: 14 }}>
                      <div style={{ width: 22, height: 22, borderRadius: '50%', border: `3px solid ${BRAND}`, borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: BRAND }}>Uploading…</span>
                    </div>
                  )}
                </div>

                {/* ✅ Profile uploaded tick — shown when profileImage is set and not uploading */}
                {profileImage && !profileUploading && (
                  <div style={{
                    position: 'absolute', top: -6, right: -6,
                    width: 22, height: 22, borderRadius: '50%',
                    background: GREEN,
                    border: '2px solid white',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    zIndex: 20,
                    boxShadow: '0 2px 6px rgba(22,163,74,0.5)',
                  }}>
                    <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'white', fontVariationSettings: "'FILL' 1" }}>check</span>
                  </div>
                )}

                {/* Camera badge */}
                <button
                  type="button"
                  onClick={() => profileInputRef.current?.click()}
                  style={{
                    position: 'absolute', bottom: -4, right: -8,
                    width: 30, height: 30, borderRadius: '50%',
                    background: BRAND, color: 'white',
                    border: '2.5px solid white', cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 2px 8px rgba(0,93,143,0.45)',
                    zIndex: 15,
                  }}
                >
                  <span className="material-symbols-outlined" style={{ fontSize: 15 }}>photo_camera</span>
                </button>
              </div>
            </div>

            {/* Asset descriptions */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              {[
                { icon: 'person', title: 'Profile Picture', desc: 'A professional headshot. High resolution recommended.', done: !!profileImage },
                { icon: 'image',  title: 'Cover Image',     desc: 'Background banner. Ideal: 1584 × 396px.',             done: !!coverImage  },
              ].map(item => (
                <div key={item.title} style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start',
                  background: item.done ? '#f0fdf4' : '#f9fafb',
                  border: `1px solid ${item.done ? '#bbf7d0' : '#f3f4f6'}`,
                  borderRadius: 10, padding: '10px 12px',
                  transition: 'all 0.3s ease',
                }}>
                  <span className="material-symbols-outlined" style={{ fontSize: 15, color: item.done ? GREEN : BRAND, marginTop: 1, flexShrink: 0, fontVariationSettings: item.done ? "'FILL' 1" : "'FILL' 0" }}>
                    {item.done ? 'check_circle' : item.icon}
                  </span>
                  <div>
                    <p style={{ margin: '0 0 2px', fontSize: 13, fontWeight: 700, color: item.done ? '#15803d' : '#111827' }}>{item.title}</p>
                    <p style={{ margin: 0, fontSize: 12, color: item.done ? '#16a34a' : '#6b7280', lineHeight: 1.55 }}>
                      {item.done ? 'Successfully uploaded' : item.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            {/* Hidden file inputs */}
            <input ref={coverInputRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp" onChange={handleCoverChange} style={{ display: 'none' }} />
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
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
              <div>
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>
                  Country
                </label>
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
                <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#6b7280', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 7 }}>
                  City
                </label>
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
                  background: BRAND2,
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
                    {loading ? 'Saving…' : coverUploading ? 'Uploading cover…' : 'Uploading photo…'}
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

        {/* ══ RIGHT PANEL — checklist only ════════════════════════ */}
        <aside style={{ width: 268, flexShrink: 0, position: 'sticky', top: 24 }}>
          <div style={{ background: 'white', borderRadius: 14, border: '1px solid #e5e7eb', padding: '16px 18px' }}>

            {/* Blue header bar */}
            <div style={{ background: BRAND2, borderRadius: 10, padding: '14px 16px', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                <div>
                  <p style={{ margin: 0, fontSize: 22, fontWeight: 900, color: 'white', lineHeight: 1 }}>
                    {pct}<span style={{ fontSize: 12, fontWeight: 600, opacity: 0.75 }}>%</span>
                  </p>
                  <p style={{ margin: '3px 0 0', fontSize: 11, color: 'rgba(255,255,255,0.65)' }}>
                    {1 + doneCount} of 5 complete
                  </p>
                </div>
                <span className="material-symbols-outlined" style={{ fontSize: 20, color: 'rgba(255,255,255,0.7)', fontVariationSettings: pct === 100 ? "'FILL' 1" : "'FILL' 0" }}>
                  {pct === 100 ? 'verified' : 'pending'}
                </span>
              </div>
              <div style={{ height: 5, background: 'rgba(255,255,255,0.2)', borderRadius: 999, overflow: 'hidden' }}>
                <div style={{
                  height: '100%', borderRadius: 999,
                  width: `${pct}%`,
                  background: pct === 100 ? '#4ade80' : 'white',
                  transition: 'width 0.5s ease',
                }} />
              </div>
            </div>

            {/* Step 0: Account created — always done */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1px solid #f3f4f6', marginBottom: 10 }}>
              <div style={{ width: 22, height: 22, borderRadius: '50%', flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', background: GREEN, boxShadow: '0 2px 6px rgba(22,163,74,0.35)' }}>
                <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'white', fontVariationSettings: "'FILL' 1" }}>check</span>
              </div>
              <div>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>Account created</span>
                <p style={{ margin: 0, fontSize: 10, color: '#94a3b8' }}>Registration complete</p>
              </div>
            </div>

            {checklist.map((item, i) => (
              <div key={item.label} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                paddingBottom: i < checklist.length - 1 ? 10 : 0,
                marginBottom: i < checklist.length - 1 ? 10 : 0,
                borderBottom: i < checklist.length - 1 ? '1px solid #f3f4f6' : 'none',
              }}>
                <div style={{
                  width: 22, height: 22, borderRadius: '50%', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: item.done ? GREEN : 'transparent',
                  border: `1.5px solid ${item.done ? GREEN : '#d1d5db'}`,
                  boxShadow: item.done ? '0 2px 6px rgba(22,163,74,0.35)' : 'none',
                  transition: 'all 0.25s ease',
                }}>
                  {item.done && (
                    <span className="material-symbols-outlined" style={{ fontSize: 13, color: 'white', fontVariationSettings: "'FILL' 1" }}>check</span>
                  )}
                </div>
                <div>
                  <span style={{ fontSize: 13, fontWeight: item.done ? 600 : 400, color: item.done ? '#111827' : '#9ca3af', transition: 'all 0.25s ease', display: 'block' }}>
                    {item.label}
                  </span>
                  {item.done && (
                    <p style={{ margin: 0, fontSize: 10, color: GREEN, fontWeight: 600 }}>Done</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </aside>

      </div>
    </div>
  )
}