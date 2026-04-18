import http from 'http'
import app from './app'
import { env } from './config/env'
import { prisma } from './config/db'
import { logger } from './config/logger'
import { initSocket } from './modules/chat/socket'

const start = async () => {
  try {
    // Test DB connection with an actual query
    await prisma.$queryRaw`SELECT 1`
    logger.info('Database connected')

    const server = http.createServer(app)
    initSocket(server)

    server.listen(env.PORT, () => {
      logger.info(`Server running on http://localhost:${env.PORT}`)
      logger.info(`Environment: ${env.NODE_ENV}`)
    })
  } catch (error) {
    logger.error('Failed to start server:', error)
    process.exit(1)
  }
}

start()
