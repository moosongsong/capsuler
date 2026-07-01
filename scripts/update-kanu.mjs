#!/usr/bin/env node
// 카누 캡슐 업데이트 스크립트 (바리스타 / 네스프레소 호환 / 돌체구스토 호환 3개 라인)
//
// 카누 API 특성: 이름·가격·설명(promotionText)·구매URL만 제공.
//   강도(intensity)와 구조화된 향미(aromatics)는 API에 없다.
//   → 신규 캡슐은 강도 0(미정)으로 추가하고, 향미는 설명에서 추정, 영문명은 한글 임시.
//     실제 강도·향미·영문명은 공식 강도 이미지로 사람이 채워야 한다(리포트에 플래그).
//
// 동작: 신규 추가 / 사라진 것 isEnabled:false / 가격·구매URL 갱신
//
// 사용:  node scripts/update-kanu.mjs [--dry-run]
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const CAPS = resolve(ROOT, 'src/data/capsules/kanu.json')
const FETCH = resolve(ROOT, 'scripts/kanu-fetch.sh')
const DRY = process.argv.includes('--dry-run')

// 카누 3개 라인: 카테고리 → 앱 compat + nameKo 접미어
const LINES = [
  { cat: '930896', compat: 'kanubarista', suffix: '' },
  { cat: '930897', compat: 'original', suffix: ' (네스프레소 호환)' },
  { cat: '930898', compat: 'dolcegusto', suffix: ' (돌체구스토 호환)' },
]

const norm = s => s.replace(/\s+/g, ' ').trim()
const baseName = productName => norm(productName.split('|')[0]) // "이름 | 카누 ... (N캡슐)" → "이름"
// 매칭용 정규화: "싱글오리진/싱글 오리진" 접두어 유무 차이를 흡수
const canon = s => s.replace(/싱글\s*오리진\s*/g, '').replace(/\s+/g, ' ').trim()
const isBundle = name => /컬렉션|세트|버라이어티|팩/.test(name)
const packSizeOf = name => { const m = name.match(/\((\d+)\s*캡슐\)/); return m ? +m[1] : null }

function fetchCat(cat) {
  const p1 = JSON.parse(execFileSync('bash', [FETCH, cat, '1'], { maxBuffer: 64 * 1024 * 1024 }))
  const items = [...p1.items]
  for (let pg = 2; pg <= (p1.pageCount || 1); pg++) {
    const p = JSON.parse(execFileSync('bash', [FETCH, cat, String(pg)], { maxBuffer: 64 * 1024 * 1024 }))
    items.push(...p.items)
  }
  return items
}

// 설명 문구 → 향미 노트 추정(모두 기존 notes.json key). 최대 2개.
const NOTE_RULES = [
  [/다크\s*초콜릿|다크초콜릿/, 'dark-chocolate'], [/초콜릿|카카오|코코아/, 'cocoa'],
  [/캐러멜|카라멜/, 'caramel'], [/헤이즐넛|아몬드|견과/, 'nutty'],
  [/그을음|스모키|스모크/, 'Smoky'], [/와인/, 'wine'], [/베리/, 'berry'],
  [/시트러스|감귤|청사과/, 'citrus'], [/과일|과실/, 'fruity'],
  [/재스민|자스민|꽃|플로럴/, 'flowery'], [/허브/, 'herb'], [/바닐라/, 'vanilla'],
  [/비스킷|구운\s*빵|곡물/, 'biscuity'], [/균형/, 'balanced'], [/달콤/, 'sweet'],
  [/우디/, 'woody'], [/스파이시|후추/, 'spicy'],
]
function notesFromText(t) {
  const out = []
  for (const [re, key] of NOTE_RULES) if (re.test(t) && !out.includes(key)) out.push(key)
  return out.slice(0, 2)
}

// ── 데이터 로드 ──
const capsules = JSON.parse(readFileSync(CAPS, 'utf8'))

// API: 라인별 개별 캡슐 수집. key = compat|base
const apiByKey = new Map()
for (const { cat, compat, suffix } of LINES) {
  const items = fetchCat(cat)
  const singles = items.filter(p => !isBundle(p.productName) && (packSizeOf(p.productName) ?? 99) <= 16)
  if (singles.length === 0) {
    console.error(`⚠️ 카테고리 ${cat}(${compat}) 개별 캡슐 0개 — 조회 실패 의심. 중단.`)
    process.exit(1)
  }
  for (const p of singles) {
    const base = baseName(p.productName)
    const key = compat + '|' + canon(base)
    if (apiByKey.has(key)) continue
    const pack = packSizeOf(p.productName) || 10
    apiByKey.set(key, {
      compat, suffix, base,
      nameKo: base + suffix,
      price: Math.round(p.salePrice / pack),
      buyUrl: `https://www.kanu.co.kr/product-detail/${p.productNo}`,
      desc: (p.promotionText || '').replace(/\\n/g, ' ').trim(),
      decaf: /디카페인|디카페|decaf/i.test(base),
    })
  }
}

// 기존 카누 캡슐: key = compat|base(접미어 제거)
const stripSuffix = ko => ko.replace(/\s*\((네스프레소|돌체구스토)\s*호환\)\s*$/, '').trim()
const existing = new Map()
for (const c of capsules) {
  if (c.brand !== '카누') continue
  existing.set(c.compat[0] + '|' + canon(stripSuffix(c.nameKo)), c)
}

const added = [], disabled = [], priceChanged = [], needReview = []
let maxId = capsules.reduce((m, c) => Math.max(m, c.id), 0)

for (const [key, a] of apiByKey) {
  const cur = existing.get(key)
  if (!cur) {
    const notes = notesFromText(a.desc)
    const cap = {
      id: ++maxId, brand: '카누', name: a.base, nameKo: a.nameKo,
      intensity: 0, acidity: 3, body: 3, bitterness: 3,
      notes, caffeine: a.decaf ? 'decaf' : 'regular', compat: [a.compat],
      price: a.price, buyUrl: a.buyUrl,
      desc: a.desc + ' 카누 캡슐.',
    }
    capsules.push(cap)
    added.push(cap)
    needReview.push(`#${cap.id} ${cap.nameKo} — 강도(현재 0)·영문명(${cap.name})${notes.length < 2 ? '·향미' : ''} 이미지로 보완 필요`)
  } else {
    if (cur.isEnabled === false) { delete cur.isEnabled; priceChanged.push(`${cur.nameKo} (재전시)`) }
    if (a.price !== cur.price) { priceChanged.push(`${cur.nameKo}: ${cur.price}→${a.price}`); cur.price = a.price }
    if (a.buyUrl !== cur.buyUrl) cur.buyUrl = a.buyUrl
  }
}

for (const [key, c] of existing) {
  if (!apiByKey.has(key) && c.isEnabled !== false) { c.isEnabled = false; disabled.push(c.nameKo) }
}

// ── 리포트 ──
const line = '─'.repeat(48)
console.log(line + `\n카누 캡슐 업데이트 ${DRY ? '(DRY-RUN)' : ''}\n` + line)
console.log(`API 개별 캡슐: ${apiByKey.size} | 기존 카누: ${existing.size}`)
console.log(`\n[신규] ${added.length}종`); added.forEach(c => console.log(`  + #${c.id} ${c.nameKo} (${c.compat[0]}, ${c.price}원, 향미 [${c.notes.join(', ')}])`))
console.log(`\n[단종] ${disabled.length}종`); disabled.forEach(n => console.log(`  - ${n}`))
console.log(`\n[가격/재전시] ${priceChanged.length}건`); priceChanged.forEach(n => console.log(`  ~ ${n}`))
console.log(`\n⚠️ [보완 필요] ${needReview.length}종`); needReview.forEach(n => console.log(`  ! ${n}`))
console.log(line)

if (DRY) console.log('DRY-RUN: 파일 미수정.')
else if (added.length || disabled.length || priceChanged.length) {
  writeFileSync(CAPS, JSON.stringify(capsules, null, 2) + '\n')
  console.log('capsules.json 갱신 완료.')
} else console.log('변경 없음.')
