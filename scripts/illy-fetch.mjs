#!/usr/bin/env node
// illy 커피 공식몰(godomall / PHP) 상품 스크래퍼
//
// illy는 공개 JSON API가 없고 상품이 HTML에 렌더링된다. 이 스크립트는
// 카테고리 목록 페이지에서 goodsNo·상품명을 뽑고, 각 상세페이지에서 가격을 best-effort로 읽는다.
//
// 사용:  node scripts/illy-fetch.mjs [category]
//   category: iperespresso | nespresso | <cateCd 숫자>
//     iperespresso = 001006006 (iperEspresso 18P)   → 앱 compat "iperespresso"
//     nespresso    = 001008    (네스프레소 오리지널 호환) → 앱 compat "original"
//
// 출력(JSON): [{ goodsNo, title, packSize, packPrice, perCapsule, buyUrl }]
//   ※ HTML 스크래핑이라 마크업이 바뀌면 깨질 수 있음(취약). 결과는 사람이 검토할 것.
import { execFileSync } from 'node:child_process'

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Safari/537.36'
const curl = url => execFileSync('curl', ['-sS', '-A', UA, url], { maxBuffer: 64 * 1024 * 1024 }).toString()

const CATS = { iperespresso: '001006006', nespresso: '001008' }
const arg = process.argv[2] || 'iperespresso'
const cateCd = CATS[arg] || arg

const listHtml = curl(`https://shop.illycaffe.co.kr/goods/goods_list.php?cateCd=${cateCd}`)
const nos = [...new Set([...listHtml.matchAll(/goodsNo=(\d+)/g)].map(m => m[1]))]

const out = []
for (const no of nos) {
  const i = listHtml.indexOf('goodsNo=' + no)
  const seg = listHtml.slice(i, i + 1200)
  const tm = seg.match(/title="([^"]+)"/)
  const title = tm ? tm[1].trim() : ''
  if (!title) continue
  if (/세트|패키지|개입|올인원|\d+\s*팩/.test(title)) continue // 번들 제외

  const buyUrl = `https://shop.illycaffe.co.kr/goods/goods_view.php?goodsNo=${no}`
  const imgM = seg.match(/https:\/\/[a-z0-9]+\.cdn-nhncommerce\.com\/data\/goods\/[^"'? ]+\.(?:jpg|png)/)
  const image = imgM ? imgM[0] : null
  const packSize = /(\d+)\s*P/i.test(title) ? +title.match(/(\d+)\s*P/i)[1] : 10 // 18P 등, 네스프레소 호환은 10P
  let packPrice = null
  try {
    const view = curl(buyUrl)
    const m = view.match(/"price"\s*:\s*"?(\d{3,7})/) || view.match(/\bprice\b[^0-9]{0,6}(\d{4,6})/i)
    if (m) packPrice = +m[1]
  } catch { /* 무시 */ }

  out.push({
    goodsNo: no,
    title,
    packSize,
    packPrice,
    perCapsule: packPrice ? Math.round(packPrice / packSize) : null,
    buyUrl,
    image,
  })
}

console.log(JSON.stringify(out, null, 2))
console.error(`illy ${arg}(${cateCd}): 개별 ${out.length}종 (전체 링크 ${nos.length}개 중 번들 제외)`)
