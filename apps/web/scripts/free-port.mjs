import { execSync } from 'node:child_process'

const port = 3000

function getPidsOnWindows(targetPort) {
  try {
    const output = execSync(`netstat -ano -p tcp | findstr :${targetPort}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })

    return [...new Set(
      output
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .filter((line) => line.includes('LISTENING'))
        .map((line) => {
          const parts = line.split(/\s+/)
          return Number.parseInt(parts.at(-1) || '', 10)
        })
        .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid)
    )]
  } catch {
    return []
  }
}

function getPidsOnUnix(targetPort) {
  try {
    const output = execSync(`lsof -ti tcp:${targetPort}`, {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    })

    return [...new Set(
      output
        .split(/\r?\n/)
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter((pid) => Number.isInteger(pid) && pid > 0 && pid !== process.pid)
    )]
  } catch {
    return []
  }
}

function killPid(pid) {
  if (process.platform === 'win32') {
    execSync(`taskkill /PID ${pid} /F`, { stdio: 'ignore' })
    return
  }

  process.kill(pid, 'SIGTERM')
}

const pids = process.platform === 'win32'
  ? getPidsOnWindows(port)
  : getPidsOnUnix(port)

if (pids.length === 0) {
  console.log(`[dev] Port ${port} is free`)
  process.exit(0)
}

for (const pid of pids) {
  try {
    killPid(pid)
    console.log(`[dev] Freed port ${port} by stopping PID ${pid}`)
  } catch (error) {
    console.error(`[dev] Failed to free port ${port} from PID ${pid}`)
    throw error
  }
}
