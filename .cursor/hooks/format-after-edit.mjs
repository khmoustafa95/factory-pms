import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const FORMATTABLE = new Set([
  '.ts',
  '.tsx',
  '.js',
  '.jsx',
  '.mjs',
  '.cjs',
  '.json',
  '.css',
  '.md',
  '.mdc',
  '.html',
  '.yml',
  '.yaml',
])

async function readStdin() {
  const chunks = []
  for await (const chunk of process.stdin) {
    chunks.push(chunk)
  }
  return Buffer.concat(chunks).toString('utf8')
}

function resolvePrettierBin(projectRoot) {
  const binName = process.platform === 'win32' ? 'prettier.cmd' : 'prettier'
  return path.join(projectRoot, 'node_modules', '.bin', binName)
}

try {
  const raw = await readStdin()
  const payload = raw ? JSON.parse(raw) : {}
  const filePath = payload.file_path

  if (!filePath || !existsSync(filePath)) {
    process.exit(0)
  }

  const ext = path.extname(filePath).toLowerCase()
  if (!FORMATTABLE.has(ext)) {
    process.exit(0)
  }

  const projectRoot = path.resolve(
    path.dirname(fileURLToPath(import.meta.url)),
    '..',
    '..',
  )
  const prettierBin = resolvePrettierBin(projectRoot)

  if (
    !existsSync(prettierBin) &&
    !existsSync(prettierBin.replace(/\.cmd$/i, ''))
  ) {
    process.exit(0)
  }

  spawnSync(prettierBin, ['--write', '--ignore-unknown', filePath], {
    cwd: projectRoot,
    stdio: 'ignore',
    shell: process.platform === 'win32',
  })
} catch {
  // Fail open: never block the agent on formatter issues.
}

process.exit(0)
