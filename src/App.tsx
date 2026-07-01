import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, Navigate, NavLink, useLocation, useNavigate, useParams } from 'react-router-dom'
import RecView from './components/RecView'
import CatView from './components/CatView'
import FavView from './components/FavView'
import MyView from './components/MyView'
import DetailView from './components/DetailView'
import { I18nProvider, useI18n } from './i18n'
import type { RecState, CatState, Settings, Reviews, Review } from './types'

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
  if (pathname.startsWith('/capsule')) return null
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
  reviews: Reviews
  onToggleFav: (id: number) => void
  onSaveReview: (id: number, r: Review) => void
  onOpenDetail: (id: number, matchPct?: number) => void
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
      reviews={props.reviews}
      onToggleFav={props.onToggleFav}
      onSaveReview={props.onSaveReview}
      onOpenDetail={props.onOpenDetail}
      onBack={() => navigate(-1)}
    />
  )
}

// 라우터 내부 셸: 상태 보관 + 라우트 렌더
function AppShell() {
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const [favorites, setFavorites] = useState<Set<number>>(() => new Set([1007, 1011]))
  const [reviews, setReviews] = useState<Reviews>({
    1007: { rating: 5, text: '매일 아침 라떼로 내려 마시는데 코코아 향이 진하게 올라와서 만족스러워요. 우유랑 정말 잘 맞아요.' },
    1002: { rating: 4, text: '생각보다 훨씬 강렬하다. 오후엔 좀 부담스럽고 아침에 잠 깰 때 딱이에요.' },
  })
  const [settings, setSettings] = useState<Settings>({ decafDefault: false, dark: false, intensityStyle: 'bar', lang: 'ko' })
  const [recState, setRecState] = useState<RecState>({ intensity: 9, acidity: 3, body: 4, notes: new Set(), decaf: false })
  const [catState, setCatState] = useState<CatState>({ brand: '전체', machine: 'all', notes: new Set(), search: '', sort: 'intensity-desc' })

  // 다크 모드 반영
  useEffect(() => {
    document.body.classList.toggle('dark', settings.dark)
  }, [settings.dark])

  // 라우트 전환 시 스크롤 최상단
  useEffect(() => {
    document.querySelector('.scroll')?.scrollTo(0, 0)
  }, [pathname])

  const openDetail = (id: number, matchPct?: number) => {
    navigate(`/capsule/${id}`, { state: { matchPct } })
  }

  const toggleFav = (id: number) => {
    setFavorites(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const saveReview = (id: number, review: Review) => {
    setReviews(prev => ({ ...prev, [id]: review }))
  }

  return (
    <I18nProvider lang={settings.lang}>
      <div className="phone">
        <div className="screen-wrap">
          <div className="scroll">
            <Routes>
              <Route index element={<Navigate to="/browse" replace />} />
              <Route path="/browse" element={<CatView catState={catState} setCatState={setCatState} intensityStyle={settings.intensityStyle} onOpenDetail={openDetail} />} />
              <Route path="/recommend" element={<RecView recState={recState} setRecState={setRecState} decafDefault={settings.decafDefault} onOpenDetail={openDetail} />} />
              <Route path="/saved" element={<FavView favorites={favorites} intensityStyle={settings.intensityStyle} onOpenDetail={openDetail} />} />
              <Route path="/my" element={<MyView favorites={favorites} reviews={reviews} settings={settings} setSettings={setSettings} onOpenDetail={openDetail} />} />
              <Route
                path="/capsule/:id"
                element={<DetailRoute favorites={favorites} reviews={reviews} onToggleFav={toggleFav} onSaveReview={saveReview} onOpenDetail={openDetail} />}
              />
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
  return (
    <HashRouter>
      <AppShell />
    </HashRouter>
  )
}
