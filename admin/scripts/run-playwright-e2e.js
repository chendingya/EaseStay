import net from 'node:net'
import { spawn } from 'node:child_process'

const host = '127.0.0.1'
const timeoutMs = 60_000
const viteEntry = './node_modules/vite/bin/vite.js'
const playwrightCliEntry = './node_modules/@playwright/test/cli.js'

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

const findFreePort = () =>
  new Promise((resolve, reject) => {
    const server = net.createServer()
    server.unref()
    server.on('error', reject)
    server.listen(0, host, () => {
      const address = server.address()
      if (!address || typeof address === 'string') {
        server.close(() => reject(new Error('Failed to resolve a free port.')))
        return
      }
      const { port } = address
      server.close((err) => {
        if (err) reject(err)
        else resolve(port)
      })
    })
  })

const waitForPort = async (port, timeout = timeoutMs) => {
  const start = Date.now()
  while (Date.now() - start < timeout) {
    const ok = await new Promise((resolve) => {
      const socket = net.createConnection({ host, port })
      socket.once('connect', () => {
        socket.destroy()
        resolve(true)
      })
      socket.once('error', () => resolve(false))
      socket.once('timeout', () => {
        socket.destroy()
        resolve(false)
      })
      socket.setTimeout(1200)
    })
    if (ok) return
    await delay(200)
  }
  throw new Error(`Timed out waiting for Vite on ${host}:${port}`)
}

const main = async () => {
  const extraArgs = process.argv.slice(2)
  const port = Number(process.env.PLAYWRIGHT_PORT) || (await findFreePort())
  const baseURL = `http://${host}:${port}`

  const vite = spawn(
    'node',
    [viteEntry, '--host', host, '--port', String(port)],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        NO_PROXY: 'localhost,127.0.0.1',
        no_proxy: 'localhost,127.0.0.1'
      }
    }
  )

  let shuttingDown = false
  const stopVite = () => {
    if (shuttingDown) return
    shuttingDown = true
    if (!vite.killed) vite.kill('SIGTERM')
  }

  process.on('SIGINT', () => {
    stopVite()
    process.exit(130)
  })
  process.on('SIGTERM', () => {
    stopVite()
    process.exit(143)
  })

  vite.once('exit', (code) => {
    if (!shuttingDown) {
      console.error(`[e2e] Vite exited unexpectedly with code ${code ?? 'unknown'}.`)
      process.exit(code ?? 1)
    }
  })

  try {
    await waitForPort(port)
  } catch (error) {
    stopVite()
    throw error
  }

  const playwright = spawn(
    'node',
    [playwrightCliEntry, 'test', ...extraArgs],
    {
      stdio: 'inherit',
      env: {
        ...process.env,
        PLAYWRIGHT_PORT: String(port),
        PLAYWRIGHT_BASE_URL: baseURL,
        NO_PROXY: 'localhost,127.0.0.1',
        no_proxy: 'localhost,127.0.0.1'
      }
    }
  )

  playwright.once('exit', (code) => {
    stopVite()
    process.exit(code ?? 1)
  })
}

main().catch((error) => {
  console.error(`[e2e] ${error?.message || error}`)
  process.exit(1)
})
