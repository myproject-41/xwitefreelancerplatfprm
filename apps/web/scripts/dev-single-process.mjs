import fs from 'node:fs'
import process from 'node:process'

const originalRealpathSync = fs.realpathSync

function passthroughRealpath(path) {
  return path
}

fs.realpathSync = passthroughRealpath
fs.realpathSync.native = passthroughRealpath

process.env.NODE_ENV = process.env.NODE_ENV || 'development'

const { startServer } = await import('../node_modules/next/dist/server/lib/start-server.js')

const port = Number(process.env.PORT || 3000)
const hostname = process.env.HOST || '127.0.0.1'

try {
  await startServer({
    dir: process.cwd(),
    isDev: true,
    hostname,
    port,
    allowRetry: true,
    minimalMode: false,
  })
} catch (error) {
  fs.realpathSync = originalRealpathSync
  throw error
}
