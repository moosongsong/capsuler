// 커피 캡슐 데이터 및 향미 노트 관련 상수/헬퍼
import type { Capsule, MachineSystem, RecPrefs } from './types'

export const capsules: Capsule[] = [
  {id:1, brand:"Nespresso", name:"Arpeggio", intensity:9, acidity:2, body:4, bitterness:4, notes:["cocoa","woody"], caffeine:"regular", compat:["original"], price:1000, desc:"진한 코코아 향과 묵직한 바디가 특징인 인텐스 에스프레소. 우유와 잘 어울려 라떼에도 좋아요."},
  {id:2, brand:"Nespresso", name:"Volluto", intensity:4, acidity:4, body:2, bitterness:2, notes:["fruity","cereal"], caffeine:"regular", compat:["original"], price:900, desc:"가볍고 상큼한 산미가 살아있는 부드러운 캡슐. 아침에 깔끔하게 즐기기 좋아요."},
  {id:3, brand:"illy", name:"Classico", intensity:6, acidity:3, body:3, bitterness:3, notes:["floral","caramel"], caffeine:"regular", compat:["original"], price:1100, desc:"균형 잡힌 풍미에 은은한 꽃향과 카라멜 단맛이 어우러진 클래식한 맛."},
  {id:4, brand:"Nespresso", name:"Kazaar", intensity:12, acidity:2, body:5, bitterness:5, notes:["woody","spicy"], caffeine:"regular", compat:["original"], price:1050, desc:"강렬한 강도와 스파이시한 여운. 진한 커피를 좋아하는 분께 추천해요."},
  {id:5, brand:"Starbucks", name:"House Blend", intensity:7, acidity:4, body:3, bitterness:3, notes:["nutty","cocoa"], caffeine:"regular", compat:["original","dolcegusto"], price:980, desc:"고소한 견과류 향과 부드러운 초콜릿 노트가 어우러진 데일리 블렌드."},
  {id:6, brand:"Nespresso", name:"Decaffeinato", intensity:5, acidity:3, body:3, bitterness:2, notes:["cereal","caramel"], caffeine:"decaf", compat:["original","vertuo"], price:1000, desc:"카페인 걱정 없이 즐기는 부드러운 한 잔. 곡물의 구수함과 은은한 단맛."},
  {id:7, brand:"L'OR", name:"Lungo Estremo", intensity:11, acidity:2, body:5, bitterness:4, notes:["woody","spicy"], caffeine:"regular", compat:["original"], price:920, desc:"룽고 컵에 맞춘 진하고 풍부한 바디. 묵직한 여운을 원할 때."},
  {id:8, brand:"illy", name:"Decaf", intensity:5, acidity:3, body:3, bitterness:2, notes:["floral","caramel"], caffeine:"decaf", compat:["original"], price:1120, desc:"디카페인이지만 풍미는 그대로. 꽃향과 카라멜의 부드러운 조화."},
  {id:9, brand:"Starbucks", name:"Blonde", intensity:4, acidity:5, body:2, bitterness:2, notes:["fruity","floral"], caffeine:"regular", compat:["original","vertuo"], price:980, desc:"밝고 산뜻한 산미가 돋보이는 라이트 로스트. 과일과 꽃의 상큼함."},
  {id:10, brand:"L'OR", name:"Onyx", intensity:13, acidity:1, body:5, bitterness:5, notes:["woody","cocoa"], caffeine:"regular", compat:["original"], price:1080, desc:"최대 강도의 묵직한 캡슐. 깊고 진한 다크 초콜릿 같은 풍미."}
]

export const noteLabels: Record<string, string> = {cocoa:"초콜릿",woody:"우디",fruity:"과일",floral:"꽃향",nutty:"고소",caramel:"카라멜",spicy:"스파이시",cereal:"곡물"}
export const noteIcons: Record<string, string> = {cocoa:"ti-candy",woody:"ti-trees",fruity:"ti-apple",floral:"ti-flower",nutty:"ti-seeding",caramel:"ti-honey",spicy:"ti-pepper",cereal:"ti-wheat"}

// 호환 머신 시스템 라벨(상세 화면 등 전체 명칭)
export const machineLabels: Record<MachineSystem, string> = {
  original: "네스프레소 오리지널",
  vertuo: "네스프레소 버츄오",
  dolcegusto: "돌체구스토",
}

// 필터 칩 등에 쓰는 짧은 라벨
export const machineLabelsShort: Record<MachineSystem, string> = {
  original: "오리지널",
  vertuo: "버츄오",
  dolcegusto: "돌체구스토",
}

// 필터/순회용 머신 목록
export const MACHINES: MachineSystem[] = ["original", "vertuo", "dolcegusto"]

export const won = (n: number): string => n.toLocaleString("ko-KR") + "원"

// 추천 점수 계산: 사용자 취향(p)과 캡슐(c)의 거리 기반
export function recScore(p: RecPrefs, c: Capsule): number {
  if (p.decaf && c.caffeine !== "decaf") return -Infinity
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
