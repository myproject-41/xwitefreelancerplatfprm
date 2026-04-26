import express, { Application, Request, Response } from 'express'
import cors from 'cors'
import helmet from 'helmet'
import path from 'path'
import { errorMiddleware } from './middlewares/error.middleware'
import { generalApiLimiter, uploadLimiter } from './middlewares/rateLimiter'
import authRoutes from './modules/auth/auth.routes'
import userRoutes from './modules/user/user.routes'
import postRoutes from './modules/post/post.routes'
import walletRoutes from './modules/wallet/wallet.routes'
import networkRoutes from './modules/network/network.routes'
import notificationRoutes from './modules/notification/notification.routes'
import chatRoutes from './modules/chat/chat.routes'
import uploadRoutes from './modules/upload/upload.routes'
import escrowRoutes from './modules/escrow/escrow.routes'

const app: Application = express()
app.set('trust proxy', 1)
app.disable('x-powered-by')

const allowedOrigins = [
  process.env.FRONTEND_URL,
  process.env.FRONTEND_URL_2,
  'http://localhost:3000',
  'http://127.0.0.1:3000',
  'https://project-5jorl.vercel.app',
  'https://project-5jorl-git-main-myproject-41s-projects.vercel.app',
].filter(Boolean)

app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) { callback(null, true); return }
    if (allowedOrigins.includes(origin as string)) { callback(null, true); return }
    // Allow any Vercel deployment (*.vercel.app) — JWT auth secures the data
    if (/^https:\/\/[a-z0-9][a-z0-9-]*\.vercel\.app$/.test(origin)) { callback(null, true); return }
    callback(new Error('Not allowed by CORS'))
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}))

app.use(express.json({
  limit: '10mb',
  verify: (req, _res, buf) => {
    const r = req as import('express').Request & { rawBody?: string }
    if (r.originalUrl === '/api/wallet/webhook') {
      r.rawBody = buf.toString('utf8')
    }
  },
}))
app.use(express.urlencoded({ extended: true, limit: '10mb' }))

// Serve uploads folder as static
const uploadsPath = path.join(process.cwd(), 'uploads')
app.use('/uploads', express.static(uploadsPath))

app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.round(process.uptime()),
    environment: process.env.NODE_ENV || 'development',
  })
})

app.use('/api', generalApiLimiter)
app.use('/api/auth', authRoutes)
app.use('/api/users', userRoutes)
app.use('/api/posts', postRoutes)
app.use('/api/wallet', walletRoutes)
app.use('/api/network', networkRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/chat', chatRoutes)
app.use('/api/upload', uploadLimiter, uploadRoutes)
app.use('/api/escrow', escrowRoutes)

app.use(errorMiddleware)

export default app
