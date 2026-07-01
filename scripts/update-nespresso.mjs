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
const CAPS = resolve(ROOT, 'src/data/capsules.json')
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

// 가격 맵: productId -> pricePerUnit
const priceMap = {}
for (const e of pricesResp.prices) {
  const d = e.prices?.[0]?.priceDetails
  if (d && d.pricePerUnit > 0) priceMap[e.productId] = d.pricePerUnit
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
    if (apiByKo.has(ko)) continue
    const aromas = (p.capsuleAromatics ?? []).map(a => ({ id: a.id.replace('capsuleAromatic_', ''), name: a.name }))
    apiByKo.set(ko, {
      ko,
      en: norm(p.internationalName || p.name),
      intensity: p.capsuleProperties?.intensity ?? 0,
      decaf: !!p.decaffeinated,
      compat,
      brand: brandOf(ko),
      aromas,
      price: priceMap[p.id] ?? null,
      buyUrl: p.pdpURLs?.desktop || p.pdpURLs?.opr || null,
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
const existingKo = new Map() // nameKo -> capsule(스코프 내)
for (const c of capsules) if (NESPRESSO_BRANDS.has(c.brand)) existingKo.set(norm(c.nameKo), c)

const added = [], disabled = [], priceChanged = []
let maxId = capsules.reduce((m, c) => Math.max(m, c.id), 0)

// 신규 + 기존 갱신
for (const [ko, a] of apiByKo) {
  const cur = existingKo.get(ko)
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
      desc: (a.aromas.map(ar => ar.name).join('·') || a.ko) + ' 향의 네스프레소 캡슐.',
    }
    capsules.push(cap)
    added.push(cap)
  } else {
    // 기존: 다시 전시됐다면 공개 복구, 가격/구매URL 갱신
    if (cur.isEnabled === false) { delete cur.isEnabled; priceChanged.push(`${cur.nameKo} (재전시)`) }
    if (a.price != null && a.price !== cur.price) { priceChanged.push(`${cur.nameKo}: ${cur.price}→${a.price}`); cur.price = a.price }
    if (a.buyUrl && a.buyUrl !== cur.buyUrl) cur.buyUrl = a.buyUrl
  }
}

// 사라진 캡슐 → 소프트 단종
for (const [ko, c] of existingKo) {
  if (!apiByKo.has(ko) && c.isEnabled !== false) { c.isEnabled = false; disabled.push(c.nameKo) }
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
console.log(line)

if (DRY) {
  console.log('DRY-RUN: 파일을 수정하지 않았습니다.')
} else if (added.length || disabled.length || priceChanged.length || addedNotes.length) {
  writeFileSync(CAPS, JSON.stringify(capsules, null, 2) + '\n')
  writeFileSync(NOTES, JSON.stringify(notes, null, 2) + '\n')
  console.log('capsules.json / notes.json 갱신 완료.')
} else {
  console.log('변경 사항 없음.')
}
