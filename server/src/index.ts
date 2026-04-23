// Allow opting into insecure TLS only for local troubleshooting.
if (
  process.env.NODE_ENV !== 'production' &&
  process.env.ALLOW_INSECURE_TLS === 'true'
) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0'
}

import http from 'http'
import app from './app'
import { env } from './config/env'
import { prisma } from './config/db'
import { logger } from './config/logger'
import { initSocket } from './modules/chat/socket'
import { runDbSetup } from './config/dbSetup'

let shuttingDown = false

async function shutdown(server: http.Server, signal: string) {
  if (shuttingDown) return
  shuttingDown = true

  logger.warn(`Received ${signal}. Starting graceful shutdown...`)

  server.close(async (closeError) => {
    if (closeError) {
      logger.error(`HTTP server close error: ${String(closeError)}`)
    }

    try {
      await prisma.$disconnect()
      logger.info('Database disconnected')
    } catch (disconnectError) {
      logger.error(`Prisma disconnect error: ${String(disconnectError)}`)
    } finally {
      process.exit(closeError ? 1 : 0)
    }
  })

  setTimeout(() => {
    logger.error('Forced shutdown after timeout')
    process.exit(1)
  }, 10000).unref()
}

const start = async () => {
  try {
    await prisma.$queryRaw`SELECT 1`
    logger.info('Database connected')

    await runDbSetup()

    const server = http.createServer(app)
    initSocket(server)

    server.listen(env.PORT, () => {
      logger.info(`Server running on http://localhost:${env.PORT}`)
      logger.info(`Environment: ${env.NODE_ENV}`)
    })

    process.on('SIGINT', () => {
      void shutdown(server, 'SIGINT')
    })

    process.on('SIGTERM', () => {
      void shutdown(server, 'SIGTERM')
    })

    process.on('unhandledRejection', (reason) => {
      logger.error(`Unhandled promise rejection: ${String(reason)}`)
    })

    process.on('uncaughtException', (error) => {
      logger.error(`Uncaught exception: ${error.stack || error.message}`)
      void shutdown(server, 'uncaughtException')
    })
  } catch (error) {
    logger.error(`Failed to start server: ${String(error)}`)
    process.exit(1)
  }
}

void start()
