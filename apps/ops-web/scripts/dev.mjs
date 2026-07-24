import { spawn } from 'node:child_process'
import { createRequire } from 'node:module'
import { createServer } from 'node:net'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appRoot = join(__dirname, '..')
const require = createRequire(join(appRoot, 'package.json'))

const PREFERRED = 3001
const RANGE = 30

/**
 * @param {number} port
 * @returns {Promise<boolean>}
 */
function portIsFree(port) {
  return new Promise((resolve) => {
    const s = createServer()
    s.unref()
    s.once('error', () => resolve(false))
    s.listen(port, () => {
      s.close(() => resolve(true))
    })
  })
}

/**
 * @returns {Promise<number>}
 */
async function resolvePort() {
  const raw = process.env.PORT
  if (raw !== undefined && raw !== '') {
    const p = Number.parseInt(raw, 10)
    if (Number.isNaN(p) || p < 1 || p > 65535) {
      console.error(`[ops] Invalid PORT: ${raw}`)
      process.exit(1)
    }
    if (!(await portIsFree(p))) {
      console.error(
        `[ops] PORT ${p} is already in use. Stop the other process or set PORT to a free port.`,
      )
      process.exit(1)
    }
    return p
  }
  for (let p = PREFERRED; p < PREFERRED + RANGE; p += 1) {
    if (await portIsFree(p)) {
      if (p !== PREFERRED) {
        console.warn(
          `[ops] Port ${PREFERRED} is in use; using ${p} (set PORT to pick a port explicitly)`,
        )
      }
      return p
    }
  }
  console.error(
    `[ops] No free port in range ${PREFERRED}..${PREFERRED + RANGE - 1}. Set PORT to continue.`,
  )
  process.exit(1)
}

const port = await resolvePort()
const nextBin = require.resolve('next/dist/bin/next')
const child = spawn(process.execPath, [nextBin, 'dev', '-p', String(port)], {
  cwd: appRoot,
  stdio: 'inherit',
  env: { ...process.env, PORT: String(port) },
})

child.on('error', (err) => {
  console.error('[ops] Failed to start Next.js:', err)
  process.exit(1)
})
child.on('exit', (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal)
  }
  process.exit(code ?? 0)
})
