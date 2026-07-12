#!/usr/bin/env node
// 폴바셋(Paul Bassett) 캡슐/패키지 업데이트 스크립트 (네스프레소 오리지널 호환 + 돌체구스토 호환)
//
// 네이버 브랜드스토어(scripts/paulbassett-fetch.sh)로 두 라인을 가져와
//   src/data/capsules/paulbassett.json (단품)  — id 6000번대
//   src/data/packages/paulbassett.json (패키지) — id 7000번대
// 를 최신화한다.
//
// 라인: nespresso(compat original, 10개입) / dolcegusto(compat dolcegusto, 12개입·룽고)
//
// API 한계: 이름·가격·이미지·구매URL만 제공. 강도(intensity)·향미(aromatics) 없음.
//   → 신규 단품은 강도 0·향미 빈값·영문명 자동으로 추가하고 [보완 필요]로 플래그.
//     실제 강도·향미·영문명·산미/바디/쓴맛은 공식 제품 이미지로 사람이 채운다(기존 큐레이션 값은 보존).
//     수치가 없으면 향미 기반 근사치로 추정하고 desc 끝에 추정 안내를 붙인다(SKILL.md 참고).
//
// 상품 분류(이름: "폴바셋 {라인} 호환 캡슐커피 {맛}, {개입}개입, {N}개"):
//   - 단품:   특정 맛 + 1개              → 캡슐(개당가 = 가격/개입)
//   - 패키지: "N종 혼합"                 → 세트. 구성은 명시 표기 "(시그2,브라질2,과테1)"가 있으면
//                                          그대로, 없으면 라인 단품 균등 분할.
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
const SIZE = 40

const norm = s => s.replace(/\s+/g, ' ').trim()
const readJson = p => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return [] } }

// 라인: fetch 별칭 → compat
const LINES = [
  { cat: 'nespresso', compat: 'original' },
  { cat: 'dolcegusto', compat: 'dolcegusto' },
]
// 맛(한글) → 영문명
const EN = {
  '시그니처 블렌드': 'Signature Blend',
  '브라질 싱글오리진': 'Brazil Single Origin',
  '콜롬비아 싱글오리진': 'Colombia Single Origin',
  '에티오피아 싱글오리진': 'Ethiopia Single Origin',
  '과테말라 싱글오리진': 'Guatemala Single Origin',
  '시그니처 블렌드 룽고': 'Signature Blend Lungo',
  '브라질 싱글오리진 룽고': 'Brazil Single Origin Lungo',
  '과테말라 싱글오리진 룽고': 'Guatemala Single Origin Lungo',
}
const buyUrl = id => `https://brand.naver.com/baristapaulbassett/products/${id}`
const imgOf = p => p.representativeImageUrl || p.productImageUrl || null
const priceOf = p => p.benefitsView?.discountedSalePrice || p.salePrice || 0
// 이름 파싱: 맛 / 개입 / 개수
const parse = name => {
  const m = norm(name).match(/캡슐커피\s*(.+?),\s*(\d+)개입,\s*(\d+)\s*개/)
  return m ? { flavor: m[1].trim(), per: +m[2], sleeves: +m[3] } : null
}

// ── API 조회: 라인별 단품/패키지 수집 ──
const apiSingles = new Map()  // "compat|flavor" -> {..}
const apiPacks = []           // {compat, flavor, per, kinds, totalCaps, price, image, buyUrl}
for (const { cat, compat } of LINES) {
  const fetchPage = pg => JSON.parse(execFileSync('bash', [FETCH, cat, String(pg), 'POPULAR', String(SIZE)], { maxBuffer: 32 * 1024 * 1024 }))
  const first = fetchPage(1)
  const total = first.totalCount ?? (first.simpleProducts?.length ?? 0)
  const items = [...(first.simpleProducts || [])]
  for (let pg = 2, pages = Math.ceil(total / SIZE); pg <= pages; pg++) items.push(...(fetchPage(pg).simpleProducts || []))
  if (items.length === 0) { console.error(`⚠️ ${cat} 상품 0개 — 조회 실패 의심(429/pageSize). 중단.`); process.exit(1) }

  for (const p of items) {
    const info = parse(p.name)
    if (!info) continue
    const { flavor, per, sleeves } = info
    if (/혼합|종/.test(flavor)) {
      apiPacks.push({ compat, flavor, per, kinds: (flavor.match(/(\d+)\s*종/) || [])[1] * 1 || null, totalCaps: sleeves * per, price: priceOf(p), image: imgOf(p), buyUrl: buyUrl(p.id) })
    } else if (sleeves === 1) {
      const key = compat + '|' + flavor
      if (!apiSingles.has(key)) apiSingles.set(key, { compat, flavor, price: Math.round(priceOf(p) / per), image: imgOf(p), buyUrl: buyUrl(p.id) })
    }
    // 특정 맛 + 2개 이상(벌크)은 제외
  }
}

// ── 단품 diff ── (키: compat|nameKo)
const capsules = readJson(CAPS)
const existingCap = new Map(capsules.filter(c => c.brand === '폴바셋').map(c => [c.compat[0] + '|' + norm(c.nameKo), c]))
const added = [], disabled = [], priceChanged = [], needReview = []
let maxId = capsules.reduce((m, c) => Math.max(m, c.id), 6000)

for (const [key, a] of apiSingles) {
  const cur = existingCap.get(key)
  if (!cur) {
    const cap = {
      id: ++maxId, brand: '폴바셋', name: EN[a.flavor] || a.flavor, nameKo: a.flavor,
      intensity: 0, acidity: 3, body: 3, bitterness: 3,
      notes: [], caffeine: 'regular', compat: [a.compat],
      price: a.price, buyUrl: a.buyUrl,
      ...(a.image ? { image: a.image } : {}),
      desc: `폴바셋 ${a.compat === 'original' ? '네스프레소' : '돌체구스토'} 호환 ${a.flavor}.`,
    }
    capsules.push(cap)
    added.push(cap)
    needReview.push(`#${cap.id} ${cap.nameKo} (${a.compat}) — 강도(0)·향미·영문명 보완 필요`)
  } else {
    if (cur.isEnabled === false) { delete cur.isEnabled; priceChanged.push(`${cur.nameKo} (재전시)`) }
    if (a.price !== cur.price) { priceChanged.push(`${cur.nameKo}: ${cur.price}→${a.price}`); cur.price = a.price }
    if (a.buyUrl !== cur.buyUrl) cur.buyUrl = a.buyUrl
    if (a.image && a.image !== cur.image) cur.image = a.image
  }
}
for (const [key, c] of existingCap) {
  if (!apiSingles.has(key) && c.isEnabled !== false) { c.isEnabled = false; disabled.push(c.nameKo) }
}

// 라인별 단품 맛 → id (신규 포함, 단종 제외). 패키지 구성에 사용.
const singlesByCompat = {}
for (const c of capsules.filter(c => c.brand === '폴바셋' && c.isEnabled !== false)) {
  (singlesByCompat[c.compat[0]] ??= new Map()).set(norm(c.nameKo), c.id)
}

// 패키지 구성 계산: 명시 표기 "(시그2,브라질2,과테1)"가 있으면 그대로, 없으면 균등 분할
function packItems(pack) {
  const byFlavor = singlesByCompat[pack.compat] || new Map()
  const entries = [...byFlavor] // [nameKo, id]
  const inner = (pack.flavor.match(/\(([^)]*)\)/) || [])[1] || ''
  const explicit = [...inner.matchAll(/([가-힣]{2,})\s*(\d+)/g)]
    .map(m => { const e = entries.find(([f]) => f.includes(m[1])); return e ? { id: e[1], qty: (+m[2]) * pack.per } : null })
    .filter(Boolean)
  if (explicit.length >= 2) return explicit
  const qty = entries.length ? Math.round(pack.totalCaps / entries.length) : 0
  if (pack.kinds && pack.kinds !== entries.length) console.warn(`  ⚠️ 종수(${pack.kinds}) ≠ 단품 수(${entries.length}): ${pack.flavor}`)
  return entries.map(([, id]) => ({ id, qty }))
}

// ── 패키지 diff ── (키: compat|nameKo). nameKo는 괄호 제거 + 총캡슐수로 구분
const packages = readJson(PKGS)
const canonItems = arr => JSON.stringify([...arr].sort((x, y) => x.id - y.id))
const existingPkg = new Map(packages.map(p => [p.compat[0] + '|' + norm(p.nameKo), p]))
const pkgAdded = [], pkgDisabled = [], pkgUpdated = []
let maxPkgId = packages.reduce((m, p) => Math.max(m, p.id), 7000)

const apiPkgByKey = new Map()
for (const pack of apiPacks) {
  const cleanFlavor = norm(pack.flavor.replace(/\([^)]*\)/g, ''))
  const nameKo = `${cleanFlavor} · ${pack.totalCaps}캡슐`
  const key = pack.compat + '|' + nameKo
  if (apiPkgByKey.has(key)) continue
  apiPkgByKey.set(key, {
    compat: pack.compat, nameKo,
    name: `Variety Pack (${pack.kinds || (singlesByCompat[pack.compat]?.size ?? 0)} kinds, ${pack.totalCaps})`,
    price: pack.price, image: pack.image, buyUrl: pack.buyUrl, items: packItems(pack),
  })
}

for (const [key, a] of apiPkgByKey) {
  const cur = existingPkg.get(key)
  if (!cur) {
    packages.push({
      id: ++maxPkgId, brand: '폴바셋', name: a.name, nameKo: a.nameKo,
      compat: [a.compat], price: a.price,
      ...(a.image ? { image: a.image } : {}),
      ...(a.buyUrl ? { buyUrl: a.buyUrl } : {}),
      items: a.items,
    })
    pkgAdded.push({ nameKo: a.nameKo, compat: a.compat, items: a.items, price: a.price, name: a.name })
  } else {
    if (cur.isEnabled === false) { delete cur.isEnabled; pkgUpdated.push(`${cur.nameKo} (재전시)`) }
    if (a.price != null && a.price !== cur.price) { pkgUpdated.push(`${cur.nameKo}: ${cur.price}→${a.price}`); cur.price = a.price }
    if (a.buyUrl && a.buyUrl !== cur.buyUrl) cur.buyUrl = a.buyUrl
    if (a.image && a.image !== cur.image) cur.image = a.image
    if (canonItems(cur.items) !== canonItems(a.items)) { cur.items = a.items; pkgUpdated.push(`${cur.nameKo} (구성 변경)`) }
  }
}
for (const [key, p] of existingPkg) {
  if (!apiPkgByKey.has(key) && p.isEnabled !== false) { p.isEnabled = false; pkgDisabled.push(p.nameKo) }
}

// ── 리포트 ──
const line = '─'.repeat(48)
console.log(line + `\n폴바셋 업데이트 ${DRY ? '(DRY-RUN)' : ''}\n` + line)
console.log(`API 단품: ${apiSingles.size} | 기존: ${existingCap.size}`)
console.log(`\n[신규 단품] ${added.length}종`); added.forEach(c => console.log(`  + #${c.id} ${c.nameKo} (${c.compat[0]}, ${c.price}원/캡슐)`))
console.log(`\n[단품 단종] ${disabled.length}종`); disabled.forEach(n => console.log(`  - ${n}`))
console.log(`\n[가격/재전시] ${priceChanged.length}건`); priceChanged.forEach(n => console.log(`  ~ ${n}`))
console.log(`\n⚠️ [보완 필요] ${needReview.length}종`); needReview.forEach(n => console.log(`  ! ${n}`))
console.log(`\n[신규 패키지] ${pkgAdded.length}종`); pkgAdded.forEach(p => console.log(`  + ${p.nameKo} (${p.compat}, 구성 ${p.items.length}종, ${p.price}원) [영문명 검토: ${p.name}]`))
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
