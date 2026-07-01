// 캡슐/향미 데이터 로더 및 추천·향미 관련 헬퍼
//
// 실제 데이터는 아래 JSON 파일에서 출처별로 관리합니다(각 업데이트 스킬이 자기 파일만 담당):
//   src/data/capsules/nespresso.json — Nespresso·Starbucks·Blue Bottle (id 1xxx)
//   src/data/capsules/illy.json      — illy (id 2xxx)
//   src/data/capsules/kanu.json      — 카누 (id 3xxx)
//   src/data/notes.json              — 향미 key -> { ko, en, icon } (출처 공통)
import type { Capsule, Lang, RecPrefs, Package, PackageMatch } from './types'
import nespressoData from './data/capsules/nespresso.json'
import illyData from './data/capsules/illy.json'
import kanuData from './data/capsules/kanu.json'
import nespressoPackages from './data/packages/nespresso.json'
import kanuPackages from './data/packages/kanu.json'
import notesData from './data/notes.json'

// 전체 데이터(단종 포함). 공개 목록에서는 isEnabled !== false 인 것만 노출.
export const allCapsules = [...nespressoData, ...illyData, ...kanuData] as unknown as Capsule[]
export const capsules = allCapsules.filter(c => c.isEnabled !== false)

// 패키지(어소트먼트/세트). 출처별 JSON을 합치고, 구성 중 존재하는 캡슐만 남겨 정리.
// items가 빈 패키지(구성 미확보·둘러보기 전용)도 유지 — 추천/상세엔 안 잡히고 목록에만 노출.
const allPackages = [...nespressoPackages, ...kanuPackages] as unknown as Package[]
const capsuleIds = new Set(capsules.map(c => c.id))
export const packages: Package[] = allPackages
  .filter(p => p.isEnabled !== false)
  .map(p => ({ ...p, items: p.items.filter(it => capsuleIds.has(it.id)) }))

// ── 향미 라벨/아이콘 (notes.json 파생) ──
interface NoteInfo { ko: string; en: string; icon: string }
const notes = notesData as Record<string, NoteInfo>
export const noteIcons: Record<string, string> =
  Object.fromEntries(Object.entries(notes).map(([k, v]) => [k, v.icon]))
export const noteLabels: Record<Lang, Record<string, string>> = {
  ko: Object.fromEntries(Object.entries(notes).map(([k, v]) => [k, v.ko])),
  en: Object.fromEntries(Object.entries(notes).map(([k, v]) => [k, v.en])),
}

// 필터/순회용 머신 목록
export const MACHINES = ['original', 'vertuo', 'dolcegusto', 'iperespresso', 'kanubarista'] as const

export const won = (n: number): string => n.toLocaleString('ko-KR') + '원'

// 머신별 카테고리 페이지(캡슐에 개별 buyUrl이 없을 때 폴백)
const categoryUrl: Record<string, string> = {
  original: 'https://www.nespresso.com/kr/ko/order/capsules/original',
  vertuo: 'https://www.nespresso.com/kr/ko/order/capsules/vertuo',
  dolcegusto: 'https://www.nespresso.com/kr/ko/order/capsules',
  iperespresso: 'https://shop.illycaffe.co.kr/goods/goods_list.php?cateCd=001006006',
  kanubarista: 'https://kanucapsule.com',
}

// 캡슐의 구매 페이지 URL(개별 buyUrl → 없으면 머신 카테고리 페이지)
export function buyUrlFor(c: Capsule): string {
  return c.buyUrl ?? categoryUrl[c.compat[0]] ?? 'https://www.nespresso.com/kr/ko/'
}

// 추천 점수 계산: 사용자 취향(p)과 캡슐(c)의 거리 기반
export function recScore(p: RecPrefs, c: Capsule): number {
  if (p.decaf && c.caffeine !== 'decaf') return -Infinity
  const iD = Math.abs(p.intensity - c.intensity) / 12
  const aD = Math.abs(p.acidity - c.acidity) / 4
  const bD = Math.abs(p.body - c.body) / 4
  let s = 1 - (iD * 0.45 + aD * 0.30 + bD * 0.25)
  s += c.notes.filter(n => p.notes.has(n)).length * 0.05
  return s
}

// 강도(1~13)를 막대 5칸으로 환산
export function intensityBars(v: number): boolean[] {
  const f = Math.round(v / 13 * 5)
  return Array.from({ length: 5 }, (_, i) => i < f)
}

// 찜한 캡슐과 겹치는 패키지를 추천(혼합 기준).
// 정렬: ① 겹친 절대 개수 → ② 커버리지 비율(패키지+찜) → ③ 저렴한 순
export function recommendedPackages(favorites: Set<number>, limit = 5): PackageMatch[] {
  if (favorites.size === 0) return []
  return packages
    .map((pkg): PackageMatch => {
      const matchIds = pkg.items.filter(it => favorites.has(it.id)).map(it => it.id)
      return {
        pkg,
        matchIds,
        matchCount: matchIds.length,
        coveragePkg: matchIds.length / pkg.items.length,
        coverageFav: matchIds.length / favorites.size,
      }
    })
    .filter(m => m.matchCount > 0)
    .sort((a, b) =>
      b.matchCount - a.matchCount ||
      (b.coveragePkg + b.coverageFav) - (a.coveragePkg + a.coverageFav) ||
      a.pkg.price - b.pkg.price,
    )
    .slice(0, limit)
}

// 특정 캡슐이 포함된 패키지(구성 수 적은 순 → 저렴한 순)
export function packagesContaining(capsuleId: number): Package[] {
  return packages
    .filter(p => p.items.some(it => it.id === capsuleId))
    .sort((a, b) => a.items.length - b.items.length || a.price - b.price)
}

// 특정 캡슐과 비슷한 캡슐 상위 2개
export function similar(c: Capsule): Capsule[] {
  return capsules
    .filter(x => x.id !== c.id)
    .map(x => {
      const iD = Math.abs(c.intensity - x.intensity) / 12
      const aD = Math.abs(c.acidity - x.acidity) / 4
      const bD = Math.abs(c.body - x.body) / 4
      const overlap = x.notes.filter(n => c.notes.includes(n)).length
      return { x, s: 1 - (iD * 0.45 + aD * 0.30 + bD * 0.25) + overlap * 0.05 }
    })
    .sort((a, b) => b.s - a.s)
    .slice(0, 2)
    .map(o => o.x)
}
