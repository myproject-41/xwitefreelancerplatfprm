import { Request, Response } from 'express'

export class UploadController {
  async uploadImage(req: Request, res: Response): Promise<void> {
    try {
      if (!req.file) {
        res.status(400).json({ success: false, message: 'No file uploaded' })
        return
      }

      const filename = req.file.filename
      const protocol = req.headers['x-forwarded-proto']?.toString() || req.protocol
      const host = req.get('host') || 'localhost:4000'
      const baseUrl = `${protocol}://${host}`
      const url = `${baseUrl}/uploads/${filename}`

      res.json({
        success: true,
        data: { url, filename },
      })
    } catch (error: any) {
      res.status(500).json({ success: false, message: error.message })
    }
  }
}

export const uploadController = new UploadController()
