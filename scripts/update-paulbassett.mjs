#!/usr/bin/env node
// 폴바셋(Paul Bassett) 캡슐/패키지 업데이트 스크립트
//
// 네이버 브랜드스토어(scripts/paulbassett-fetch.sh)로 캡슐커피 카테고리를 가져와
//   src/data/capsules/paulbassett.json (단품)  — id 6000번대
//   src/data/packages/paulbassett.json (패키지) — id 7000번대
// 를 최신화한다. 폴바셋은 전부 네스프레소 오리지널 호환(compat: original).
//
// 폴바셋 API 한계: 이름·가격·이미지·구매URL만 제공. 강도(intensity)·향미(aromatics)는 없다.
//   → 신규 단품은 강도 0(미정)·향미 빈값·영문명 자동 생성으로 추가하고 [보완 필요]로 플래그.
//     실제 강도·향미·영문명·산미/바디/쓴맛은 사람이 채운다. 기존 큐레이션 값은 보존.
//
// 상품 분류(이름: "폴바셋 네스프레소 호환 캡슐커피 {맛}, 10개입, {N}개"):
//   - 단품:   특정 맛 + 1개입           → 캡슐(개당가 = 가격/10)
//   - 패키지: "N종 혼합"                  → 세트(구성 = 단품 전체, 수량 = 총캡슐/종수)
//   - 제외:   특정 맛 + 2개 이상(벌크)   → 같은 맛 묶음이라 모델링 안 함
//
// 사용:  node scripts/update-paulbassett.mjs [--dry-run]
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CAPS = resolve(ROOT, 'src/data/capsules/paulbassett.json')
const PKGS = resolve(ROOT, 'src/data/packages/paulbassett.json')
const FETCH = resolve(ROOT, 'scripts/paulbassett-fetch.sh')
const DRY = process.argv.includes('--dry-run')

const norm = s => s.replace(/\s+/g, ' ').trim()
const readJson = (p) => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return [] } }

// 맛(한글) → 영문명
const EN = {
  '시그니처 블렌드': 'Signature Blend',
  '브라질 싱글오리진': 'Brazil Single Origin',
  '콜롬비아 싱글오리진': 'Colombia Single Origin',
  '에티오피아 싱글오리진': 'Ethiopia Single Origin',
  '과테말라 싱글오리진': 'Guatemala Single Origin',
}
const buyUrl = id => `https://brand.naver.com/baristapaulbassett/products/${id}`
const imgOf = p => p.representativeImageUrl || p.productImageUrl || null
const priceOf = p => p.benefitsView?.discountedSalePrice || p.salePrice || 0

// ── API 조회 (페이지네이션. pageSize는 80 이하만 유효) ──
const SIZE = 40
const fetchPage = pg => JSON.parse(execFileSync('bash', [FETCH, String(pg), 'POPULAR', String(SIZE)], { maxBuffer: 32 * 1024 * 1024 }))
const first = fetchPage(1)
const total = first.totalCount ?? (first.simpleProducts?.length ?? 0)
const products = [...(first.simpleProducts || [])]
for (let pg = 2, pages = Math.ceil(total / SIZE); pg <= pages; pg++) products.push(...(fetchPage(pg).simpleProducts || []))
if (products.length === 0) { console.error('⚠️ 상품 0개 — 조회 실패 의심(429 또는 pageSize 초과). 중단.'); process.exit(1) }

// 이름 파싱: 맛, 개입수(고정 10), 개수
const parse = name => {
  const m = norm(name).match(/캡슐커피\s*(.+?),\s*10개입,\s*(\d+)\s*개/)
  if (!m) return null
  return { flavor: m[1].trim(), sleeves: +m[2] }
}

// 단품/패키지 분류
const apiSingles = new Map() // flavor -> {..}
const apiPacks = []          // {..}
for (const p of products) {
  const info = parse(p.name)
  if (!info) continue
  const { flavor, sleeves } = info
  if (/혼합|종/.test(flavor)) {
    const kinds = (flavor.match(/(\d+)\s*종/) || [])[1]
    apiPacks.push({ flavor, kinds: kinds ? +kinds : null, totalCaps: sleeves * 10, price: priceOf(p), image: imgOf(p), buyUrl: buyUrl(p.id) })
  } else if (sleeves === 1) {
    if (!apiSingles.has(flavor)) apiSingles.set(flavor, { flavor, price: Math.round(priceOf(p) / 10), image: imgOf(p), buyUrl: buyUrl(p.id) })
  }
  // 특정 맛 + 2개 이상(벌크)은 제외
}

// ── 단품 diff ──
const capsules = readJson(CAPS)
const existingCap = new Map(capsules.filter(c => c.brand === '폴바셋').map(c => [norm(c.nameKo), c]))
const added = [], disabled = [], priceChanged = [], needReview = []
let maxId = capsules.reduce((m, c) => Math.max(m, c.id), 6000)

for (const [flavor, a] of apiSingles) {
  const cur = existingCap.get(flavor)
  if (!cur) {
    const cap = {
      id: ++maxId, brand: '폴바셋', name: EN[flavor] || flavor, nameKo: flavor,
      intensity: 0, acidity: 3, body: 3, bitterness: 3,
      notes: [], caffeine: 'regular', compat: ['original'],
      price: a.price, buyUrl: a.buyUrl,
      ...(a.image ? { image: a.image } : {}),
      desc: `폴바셋 네스프레소 호환 ${flavor}.`,
    }
    capsules.push(cap)
    added.push(cap)
    needReview.push(`#${cap.id} ${cap.nameKo} — 강도(0)·향미·영문명(${cap.name}) 보완 필요`)
  } else {
    if (cur.isEnabled === false) { delete cur.isEnabled; priceChanged.push(`${cur.nameKo} (재전시)`) }
    if (a.price !== cur.price) { priceChanged.push(`${cur.nameKo}: ${cur.price}→${a.price}`); cur.price = a.price }
    if (a.buyUrl !== cur.buyUrl) cur.buyUrl = a.buyUrl
    if (a.image && a.image !== cur.image) cur.image = a.image
  }
}
for (const [flavor, c] of existingCap) {
  if (!apiSingles.has(flavor) && c.isEnabled !== false) { c.isEnabled = false; disabled.push(c.nameKo) }
}

// 단품 맛 → id (신규 포함, 단종 제외). 패키지 구성에 사용.
const idByFlavor = new Map(capsules.filter(c => c.brand === '폴바셋' && c.isEnabled !== false).map(c => [norm(c.nameKo), c.id]))
const singleIds = [...idByFlavor.values()]

// ── 패키지 diff ── (N종 혼합 = 단품 전체 구성, 수량 = 총캡슐/종수)
const packages = readJson(PKGS)
const canonItems = arr => JSON.stringify([...arr].sort((x, y) => x.id - y.id))
const existingPkg = new Map(packages.map(p => [norm(p.nameKo), p]))
const pkgAdded = [], pkgDisabled = [], pkgUpdated = []
let maxPkgId = packages.reduce((m, p) => Math.max(m, p.id), 7000)

const apiPkgByKo = new Map()
for (const a of apiPacks) {
  const nameKo = `${a.flavor} · ${a.totalCaps}캡슐`
  const kinds = a.kinds || singleIds.length
  const qty = kinds ? Math.round(a.totalCaps / kinds) : 0
  const items = singleIds.map(id => ({ id, qty }))
  if (a.kinds && a.kinds !== singleIds.length) console.warn(`  ⚠️ 종수(${a.kinds}) ≠ 단품 수(${singleIds.length}): ${a.flavor}`)
  apiPkgByKo.set(nameKo, { nameKo, name: `Variety Pack (${a.kinds || singleIds.length} kinds, ${a.totalCaps})`, price: a.price, image: a.image, buyUrl: a.buyUrl, items })
}

for (const [nameKo, a] of apiPkgByKo) {
  const cur = existingPkg.get(nameKo)
  if (!cur) {
    const pkg = {
      id: ++maxPkgId, brand: '폴바셋', name: a.name, nameKo,
      compat: ['original'], price: a.price,
      ...(a.image ? { image: a.image } : {}),
      ...(a.buyUrl ? { buyUrl: a.buyUrl } : {}),
      items: a.items,
    }
    packages.push(pkg)
    pkgAdded.push(pkg)
  } else {
    if (cur.isEnabled === false) { delete cur.isEnabled; pkgUpdated.push(`${cur.nameKo} (재전시)`) }
    if (a.price != null && a.price !== cur.price) { pkgUpdated.push(`${cur.nameKo}: ${cur.price}→${a.price}`); cur.price = a.price }
    if (a.buyUrl && a.buyUrl !== cur.buyUrl) cur.buyUrl = a.buyUrl
    if (a.image && a.image !== cur.image) cur.image = a.image
    if (canonItems(cur.items) !== canonItems(a.items)) { cur.items = a.items; pkgUpdated.push(`${cur.nameKo} (구성 변경)`) }
  }
}
for (const [nameKo, p] of existingPkg) {
  if (!apiPkgByKo.has(nameKo) && p.isEnabled !== false) { p.isEnabled = false; pkgDisabled.push(p.nameKo) }
}

// ── 리포트 ──
const line = '─'.repeat(48)
console.log(line + `\n폴바셋 업데이트 ${DRY ? '(DRY-RUN)' : ''}\n` + line)
console.log(`API 단품: ${apiSingles.size} | 기존: ${existingCap.size}`)
console.log(`\n[신규 단품] ${added.length}종`); added.forEach(c => console.log(`  + #${c.id} ${c.nameKo} (${c.price}원/캡슐)`))
console.log(`\n[단품 단종] ${disabled.length}종`); disabled.forEach(n => console.log(`  - ${n}`))
console.log(`\n[가격/재전시] ${priceChanged.length}건`); priceChanged.forEach(n => console.log(`  ~ ${n}`))
console.log(`\n⚠️ [보완 필요] ${needReview.length}종`); needReview.forEach(n => console.log(`  ! ${n}`))
console.log(`\n[신규 패키지] ${pkgAdded.length}종`); pkgAdded.forEach(p => console.log(`  + #${p.id} ${p.nameKo} (구성 ${p.items.length}종, ${p.price}원) [영문명 검토: ${p.name}]`))
console.log(`\n[패키지 단종] ${pkgDisabled.length}종`); pkgDisabled.forEach(n => console.log(`  - ${n}`))
console.log(`\n[패키지 변경] ${pkgUpdated.length}건`); pkgUpdated.forEach(n => console.log(`  ~ ${n}`))
console.log(line)

const capChanged = added.length || disabled.length || priceChanged.length
const pkgChanged = pkgAdded.length || pkgDisabled.length || pkgUpdated.length
if (DRY) console.log('DRY-RUN: 파일 미수정.')
else if (capChanged || pkgChanged) {
  writeFileSync(CAPS, JSON.stringify(capsules, null, 2) + '\n')
  writeFileSync(PKGS, JSON.stringify(packages, null, 2) + '\n')
  console.log('capsules/paulbassett.json / packages/paulbassett.json 갱신 완료.')
} else console.log('변경 없음.')
