import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import { noteLabels as NOTE_LABELS } from './data'
import type { Lang, MachineSystem } from './types'

// ── 호환 머신 라벨(언어별) ──
const MACHINE_LABELS: Record<Lang, Record<MachineSystem, string>> = {
  ko: { original: '네스프레소 오리지널', vertuo: '네스프레소 버츄오', dolcegusto: '돌체구스토', iperespresso: 'illy 이페르에스프레소', kanubarista: '카누 바리스타' },
  en: { original: 'Nespresso Original', vertuo: 'Nespresso Vertuo', dolcegusto: 'Dolce Gusto', iperespresso: 'illy iperEspresso', kanubarista: 'KANU Barista' },
}
// ── 브랜드 라벨(언어별). 매핑에 없으면 원래 이름 그대로 사용 ──
const BRAND_LABELS: Record<Lang, Record<string, string>> = {
  ko: { '카누': '카누', '폴바셋': '폴바셋', '할리스': '할리스' },
  en: { '카누': 'KANU', '폴바셋': 'Paul Bassett', '할리스': 'HOLLYS' },
}

const MACHINE_LABELS_SHORT: Record<Lang, Record<MachineSystem, string>> = {
  ko: { original: '오리지널', vertuo: '버츄오', dolcegusto: '돌체구스토', iperespresso: '이페르에스프레소', kanubarista: '카누 바리스타' },
  en: { original: 'Original', vertuo: 'Vertuo', dolcegusto: 'Dolce Gusto', iperespresso: 'iperEspresso', kanubarista: 'KANU Barista' },
}

// ── UI 문자열(언어별) ──
const UI = {
  ko: {
    tab_cat: '둘러보기', tab_rec: '추천', tab_fav: '찜', tab_my: '마이',
    cat_title: '캡슐 둘러보기', search_ph: '캡슐 이름 검색', brand_all: '전체', machine_all: '전체 머신',
    sort_intensity_desc: '진한 순', sort_intensity_asc: '연한 순', sort_price_asc: '저렴한 순', sort_price_desc: '비싼 순', sort_name: '이름순',
    empty_no_match: '조건에 맞는 캡슐이 없어요',
    rec_title: '오늘의 한 잔 찾기', rec_sub: '취향을 살짝 알려주면 딱 맞는 캡슐을 골라드려요',
    slider_intensity: '진하기', slider_acidity: '상큼함', slider_body: '묵직함',
    rec_notes_q: '어떤 향이 좋아요?', decaf_only: '디카페인만 볼래요', rec_header: '이건 어때요?', empty_relax: '조건에 맞는 캡슐이 없어요. 살짝 풀어볼까요?',
    fav_title: '찜한 캡슐', fav_sub: '마음에 둔 캡슐을 모아뒀어요', fav_empty1: '아직 찜한 캡슐이 없어요', fav_empty2: '마음에 드는 캡슐의 하트를 눌러보세요',
    my_title: '마이 페이지', my_sub: '내 취향과 기록을 한곳에',
    login_name: '송무송 님', login_sub: 'moosong@coffee.app · 카카오로 로그인됨', login_name2: '계정 관리 (준비 중)', login_sub2: '실제 앱에서는 프로필·로그아웃 메뉴가 열려요',
    settings_h: '설정', set_decaf: '디카페인 기본값', set_decaf_desc: '추천을 항상 디카페인으로 시작',
    set_dark: '다크 모드', set_dark_desc: '어두운 테마로 보기', set_intensity: '강도 표시', set_intensity_desc: '막대 또는 숫자로 표시',
    intensity_bar: '막대', intensity_num: '숫자', set_lang: '언어', set_lang_desc: '캡슐 이름·라벨 표시 언어', footer: 'capsuler · v0.1 프로토타입',
    decaf_label: '디카페인', compat_h: '호환 머신', notes_h: '향미 노트', similar_h: '비슷한 캡슐',
    per_capsule: '캡슐당', buy: '구매처 보기', stat_intensity: '강도', stat_acidity: '산미', stat_body: '바디', stat_bitter: '쓴맛',
    back_aria: '뒤로 가기', fav_aria: '찜하기',
    fav_pkg_h: '내 찜이 담긴 패키지', fav_pkg_sub: '찜한 캡슐이 많이 들어있는 세트예요', pkg_in_h: '이 캡슐이 든 패키지',
    seg_single: '단품', seg_package: '패키지', empty_no_pkg: '조건에 맞는 패키지가 없어요',
    pkg_contents_h: '구성 캡슐', pkg_price: '패키지 가격',
  },
  en: {
    tab_cat: 'Browse', tab_rec: 'Picks', tab_fav: 'Saved', tab_my: 'My',
    cat_title: 'Browse Capsules', search_ph: 'Search capsule name', brand_all: 'All', machine_all: 'All machines',
    sort_intensity_desc: 'Strongest', sort_intensity_asc: 'Mildest', sort_price_asc: 'Cheapest', sort_price_desc: 'Priciest', sort_name: 'Name',
    empty_no_match: 'No capsules match your filters',
    rec_title: 'Find your cup', rec_sub: 'Tell us your taste and we’ll pick the right capsule',
    slider_intensity: 'Intensity', slider_acidity: 'Acidity', slider_body: 'Body',
    rec_notes_q: 'Which aromas do you like?', decaf_only: 'Decaf only', rec_header: 'How about these?', empty_relax: 'Nothing matches. Try loosening the filters?',
    fav_title: 'Saved Capsules', fav_sub: 'The capsules you’ve bookmarked', fav_empty1: 'No saved capsules yet', fav_empty2: 'Tap the heart on capsules you like',
    my_title: 'My Page', my_sub: 'Your taste and history in one place',
    login_name: 'Moosong', login_sub: 'moosong@coffee.app · Signed in with Kakao', login_name2: 'Account (coming soon)', login_sub2: 'The real app opens profile & sign-out here',
    settings_h: 'Settings', set_decaf: 'Decaf by default', set_decaf_desc: 'Always start picks with decaf',
    set_dark: 'Dark mode', set_dark_desc: 'Use the dark theme', set_intensity: 'Intensity display', set_intensity_desc: 'Show as bars or a number',
    intensity_bar: 'Bars', intensity_num: 'Number', set_lang: 'Language', set_lang_desc: 'Language for capsule names & labels', footer: 'capsuler · v0.1 prototype',
    decaf_label: 'Decaf', compat_h: 'Compatible machines', notes_h: 'Aroma notes', similar_h: 'Similar capsules',
    per_capsule: 'Per capsule', buy: 'Where to buy', stat_intensity: 'Intensity', stat_acidity: 'Acidity', stat_body: 'Body', stat_bitter: 'Bitter',
    back_aria: 'Go back', fav_aria: 'Save',
    fav_pkg_h: 'Packages with your saved', fav_pkg_sub: 'Sets packed with capsules you saved', pkg_in_h: 'Packages with this capsule',
    seg_single: 'Singles', seg_package: 'Packages', empty_no_pkg: 'No packages match your filters',
    pkg_contents_h: "What's inside", pkg_price: 'Package price',
  },
} as const

export type UIKey = keyof typeof UI['ko']

export interface I18n {
  lang: Lang
  t: (key: UIKey) => string
  note: (key: string) => string
  machine: (key: MachineSystem, short?: boolean) => string
  brand: (name: string) => string
  name: (c: { name: string; nameKo: string }) => string
  price: (n: number) => string
  totalCount: (n: number) => string
  showing: (n: number) => string
  matchPct: (n: number) => string
  intensityWord: (n: number) => string
  pkgMatch: (n: number) => string
  pkgSize: (n: number) => string
}

function build(lang: Lang): I18n {
  return {
    lang,
    t: key => UI[lang][key],
    note: key => NOTE_LABELS[lang][key] ?? key,
    machine: (key, short) => (short ? MACHINE_LABELS_SHORT : MACHINE_LABELS)[lang][key],
    brand: name => BRAND_LABELS[lang][name] ?? name,
    name: c => (lang === 'ko' ? c.nameKo : c.name),
    price: n => (lang === 'ko' ? n.toLocaleString('ko-KR') + '원' : '₩' + n.toLocaleString('en-US')),
    totalCount: n => (lang === 'ko' ? `전체 ${n}개` : `${n} total`),
    showing: n => (lang === 'ko' ? `${n}개 표시 중` : `${n} shown`),
    matchPct: n => (lang === 'ko' ? `취향과 ${n}% 일치` : `${n}% match`),
    intensityWord: n => {
      const v = n === 0 ? '–' : n // 강도 미표기(0)는 대시로
      return lang === 'ko' ? `강도 ${v}` : `Intensity ${v}`
    },
    pkgMatch: n => (lang === 'ko' ? `내 찜 ${n}개 포함` : `Includes ${n} saved`),
    pkgSize: n => (lang === 'ko' ? `${n}종 구성` : `${n} kinds`),
  }
}

const I18nContext = createContext<I18n>(build('ko'))

export function I18nProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  return <I18nContext.Provider value={build(lang)}>{children}</I18nContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useI18n(): I18n {
  return useContext(I18nContext)
}
