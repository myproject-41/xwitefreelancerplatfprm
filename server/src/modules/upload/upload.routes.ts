import { Router, Request, Response } from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { authenticate } from '../../middlewares/auth.middleware'
import { uploadController } from './upload.controller'
import { isCloudinaryConfigured } from '../../config/cloudinary'

// Disk storage (used when Cloudinary is not configured)
const uploadDir = path.join(process.cwd(), 'uploads')
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true })
}

const diskStorage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const unique = `${Date.now()}-${Math.round(Math.random() * 1e9)}`
    const ext = path.extname(file.originalname).toLowerCase()
    cb(null, `${unique}${ext}`)
  },
})

const imageFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (allowed.includes(file.mimetype)) cb(null, true)
  else cb(new Error('Only JPG, PNG and WebP images are allowed'))
}

const fileFilter = (_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowed = [
    'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
    'application/pdf',
    'application/zip', 'application/x-zip-compressed',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain', 'text/csv',
    'application/octet-stream',
  ]
  if (allowed.includes(file.mimetype)) cb(null, true)
  else cb(new Error('File type not supported'))
}

// Use memory storage for Cloudinary, disk storage for local
const storage = isCloudinaryConfigured() ? multer.memoryStorage() : diskStorage

const uploadImage = multer({ storage, fileFilter: imageFilter, limits: { fileSize: 5 * 1024 * 1024 } })
const uploadFile  = multer({ storage, fileFilter, limits: { fileSize: 50 * 1024 * 1024 } })

const router: Router = Router()

router.post(
  '/image',
  authenticate,
  uploadImage.single('image'),
  (req: Request, res: Response) => uploadController.uploadImage(req, res),
)

router.post(
  '/file',
  authenticate,
  uploadFile.single('file'),
  (req: Request, res: Response) => uploadController.uploadImage(req, res),
)

export default router
