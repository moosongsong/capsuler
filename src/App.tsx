import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import RecView from './components/RecView'
import CatView from './components/CatView'
import FavView from './components/FavView'
import MyView from './components/MyView'
import DetailView from './components/DetailView'
import PackageDetailView from './components/PackageDetailView'
import { capsules, MACHINES } from './data'
import { I18nProvider, useI18n } from './i18n'
import type { RecState, CatState, Settings, MachineSystem, SortKey } from './types'

// ── 찜 목록 localStorage 영속화 ──
const FAV_KEY = 'capsuler:favorites'
const validIds = new Set(capsules.map(c => c.id))

// 저장된 찜을 읽어온다(손상/미존재 id는 걸러냄). 최초 방문 시 데모용 기본값.
function loadFavorites(): Set<number> {
  try {
    const raw = localStorage.getItem(FAV_KEY)
    if (raw !== null) {
      const ids = (JSON.parse(raw) as unknown[]).filter(
        (n): n is number => typeof n === 'number' && validIds.has(n),
      )
      return new Set(ids)
    }
  } catch {
    // 손상된 값은 무시하고 빈 목록 사용
  }
  return new Set()
}

// ── 설정 localStorage 영속화 (다크 모드·언어·머신 등) ──
const SETTINGS_KEY = 'capsuler:settings'
const DEFAULT_SETTINGS: Settings = { decafDefault: false, dark: false, intensityStyle: 'bar', lang: 'ko', machines: [] }
const validMachines = new Set<MachineSystem>(MACHINES)

// 저장된 설정을 읽어와 기본값과 병합한다(누락/손상 필드는 기본값으로 폴백).
function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY)
    if (raw !== null) {
      const s = JSON.parse(raw) as Partial<Settings>
      return {
        decafDefault: typeof s.decafDefault === 'boolean' ? s.decafDefault : DEFAULT_SETTINGS.decafDefault,
        dark: typeof s.dark === 'boolean' ? s.dark : DEFAULT_SETTINGS.dark,
        intensityStyle: s.intensityStyle === 'bar' || s.intensityStyle === 'num' ? s.intensityStyle : DEFAULT_SETTINGS.intensityStyle,
        lang: s.lang === 'ko' || s.lang === 'en' ? s.lang : DEFAULT_SETTINGS.lang,
        machines: Array.isArray(s.machines) ? s.machines.filter((m): m is MachineSystem => validMachines.has(m as MachineSystem)) : [],
      }
    }
  } catch {
    // 손상된 값은 무시하고 기본 설정 사용
  }
  return DEFAULT_SETTINGS
}

// ── 추천/둘러보기 상태 localStorage 영속화 ──
const REC_KEY = 'capsuler:rec'
const CAT_KEY = 'capsuler:cat'
const DEFAULT_REC: RecState = { intensity: 9, acidity: 3, body: 4, bitterness: 3, notes: new Set(), decaf: false }
const DEFAULT_CAT: CatState = { mode: 'single', brand: '전체', machine: 'all', notes: new Set(), search: '', sort: 'intensity-desc' }
const SORT_KEYS = new Set<SortKey>(['intensity-desc', 'intensity-asc', 'price-asc', 'price-desc', 'name'])

// 범위 검증된 숫자, 문자열 Set 복원 헬퍼
const clampNum = (v: unknown, def: number, min: number, max: number): number =>
  typeof v === 'number' && v >= min && v <= max ? v : def
const toStrSet = (v: unknown): Set<string> =>
  new Set(Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string') : [])

function loadRecState(): RecState {
  try {
    const raw = localStorage.getItem(REC_KEY)
    if (raw !== null) {
      const s = JSON.parse(raw) as Record<string, unknown>
      return {
        intensity: clampNum(s.intensity, DEFAULT_REC.intensity, 1, 13),
        acidity: clampNum(s.acidity, DEFAULT_REC.acidity, 1, 5),
        body: clampNum(s.body, DEFAULT_REC.body, 1, 5),
        bitterness: clampNum(s.bitterness, DEFAULT_REC.bitterness, 1, 5),
        notes: toStrSet(s.notes),
        decaf: typeof s.decaf === 'boolean' ? s.decaf : false,
      }
    }
  } catch {
    // 손상된 값은 무시
  }
  return DEFAULT_REC
}

function loadCatState(): CatState {
  try {
    const raw = localStorage.getItem(CAT_KEY)
    if (raw !== null) {
      const s = JSON.parse(raw) as Record<string, unknown>
      return {
        mode: s.mode === 'package' ? 'package' : 'single',
        brand: typeof s.brand === 'string' ? s.brand : DEFAULT_CAT.brand,
        machine: s.machine === 'all' || validMachines.has(s.machine as MachineSystem) ? (s.machine as CatState['machine']) : 'all',
        notes: toStrSet(s.notes),
        search: '', // 검색어는 세션마다 초기화(재방문 시 이전 검색 유지 방지)
        sort: SORT_KEYS.has(s.sort as SortKey) ? (s.sort as SortKey) : DEFAULT_CAT.sort,
      }
    }
  } catch {
    // 손상된 값은 무시
  }
  return DEFAULT_CAT
}

const TABS: { to: string; icon: string; key: 'tab_cat' | 'tab_rec' | 'tab_fav' | 'tab_my' }[] = [
  { to: '/browse', icon: 'ti-mug', key: 'tab_cat' },
  { to: '/recommend', icon: 'ti-sparkles', key: 'tab_rec' },
  { to: '/saved', icon: 'ti-heart', key: 'tab_fav' },
  { to: '/my', icon: 'ti-user', key: 'tab_my' },
]

// 하단 탭바(상세 화면에선 숨김)
function TabBar() {
  const { t } = useI18n()
  const { pathname } = useLocation()
  if (pathname.startsWith('/capsule') || pathname.startsWith('/package')) return null
  return (
    <nav className="tabbar">
      {TABS.map(item => (
        <NavLink key={item.to} to={item.to} className={({ isActive }) => 'tab' + (isActive ? ' on' : '')}>
          <i className={'ti ' + item.icon} />
          <span>{t(item.key)}</span>
        </NavLink>
      ))}
    </nav>
  )
}

// /capsule/:id 라우트 래퍼 (URL에서 id, 히스토리 state에서 matchPct 획득)
function DetailRoute(props: {
  favorites: Set<number>
  onToggleFav: (id: number) => void
  onOpenDetail: (id: number, matchPct?: number) => void
  onOpenPackage: (id: number) => void
}) {
  const { id } = useParams()
  const location = useLocation()
  const navigate = useNavigate()
  const capId = Number(id)
  const matchPct = (location.state as { matchPct?: number } | null)?.matchPct
  return (
    <DetailView
      id={capId}
      matchPct={matchPct}
      favorites={props.favorites}
      onToggleFav={props.onToggleFav}
      onOpenDetail={props.onOpenDetail}
      onOpenPackage={props.onOpenPackage}
      onBack={() => navigate(-1)}
    />
  )
}

// /package/:id 라우트 래퍼
function PackageDetailRoute({ onOpenDetail }: { onOpenDetail: (id: number) => void }) {
  const { id } = useParams()
  const navigate = useNavigate()
  return <PackageDetailView id={Number(id)} onOpenDetail={onOpenDetail} onBack={() => navigate(-1)} />
}

// 라우터 내부 셸: 상태 보관 + 라우트 렌더
function AppShell() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const [favorites, setFavorites] = useState<Set<number>>(loadFavorites)
  const [settings, setSettings] = useState<Settings>(loadSettings)
  const [recState, setRecState] = useState<RecState>(loadRecState)
  const [catState, setCatState] = useState<CatState>(loadCatState)

  // 다크 모드 반영
  useEffect(() => {
    document.body.classList.toggle('dark', settings.dark)
  }, [settings.dark])

  // 찜 목록이 바뀔 때마다 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem(FAV_KEY, JSON.stringify([...favorites]))
    } catch {
      // 저장 실패(용량 초과 등)는 무시
    }
  }, [favorites])

  // 설정이 바뀔 때마다 localStorage에 저장
  useEffect(() => {
    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings))
    } catch {
      // 저장 실패(용량 초과 등)는 무시
    }
  }, [settings])

  // 추천 취향(recState)·둘러보기 필터(catState) 저장. notes는 Set이라 배열로 직렬화.
  useEffect(() => {
    try {
      localStorage.setItem(REC_KEY, JSON.stringify({ ...recState, notes: [...recState.notes] }))
    } catch {
      // 저장 실패는 무시
    }
  }, [recState])

  useEffect(() => {
    try {
      localStorage.setItem(CAT_KEY, JSON.stringify({ ...catState, notes: [...catState.notes] }))
    } catch {
      // 저장 실패는 무시
    }
  }, [catState])

  // 라우트 전환 시 스크롤 최상단
  useEffect(() => {
    document.querySelector('.scroll')?.scrollTo(0, 0)
  }, [pathname])

  const openDetail = (id: number, matchPct?: number) => {
    navigate(`/capsule/${id}`, { state: { matchPct } })
  }

  const openPackage = (id: number) => {
    navigate(`/package/${id}`)
  }

  const toggleFav = (id: number) => {
    setFavorites(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  return (
    <I18nProvider lang={settings.lang}>
      <div className="phone">
        <div className="screen-wrap">
          <div className="scroll">
            <Routes>
              <Route index element={<Navigate to="/browse" replace />} />
              <Route path="/browse" element={<CatView catState={catState} setCatState={setCatState} intensityStyle={settings.intensityStyle} ownedMachines={settings.machines} onOpenDetail={openDetail} onOpenPackage={openPackage} />} />
              <Route path="/recommend" element={<RecView recState={recState} setRecState={setRecState} decafDefault={settings.decafDefault} machines={settings.machines} onOpenDetail={openDetail} />} />
              <Route path="/saved" element={<FavView favorites={favorites} intensityStyle={settings.intensityStyle} onOpenDetail={openDetail} onOpenPackage={openPackage} />} />
              <Route path="/my" element={<MyView settings={settings} setSettings={setSettings} />} />
              <Route
                path="/capsule/:id"
                element={<DetailRoute favorites={favorites} onToggleFav={toggleFav} onOpenDetail={openDetail} onOpenPackage={openPackage} />}
              />
              <Route path="/package/:id" element={<PackageDetailRoute onOpenDetail={openDetail} />} />
              <Route path="*" element={<Navigate to="/browse" replace />} />
            </Routes>
          </div>
          <TabBar />
        </div>
      </div>
    </I18nProvider>
  )
}

export default function App() {
  // basename은 vite base(/capsuler/)와 일치시켜 GitHub Pages 프로젝트 경로에서 동작하게 한다
  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <AppShell />
    </BrowserRouter>
  )
}
