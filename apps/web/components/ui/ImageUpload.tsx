'use client'

import { useEffect, useRef, useState } from 'react'
import toast from 'react-hot-toast'
import { uploadService } from '../../services/upload.service'

interface ImageUploadProps {
  value: string | null
  onChange: (url: string) => void
  shape?: 'circle' | 'square'
  size?: 'sm' | 'md' | 'lg'
  placeholder?: string
  showHelperText?: boolean
  showActionBadge?: boolean
  showHoverOverlay?: boolean
  outerClassName?: string
  imageClassName?: string
}

export default function ImageUpload({
  value,
  onChange,
  shape = 'circle',
  size = 'md',
  placeholder = '👤',
  showHelperText = true,
  showActionBadge = true,
  showHoverOverlay = true,
  outerClassName = '',
  imageClassName = '',
}: ImageUploadProps) {
  const [uploading, setUploading] = useState(false)
  const [preview, setPreview] = useState<string | null>(value)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setPreview(value)
  }, [value])

  useEffect(() => {
    return () => {
      if (preview?.startsWith('blob:')) {
        URL.revokeObjectURL(preview)
      }
    }
  }, [preview])

  const sizes = {
    sm: 'w-16 h-16',
    md: 'w-24 h-24',
    lg: 'w-32 h-32',
  }

  const radius = shape === 'circle' ? 'rounded-full' : 'rounded-2xl'

  const optimizeImage = async (file: File) => {
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

      const context = canvas.getContext('2d')
      if (!context) {
        throw new Error('Canvas is not supported')
      }

      context.imageSmoothingEnabled = true
      context.imageSmoothingQuality = 'high'
      context.drawImage(
        image,
        cropX,
        cropY,
        cropSize,
        cropSize,
        0,
        0,
        outputSize,
        outputSize
      )

      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (result) => {
            if (!result) {
              reject(new Error('Could not prepare image'))
              return
            }
            resolve(result)
          },
          'image/webp',
          0.92
        )
      })

      return {
        file: new File(
          [blob],
          `${file.name.replace(/\.[^.]+$/, '') || 'avatar'}.webp`,
          { type: 'image/webp' }
        ),
        previewUrl: URL.createObjectURL(blob),
      }
    } finally {
      URL.revokeObjectURL(sourceUrl)
    }
  }

  const handleChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      if (preview?.startsWith('blob:')) {
        URL.revokeObjectURL(preview)
      }

      const { file: optimizedFile, previewUrl } = await optimizeImage(file)
      setPreview(previewUrl)

      const serverUrl = await uploadService.uploadImage(optimizedFile)
      onChange(serverUrl)
      setPreview(serverUrl)
      toast.success('Image uploaded!')
    } catch {
      toast.error('Upload failed. Try again.')
      setPreview(value)
    } finally {
      setUploading(false)
      e.target.value = ''
    }
  }

  return (
    <div className={`flex flex-col items-center gap-2 ${outerClassName}`}>
      <div className="relative cursor-pointer group" onClick={() => inputRef.current?.click()}>
        <div className={`${sizes[size]} ${radius} overflow-hidden bg-[#c3e0fe] border-4 border-white shadow-md flex items-center justify-center shrink-0`}>
          {preview ? (
            <img
              src={preview}
              alt="Profile"
              className={`w-full h-full object-cover object-center ${imageClassName}`}
              draggable={false}
            />
          ) : (
            <span className="text-3xl">{placeholder}</span>
          )}

          {uploading && (
            <div className={`absolute inset-0 bg-black/40 flex items-center justify-center ${radius}`}>
              <div className="w-6 h-6 border-3 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          )}
        </div>

        {!uploading && showHoverOverlay && (
          <div className={`absolute inset-0 bg-black/30 ${radius} flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity`}>
            <span className="text-white text-2xl">📷</span>
          </div>
        )}

        {showActionBadge && (
          <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#005d8f] rounded-full flex items-center justify-center shadow-md border-2 border-white">
            <span className="text-white text-xs">+</span>
          </div>
        )}
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/jpg,image/png,image/webp"
        onChange={handleChange}
        className="hidden"
      />

      {showHelperText && (
        <p className="text-xs text-[#707881]">
          {uploading ? 'Uploading...' : 'Click to upload photo'}
        </p>
      )}
    </div>
  )
}
