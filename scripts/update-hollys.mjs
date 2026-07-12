#!/usr/bin/env node
// 할리스(HOLLYS) 캡슐/패키지 업데이트 스크립트 (네스프레소 오리지널 호환)
//
// 네이버 브랜드스토어(scripts/hollys-fetch.sh)로 캡슐커피 카테고리를 가져와
//   src/data/capsules/hollys.json (단품)  — id 8000번대
//   src/data/packages/hollys.json (패키지) — id 9000번대
// 를 최신화한다. 할리스 캡슐은 전부 네스프레소 오리지널 호환(compat: original), 브랜드 `할리스`.
//
// API 한계: 이름·가격·이미지·구매URL만 제공. 강도·향미 없음.
//   → 신규 단품은 강도 0·향미 빈값·영문명 자동으로 추가하고 [보완 필요]로 플래그.
//     공식 제품 정보로 사람이 채운다(수치 없으면 향미 기반 추정 + desc에 안내). 기존 큐레이션 값 보존.
//
// 상품 분류 (이름 예: "[할리스] 캡슐커피 {블렌드} 10개입 (네스프레소 오리지널 호환)"):
//   - 단품:   "종"이 없고 "{블렌드} N개입"           → 캡슐(개당가 = 가격/개입)
//   - 패키지: "N종"이 있음                            → 세트
//   ⚠️ 할리스 패키지는 고정 구성이 아니라 선택형(옵션) 상품일 수 있고 이름도 불규칙하다.
//      → 기본은 반영하지 않고 감지만 한다(리포트에 노출). 반영은 --with-packages 로만.
//        (스킬이 감지된 패키지를 사용자에게 보여주고 포함 여부를 물어본 뒤 결정한다)
//
// 사용:  node scripts/update-hollys.mjs [--dry-run] [--with-packages]
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CAPS = resolve(ROOT, 'src/data/capsules/hollys.json')
const PKGS = resolve(ROOT, 'src/data/packages/hollys.json')
const FETCH = resolve(ROOT, 'scripts/hollys-fetch.sh')
const DRY = process.argv.includes('--dry-run')
const WITH_PKG = process.argv.includes('--with-packages') // 패키지 반영 여부(기본 false)
const SIZE = 40

const norm = s => s.replace(/\s+/g, ' ').trim()
const readJson = p => { try { return JSON.parse(readFileSync(p, 'utf8')) } catch { return [] } }
const stripBrand = s => norm(s).replace(/^\[[^\]]*\]\s*/, '') // "[할리스] ..." → "..."

// 블렌드(한글) → 영문명 (공식 영문명 확인 전 임시. [보완 필요]로 검토)
const EN = {
  '시그니처 블렌드': 'Signature Blend',
  '디카페인 블렌드': 'Decaf Blend',
  '블랙아리아 블렌드': 'Black Aria Blend',
  '이클립스 블렌드': 'Eclipse Blend',
}
const buyUrl = id => `https://brand.naver.com/hollys2188/products/${id}`
const imgOf = p => p.representativeImageUrl || p.productImageUrl || null
const priceOf = p => p.benefitsView?.discountedSalePrice || p.salePrice || 0

const isPackage = name => /\d+\s*종/.test(name)
const parseSingle = name => {
  const n = stripBrand(name)
  const m = n.match(/캡슐\s*커피\s*(.+?)\s*(\d+)\s*개입/)
  return m ? { flavor: m[1].trim(), per: +m[2] } : null
}
// 패키지 총 캡슐수: "N개입"/"N캡슐"(및 A+B 합산) 토큰을 모두 더함(부정확할 수 있음)
const parsePackTotal = name => {
  let total = 0
  for (const m of stripBrand(name).matchAll(/((?:\d+\+)*\d+)\s*(?:개입|캡슐)/g))
    total += m[1].split('+').reduce((s, x) => s + (+x), 0)
  return total
}

// ── API 조회 (페이지네이션) ──
const fetchPage = pg => JSON.parse(execFileSync('bash', [FETCH, String(pg), 'POPULAR', String(SIZE)], { maxBuffer: 32 * 1024 * 1024 }))
const first = fetchPage(1)
const total = first.totalCount ?? (first.simpleProducts?.length ?? 0)
const products = [...(first.simpleProducts || [])]
for (let pg = 2, pages = Math.ceil(total / SIZE); pg <= pages; pg++) products.push(...(fetchPage(pg).simpleProducts || []))
if (products.length === 0) { console.error('⚠️ 상품 0개 — 조회 실패 의심(429/pageSize). 중단.'); process.exit(1) }

const apiSingles = new Map() // flavor -> {..}
const apiPacks = []          // {flavor(cleanName), kinds, totalCaps, price, image, buyUrl}
for (const p of products) {
  if (isPackage(p.name)) {
    const n = stripBrand(p.name)
    apiPacks.push({
      label: n, kinds: (n.match(/(\d+)\s*종/) || [])[1] * 1 || null,
      totalCaps: parsePackTotal(p.name), price: priceOf(p), image: imgOf(p), buyUrl: buyUrl(p.id),
    })
  } else {
    const s = parseSingle(p.name)
    if (s && !apiSingles.has(s.flavor)) apiSingles.set(s.flavor, { flavor: s.flavor, decaf: /디카페|decaf/i.test(s.flavor), price: Math.round(priceOf(p) / s.per), image: imgOf(p), buyUrl: buyUrl(p.id) })
  }
}

// ── 단품 diff ──
const capsules = readJson(CAPS)
const existingCap = new Map(capsules.filter(c => c.brand === '할리스').map(c => [norm(c.nameKo), c]))
const added = [], disabled = [], priceChanged = [], needReview = []
let maxId = capsules.reduce((m, c) => Math.max(m, c.id), 8000)

for (const [flavor, a] of apiSingles) {
  const cur = existingCap.get(flavor)
  if (!cur) {
    const cap = {
      id: ++maxId, brand: '할리스', name: EN[flavor] || flavor, nameKo: flavor,
      intensity: 0, acidity: 3, body: 3, bitterness: 3,
      notes: [], caffeine: a.decaf ? 'decaf' : 'regular', compat: ['original'],
      price: a.price, buyUrl: a.buyUrl,
      ...(a.image ? { image: a.image } : {}),
      desc: `할리스 네스프레소 오리지널 호환 ${flavor}.`,
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
const singleIds = capsules.filter(c => c.brand === '할리스' && c.isEnabled !== false).map(c => c.id)

// ── 패키지 처리 ──
// 할리스 패키지는 고정 구성이 아니라 선택형(옵션) 상품일 수 있어 기본은 반영하지 않는다.
// 감지만 리포트하고, --with-packages 일 때만 반영한다(스킬이 사용자에게 포함 여부를 물어봄).
const packages = readJson(PKGS)
const canonItems = arr => JSON.stringify([...arr].sort((x, y) => x.id - y.id))
const pkgAdded = [], pkgDisabled = [], pkgUpdated = [], pkgReview = []
if (WITH_PKG) {
  const existingPkg = new Map(packages.map(p => [norm(p.nameKo), p]))
  let maxPkgId = packages.reduce((m, p) => Math.max(m, p.id), 9000)
  const apiPkgByKo = new Map()
  for (const a of apiPacks) {
    const kinds = a.kinds || singleIds.length
    const nameKo = `${kinds}종 세트 · ${a.totalCaps}캡슐`
    if (apiPkgByKo.has(nameKo)) continue
    const qty = kinds ? Math.round(a.totalCaps / kinds) : 0
    apiPkgByKo.set(nameKo, {
      nameKo, name: `Variety Set (${kinds} kinds, ${a.totalCaps})`,
      price: a.price, image: a.image, buyUrl: a.buyUrl,
      items: singleIds.map(id => ({ id, qty })), label: a.label, kinds, totalCaps: a.totalCaps, qty,
    })
  }
  for (const [nameKo, a] of apiPkgByKo) {
    const cur = existingPkg.get(nameKo)
    if (!cur) {
      packages.push({
        id: ++maxPkgId, brand: '할리스', name: a.name, nameKo,
        compat: ['original'], price: a.price,
        ...(a.image ? { image: a.image } : {}),
        ...(a.buyUrl ? { buyUrl: a.buyUrl } : {}),
        items: a.items,
      })
      pkgAdded.push(a)
      pkgReview.push(`"${a.label}" → ${a.kinds}종×${a.qty}=${a.kinds * a.qty}캡슐로 추정. 실제 구성/수량 확인 필요`)
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
}

// ── 리포트 ──
const line = '─'.repeat(48)
console.log(line + `\n할리스 업데이트 ${DRY ? '(DRY-RUN)' : ''}\n` + line)
console.log(`API 단품: ${apiSingles.size} | 기존: ${existingCap.size}`)
console.log(`\n[신규 단품] ${added.length}종`); added.forEach(c => console.log(`  + #${c.id} ${c.nameKo} (${c.price}원/캡슐${c.caffeine === 'decaf' ? ', 디카페인' : ''})`))
console.log(`\n[단품 단종] ${disabled.length}종`); disabled.forEach(n => console.log(`  - ${n}`))
console.log(`\n[가격/재전시] ${priceChanged.length}건`); priceChanged.forEach(n => console.log(`  ~ ${n}`))
console.log(`\n⚠️ [보완 필요] ${needReview.length}종`); needReview.forEach(n => console.log(`  ! ${n}`))

console.log(`\n[패키지 감지] ${apiPacks.length}종  ${WITH_PKG ? '(반영함)' : '(미반영 — 포함하려면 --with-packages / 스킬은 사용자에게 물어볼 것)'}`)
apiPacks.forEach(a => console.log(`  · ${a.label} (${a.price}원)`))
if (WITH_PKG) {
  console.log(`\n[신규 패키지] ${pkgAdded.length}종`); pkgAdded.forEach(p => console.log(`  + ${p.nameKo} (${p.price}원) [영문명 검토: ${p.name}]`))
  console.log(`[패키지 단종] ${pkgDisabled.length}종`); pkgDisabled.forEach(n => console.log(`  - ${n}`))
  console.log(`[패키지 변경] ${pkgUpdated.length}건`); pkgUpdated.forEach(n => console.log(`  ~ ${n}`))
  console.log(`⚠️ [패키지 수량 확인] ${pkgReview.length}건 (이름 불규칙)`); pkgReview.forEach(n => console.log(`  ! ${n}`))
}
console.log(line)

const capChanged = added.length || disabled.length || priceChanged.length
const pkgChanged = pkgAdded.length || pkgDisabled.length || pkgUpdated.length
if (DRY) console.log('DRY-RUN: 파일 미수정.')
else {
  const wrote = []
  if (capChanged) { writeFileSync(CAPS, JSON.stringify(capsules, null, 2) + '\n'); wrote.push('capsules/hollys.json') }
  if (WITH_PKG && pkgChanged) { writeFileSync(PKGS, JSON.stringify(packages, null, 2) + '\n'); wrote.push('packages/hollys.json') }
  console.log(wrote.length ? wrote.join(' / ') + ' 갱신 완료.' : '변경 없음.')
}
