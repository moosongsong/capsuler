// 캡슐/향미 데이터 로더 및 추천·향미 관련 헬퍼
//
// 실제 데이터는 아래 JSON 파일에서 관리합니다(자주 갱신되는 데이터/코드 분리):
//   src/data/capsules.json  — 캡슐 목록(각 캡슐에 buyUrl 포함)
//   src/data/notes.json     — 향미 key -> { ko, en, icon }
import type { Capsule, Lang, RecPrefs } from './types'
import capsulesData from './data/capsules.json'
import notesData from './data/notes.json'

// 전체 데이터(단종 포함). 공개 목록에서는 isEnabled !== false 인 것만 노출.
export const allCapsules = capsulesData as unknown as Capsule[]
export const capsules = allCapsules.filter(c => c.isEnabled !== false)

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
