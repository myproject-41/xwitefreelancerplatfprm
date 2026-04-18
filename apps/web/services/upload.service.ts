import apiClient from './apiClient'

export const uploadService = {
  async uploadImage(file: File): Promise<string> {
    const formData = new FormData()
    formData.append('image', file)
    const res = await apiClient.post('/api/upload/image', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    return res.data.data.url
  },

  async uploadFile(file: File, onProgress?: (pct: number) => void): Promise<{ url: string; filename: string; originalName: string }> {
    const formData = new FormData()
    formData.append('file', file)
    const res = await apiClient.post('/api/upload/file', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded * 100) / e.total))
      },
    })
    return { url: res.data.data.url, filename: res.data.data.filename, originalName: file.name }
  },
}