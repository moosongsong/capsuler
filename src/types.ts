// 앱 전반에서 공유하는 타입 정의

export type Caffeine = 'regular' | 'decaf'

// 지원 언어
export type Lang = 'ko' | 'en'

// 캡슐이 호환되는 커피 머신 시스템
export type MachineSystem = 'original' | 'vertuo' | 'dolcegusto' | 'iperespresso' | 'kanubarista'

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
  buyUrl?: string // 구매 페이지(없으면 머신 카테고리로 폴백)
  image?: string // 상품 이미지 URL(없거나 로드 실패 시 커피 아이콘으로 폴백)
  isEnabled?: boolean // false면 단종 처리(공개 목록에서 제외). 미지정=공개
}

// 패키지(여러 단일 캡슐을 묶은 어소트먼트/세트 상품)
export interface PackageItem {
  id: number // 구성 캡슐(Capsule.id) 참조
  qty: number // 패키지에 담긴 수량
}

export interface Package {
  id: number
  brand: string
  name: string   // 영문 이름
  nameKo: string // 한글 이름
  compat: MachineSystem[]
  price: number  // 패키지 전체 가격
  image?: string
  buyUrl?: string
  items: PackageItem[] // 구성 캡슐
  isEnabled?: boolean
}

// 찜 캡슐과의 겹침 기준으로 계산한 패키지 추천 결과
export interface PackageMatch {
  pkg: Package
  matchIds: number[] // 내 찜과 겹친 구성 캡슐 id
  matchCount: number // 겹친 개수(절대)
  coveragePkg: number // matchCount / 패키지 구성 수 (패키지가 얼마나 내 취향인지)
  coverageFav: number // matchCount / 내 찜 수 (내 찜을 얼마나 담는지)
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
  mode: 'single' | 'package' // 단품 캡슐 / 패키지(세트) 보기
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

export type TabName = 'cat' | 'rec' | 'fav' | 'my'
export type ViewName = TabName | 'detail'
