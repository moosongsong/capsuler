#!/usr/bin/env node
// 네스프레소 캡슐 업데이트 스크립트
//
// 동작:
//   1) scripts/nespresso-fetch.sh 로 현재 전시 상품/가격을 가져온다
//   2) src/data/capsules.json 과 비교
//      - 신규 캡슐  → 추가(isEnabled 미지정=공개)
//      - 사라진 캡슐 → isEnabled:false (소프트 단종, 삭제하지 않음)
//      - 기존 캡슐  → 가격/구매URL 갱신(강도·향미·설명 등 큐레이션 값은 보존)
//   3) 새 향미(notes)가 있으면 src/data/notes.json 에 추가
//   4) 변경 요약을 출력
//
// 사용:  node scripts/update-nespresso.mjs           # 실제 반영
//        node scripts/update-nespresso.mjs --dry-run # 미리보기(파일 미수정)
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CAPS = resolve(ROOT, 'src/data/capsules/nespresso.json')
const PKGS = resolve(ROOT, 'src/data/packages/nespresso.json')
const NOTES = resolve(ROOT, 'src/data/notes.json')
const FETCH = resolve(ROOT, 'scripts/nespresso-fetch.sh')
const DRY = process.argv.includes('--dry-run')

// 네스프레소 API에서 관리하는 브랜드(스코프). illy·카누는 건드리지 않음.
const NESPRESSO_BRANDS = new Set(['Nespresso', 'Starbucks', 'Blue Bottle'])

const norm = s => s.replace(/®/g, '').replace(/\*/g, '').replace(/\s+/g, ' ').trim()
const fetchJson = what => JSON.parse(execFileSync('bash', [FETCH, what], { maxBuffer: 64 * 1024 * 1024 }).toString())

const brandOf = ko => (ko.includes('스타벅스') ? 'Starbucks' : ko.includes('블루보틀') ? 'Blue Bottle' : 'Nespresso')

const idToEn = id => {
  const s = id.replace(/_\d+$/, '').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/-/g, ' ').toLowerCase().trim()
  return s.charAt(0).toUpperCase() + s.slice(1)
}
const iconOf = id => {
  const x = id.toLowerCase()
  if (/choc|cocoa/.test(x)) return 'ti-candy'
  if (/hazel|almond|nut/.test(x)) return 'ti-seeding'
  if (/yuzu|citrus|citric|orange|lemon/.test(x)) return 'ti-lemon-2'
  if (/caramel|honey|sweet|brown-sugar/.test(x)) return 'ti-honey'
  if (/cereal|malt|biscuit|toasted|bread/.test(x)) return 'ti-wheat'
  if (/roast|smoky/.test(x)) return 'ti-flame'
  if (/berry|fruit|apple/.test(x)) return 'ti-apple'
  if (/flow|floral|jasmin/.test(x)) return 'ti-flower'
  if (/wood/.test(x)) return 'ti-trees'
  if (/spic|pepper/.test(x)) return 'ti-pepper'
  if (/vanilla|coconut|ginseng|milk|wine/.test(x)) return 'ti-glass-full'
  if (/herb/.test(x)) return 'ti-leaf'
  return 'ti-coffee'
}
const clamp = n => Math.max(1, Math.min(5, n))
// 강도·향미로 산미/바디/쓴맛 근사(API 미제공)
function derive(intensity, noteIds) {
  const bright = noteIds.some(n => /fruit|floral|flower|citr|berry|wine/i.test(n))
  const dark = noteIds.some(n => /cocoa|choc|wood|spic|roast|smoky/i.test(n))
  const scale = clamp(Math.round((intensity || 4) / 13 * 5))
  const acidity = bright ? clamp(6 - scale) : dark ? clamp(4 - Math.round((intensity || 4) / 13 * 3)) : 3
  return { acidity, body: scale, bitterness: scale }
}

// ── 데이터 로드 ──
const capsules = JSON.parse(readFileSync(CAPS, 'utf8'))
const notes = JSON.parse(readFileSync(NOTES, 'utf8'))
const products = fetchJson('products')
const pricesResp = fetchJson('prices')

// 가격 맵: productId -> pricePerUnit(캡슐 단품용) / price(패키지 전체가용)
const priceMap = {}
const priceTotalMap = {}
for (const e of pricesResp.prices) {
  const d = e.prices?.[0]?.priceDetails
  if (!d) continue
  if (d.pricePerUnit > 0) priceMap[e.productId] = d.pricePerUnit
  if (d.price > 0) priceTotalMap[e.productId] = d.price
}

// API 상품 → 캡슐 단품만 (번들 제외), nameKo 기준 dedup
const apiByKo = new Map()
for (const cat of products) {
  for (const p of cat.products ?? []) {
    if (p.modelType !== 'Capsule' || p.bundled || !p.name) continue
    const tech = (p.technologies ?? []).join('|')
    const compat = tech.includes('/vertuo') ? 'vertuo' : tech.includes('/original') ? 'original' : null
    if (!compat) continue
    const ko = norm(p.name)
    // 동명이품(예: 원본 콜롬비아 vs 버츄오 콜롬비아)을 구분하려 nameKo+호환머신을 키로 사용
    const key = ko + '|' + compat
    if (apiByKo.has(key)) continue
    const aromas = (p.capsuleAromatics ?? []).map(a => ({ id: a.id.replace('capsuleAromatic_', ''), name: a.name }))
    apiByKo.set(key, {
      ko,
      en: norm(p.internationalName || p.name),
      intensity: p.capsuleProperties?.intensity ?? 0,
      decaf: !!p.decaffeinated,
      compat,
      brand: brandOf(ko),
      aromas,
      price: priceMap[p.id] ?? null,
      buyUrl: p.pdpURLs?.desktop || p.pdpURLs?.opr || null,
      image: (() => { const ri = p.responsiveImages || {}; const path = ri.plp || ri.standard || p.images?.icon; return path ? 'https://www.nespresso.com' + path : null })(),
    })
  }
}

// ── 새 향미 등록 ──
const addedNotes = []
function ensureNote(id, koName) {
  if (notes[id]) return
  notes[id] = { ko: koName || id, en: idToEn(id), icon: iconOf(id) }
  addedNotes.push(id)
}

// ── diff ──
const existingKo = new Map() // "nameKo|compat" -> capsule(스코프 내)
for (const c of capsules) if (NESPRESSO_BRANDS.has(c.brand)) existingKo.set(norm(c.nameKo) + '|' + c.compat[0], c)

const added = [], disabled = [], priceChanged = []
let maxId = capsules.reduce((m, c) => Math.max(m, c.id), 0)

// 신규 + 기존 갱신
for (const [key, a] of apiByKo) {
  const cur = existingKo.get(key)
  if (!cur) {
    // 신규 캡슐
    for (const ar of a.aromas) ensureNote(ar.id, ar.name)
    const noteIds = a.aromas.map(ar => ar.id)
    const d = derive(a.intensity, noteIds)
    const cap = {
      id: ++maxId, brand: a.brand, name: a.en, nameKo: a.ko,
      intensity: a.intensity, acidity: d.acidity, body: d.body, bitterness: d.bitterness,
      notes: noteIds, caffeine: a.decaf ? 'decaf' : 'regular', compat: [a.compat],
      price: a.price ?? 0,
      ...(a.buyUrl ? { buyUrl: a.buyUrl } : {}),
      ...(a.image ? { image: a.image } : {}),
      desc: (a.aromas.map(ar => ar.name).join('·') || a.ko) + ' 향의 네스프레소 캡슐.',
    }
    capsules.push(cap)
    added.push(cap)
  } else {
    // 기존: 다시 전시됐다면 공개 복구, 가격/구매URL 갱신
    if (cur.isEnabled === false) { delete cur.isEnabled; priceChanged.push(`${cur.nameKo} (재전시)`) }
    if (a.price != null && a.price !== cur.price) { priceChanged.push(`${cur.nameKo}: ${cur.price}→${a.price}`); cur.price = a.price }
    if (a.buyUrl && a.buyUrl !== cur.buyUrl) cur.buyUrl = a.buyUrl
    if (a.image && a.image !== cur.image) cur.image = a.image
  }
}

// 사라진 캡슐 → 소프트 단종
for (const [key, c] of existingKo) {
  if (!apiByKo.has(key) && c.isEnabled !== false) { c.isEnabled = false; disabled.push(c.nameKo) }
}

// ── 패키지(번들/세트) 처리 ──
// 정책: 신규 추가 / 사라지면 isEnabled:false / 기존은 가격·URL·이미지·구성(items) 갱신.
//       영문명(name)은 큐레이션 값이라 기존 패키지에선 보존한다.
const packages = JSON.parse(readFileSync(PKGS, 'utf8'))
const cleanKo = ko => norm(ko).replace(/\s*\(60\s*캡슐\)/, '')
// 구성 비교(순서 무관): id 기준 정렬 후 직렬화
const canonItems = arr => JSON.stringify([...arr].sort((x, y) => x.id - y.id))

// legacyId(코드) → 구매URL 꼬리(구성 캡슐 식별용). 전체 API 상품에서 수집.
const codeToTail = new Map()
for (const cat of products) for (const p of cat.products ?? []) {
  const code = p.legacyId || String(p.id).split('/').pop()
  if (!code || codeToTail.has(code)) continue
  const buy = p.pdpURLs?.desktop || p.pdpURLs?.opr || ''
  codeToTail.set(code, (buy.split('/').pop() || '').split('?')[0])
}
// 내 캡슐 buyUrl 꼬리 → id (이번 실행에서 새로 추가된 캡슐 포함)
const capByTail = new Map()
for (const c of capsules) { const t = (c.buyUrl || '').split('/').pop(); if (t) capByTail.set(t, c.id) }

// API 번들 → nameKo 기준 dedup, 구성 캡슐을 내 id로 매핑
const apiPkgByKo = new Map()
for (const cat of products) for (const p of cat.products ?? []) {
  if (!p.bundled || !p.name) continue
  const ko = cleanKo(p.name)
  if (apiPkgByKo.has(ko)) continue
  const items = []
  for (const g of p.groupedProducts ?? []) {
    if (g.type !== 'capsule') continue
    const tail = codeToTail.get(g.productCode)
    const id = tail ? capByTail.get(tail) : null
    if (id) items.push({ id, qty: g.quantity })
  }
  if (items.length < 2) continue // 순수 캡슐 어소트먼트만(하드웨어 세트·매핑 부족 제외)
  const isVertuo = /버츄오|vertuo/i.test(ko + ' ' + (p.urlFriendlyName || ''))
  apiPkgByKo.set(ko, {
    ko, en: norm(p.internationalName || p.name),
    compat: isVertuo ? 'vertuo' : 'original',
    price: priceTotalMap[p.id] ?? null,
    buyUrl: p.pdpURLs?.desktop || p.pdpURLs?.opr || null,
    image: p.images?.icon ? 'https://www.nespresso.com' + p.images.icon : null,
    items,
  })
}

const existingPkgKo = new Map()
for (const p of packages) existingPkgKo.set(cleanKo(p.nameKo), p)

const pkgAdded = [], pkgDisabled = [], pkgUpdated = []
let maxPkgId = packages.reduce((m, p) => Math.max(m, p.id), 4000)

for (const [ko, a] of apiPkgByKo) {
  const cur = existingPkgKo.get(ko)
  if (!cur) {
    const pkg = {
      id: ++maxPkgId, brand: 'Nespresso', name: a.en, nameKo: a.ko,
      compat: [a.compat], price: a.price ?? 0,
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
// 사라진 패키지 → 소프트 단종
for (const [ko, p] of existingPkgKo) {
  if (!apiPkgByKo.has(ko) && p.isEnabled !== false) { p.isEnabled = false; pkgDisabled.push(p.nameKo) }
}

// ── 리포트 ──
const line = '─'.repeat(48)
console.log(line)
console.log(`네스프레소 캡슐 업데이트 ${DRY ? '(DRY-RUN)' : ''}`)
console.log(line)
console.log(`API 단품: ${apiByKo.size} | 기존(네스프레소 스코프): ${existingKo.size}`)
console.log(`\n[신규 추가] ${added.length}종`)
added.forEach(c => console.log(`  + #${c.id} ${c.nameKo} (${c.brand}, 강도 ${c.intensity}, ${c.price}원) [영문명 검토요망: ${c.name}]`))
console.log(`\n[단종 처리] ${disabled.length}종`)
disabled.forEach(n => console.log(`  - ${n} → isEnabled:false`))
console.log(`\n[가격/재전시 변경] ${priceChanged.length}건`)
priceChanged.forEach(n => console.log(`  ~ ${n}`))
console.log(`\n[새 향미] ${addedNotes.length}종`)
addedNotes.forEach(id => console.log(`  * ${id} = ${notes[id].ko} / ${notes[id].en} (${notes[id].icon})`))

console.log(`\n${line}\n패키지(세트) 업데이트`)
console.log(`API 번들(매핑 2종↑): ${apiPkgByKo.size} | 기존 패키지: ${existingPkgKo.size}`)
console.log(`\n[신규 패키지] ${pkgAdded.length}종`)
pkgAdded.forEach(p => console.log(`  + #${p.id} ${p.nameKo} (${p.compat[0]}, 구성 ${p.items.length}종, ${p.price}원) [영문명 검토요망: ${p.name}]`))
console.log(`\n[패키지 단종] ${pkgDisabled.length}종`)
pkgDisabled.forEach(n => console.log(`  - ${n} → isEnabled:false`))
console.log(`\n[패키지 변경] ${pkgUpdated.length}건`)
pkgUpdated.forEach(n => console.log(`  ~ ${n}`))
console.log(line)

const capChanged = added.length || disabled.length || priceChanged.length || addedNotes.length
const pkgChanged = pkgAdded.length || pkgDisabled.length || pkgUpdated.length
if (DRY) {
  console.log('DRY-RUN: 파일을 수정하지 않았습니다.')
} else if (capChanged || pkgChanged) {
  writeFileSync(CAPS, JSON.stringify(capsules, null, 2) + '\n')
  writeFileSync(NOTES, JSON.stringify(notes, null, 2) + '\n')
  writeFileSync(PKGS, JSON.stringify(packages, null, 2) + '\n')
  console.log('capsules/nespresso.json / notes.json / packages/nespresso.json 갱신 완료.')
} else {
  console.log('변경 사항 없음.')
}
