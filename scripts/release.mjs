/**
 * 发版辅助脚本
 * 用法：npm run release -- patch   → 1.0.0 → 1.0.1
 *      npm run release -- minor   → 1.0.0 → 1.1.0
 *      npm run release -- major   → 1.0.0 → 2.0.0
 *      npm run release -- 1.2.3   → 直接指定版本号
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'

const __dirname = dirname(fileURLToPath(import.meta.url))
const pkgPath = resolve(__dirname, '../package.json')

const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'))
const current = pkg.version
const arg = process.argv[2] || 'patch'

function bumpVersion(version, type) {
  const [major, minor, patch] = version.split('.').map(Number)
  if (type === 'major') return `${major + 1}.0.0`
  if (type === 'minor') return `${major}.${minor + 1}.0`
  if (type === 'patch') return `${major}.${minor}.${patch + 1}`
  // 直接指定版本号
  if (/^\d+\.\d+\.\d+$/.test(type)) return type
  throw new Error(`无效的版本参数：${type}，请使用 patch / minor / major 或具体版本号`)
}

const next = bumpVersion(current, arg)
const tag = `v${next}`

console.log(`\n📦  ${current}  →  ${next}\n`)

// 更新 package.json
pkg.version = next
writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')

// Git 提交 + 打 tag + 推送
try {
  execSync('git add package.json', { stdio: 'inherit' })
  execSync(`git commit -m "chore: release ${tag}"`, { stdio: 'inherit' })
  execSync(`git tag ${tag}`, { stdio: 'inherit' })
  execSync('git push', { stdio: 'inherit' })
  execSync(`git push origin ${tag}`, { stdio: 'inherit' })
  console.log(`\n✅  已推送 ${tag}，GitHub Actions 开始自动构建...\n`)
  console.log(`   查看进度：https://github.com/${getRemoteOwnerRepo()}/actions\n`)
} catch (e) {
  console.error('\n❌  操作失败，请检查 git 状态后重试\n')
  process.exit(1)
}

function getRemoteOwnerRepo() {
  try {
    const remote = execSync('git remote get-url origin', { encoding: 'utf8' }).trim()
    const match = remote.match(/[:/]([^/]+\/[^/]+?)(?:\.git)?$/)
    return match ? match[1] : 'your-org/your-repo'
  } catch {
    return 'your-org/your-repo'
  }
}
