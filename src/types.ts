// 앱 전반에서 공유하는 타입 정의

export type Caffeine = 'regular' | 'decaf'

// 지원 언어
export type Lang = 'ko' | 'en'

// 캡슐이 호환되는 커피 머신 시스템
export type MachineSystem = 'original' | 'vertuo' | 'dolcegusto' | 'iperespresso'

export interface Capsule {
  id: number
  brand: string
  name: string   // 영문 이름
  nameKo: string // 한글 이름
  intensity: number
  acidity: number
  body: number
  bitterness: number
  notes: string[]
  caffeine: Caffeine
  compat: MachineSystem[] // 호환 머신(여러 개 가능)
  price: number
  desc: string
}

// 추천 점수 계산에 필요한 사용자 취향
export interface RecPrefs {
  intensity: number
  acidity: number
  body: number
  notes: Set<string>
  decaf: boolean
}

export type RecState = RecPrefs

export type SortKey = 'intensity-desc' | 'intensity-asc' | 'price-asc' | 'price-desc' | 'name'

export interface CatState {
  brand: string
  machine: 'all' | MachineSystem
  notes: Set<string>
  search: string
  sort: SortKey
}

export type IntensityStyle = 'bar' | 'num'

export interface Settings {
  decafDefault: boolean
  dark: boolean
  intensityStyle: IntensityStyle
  lang: Lang
}

export interface Review {
  rating: number
  text: string
}

export type Reviews = Record<number, Review>

export type TabName = 'cat' | 'rec' | 'fav' | 'my'
export type ViewName = TabName | 'detail'
