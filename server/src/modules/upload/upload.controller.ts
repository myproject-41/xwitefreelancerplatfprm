import { Request, Response } from 'express'
import { isCloudinaryConfigured, uploadToCloudinary } from '../../config/cloudinary'

export class UploadController {
  async uploadImage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' })
        return
      }

      let url: string
      let filename: string

      if (isCloudinaryConfigured() && req.file.buffer) {
        const result = await uploadToCloudinary(req.file.buffer, req.file.originalname, 'xwite/images')
        url = result.url
        filename = result.publicId
      } else {
        filename = req.file.filename ?? req.file.originalname
        const proto = req.headers['x-forwarded-proto']
        const protocol = (Array.isArray(proto) ? proto[0] : proto?.split(',')[0].trim()) || req.protocol
        const host = (req.headers['x-forwarded-host'] as string | undefined)?.split(',')[0].trim()
          || req.get('host')
          || 'localhost:4000'
        const baseUrl = process.env.BASE_URL || `${protocol}://${host}`
        url = `${baseUrl}/uploads/${filename}`
      }

      res.json({ success: true, data: { url, filename } })
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message })
    }
  }
}

export const uploadController = new UploadController()
