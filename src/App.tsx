import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate, NavLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import RecView from './components/RecView'
import CatView from './components/CatView'
import FavView from './components/FavView'
import MyView from './components/MyView'
import DetailView from './components/DetailView'
import PackageDetailView from './components/PackageDetailView'
import { capsules } from './data'
import { I18nProvider, useI18n } from './i18n'
import type { RecState, CatState, Settings } from './types'

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
  const [settings, setSettings] = useState<Settings>({ decafDefault: false, dark: false, intensityStyle: 'bar', lang: 'ko' })
  const [recState, setRecState] = useState<RecState>({ intensity: 9, acidity: 3, body: 4, notes: new Set(), decaf: false })
  const [catState, setCatState] = useState<CatState>({ mode: 'single', brand: '전체', machine: 'all', notes: new Set(), search: '', sort: 'intensity-desc' })

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
              <Route path="/browse" element={<CatView catState={catState} setCatState={setCatState} intensityStyle={settings.intensityStyle} onOpenDetail={openDetail} onOpenPackage={openPackage} />} />
              <Route path="/recommend" element={<RecView recState={recState} setRecState={setRecState} decafDefault={settings.decafDefault} onOpenDetail={openDetail} />} />
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
