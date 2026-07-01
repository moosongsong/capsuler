import { useState, useEffect } from 'react'
import RecView from './components/RecView'
import CatView from './components/CatView'
import FavView from './components/FavView'
import MyView from './components/MyView'
import DetailView from './components/DetailView'
import { I18nProvider, useI18n } from './i18n'
import type { RecState, CatState, Settings, Reviews, Review, TabName, ViewName } from './types'

const TABS: { tab: TabName; icon: string }[] = [
  { tab: 'cat', icon: 'ti-mug' },
  { tab: 'rec', icon: 'ti-sparkles' },
  { tab: 'fav', icon: 'ti-heart' },
  { tab: 'my', icon: 'ti-user' },
]

// 하단 탭바(I18nProvider 내부에서 렌더되어 언어 컨텍스트 사용 가능)
function TabBar({ view, onTab }: { view: ViewName; onTab: (t: TabName) => void }) {
  const { t } = useI18n()
  const label: Record<TabName, string> = { cat: t('tab_cat'), rec: t('tab_rec'), fav: t('tab_fav'), my: t('tab_my') }
  return (
    <nav className="tabbar">
      {TABS.map(item => (
        <button key={item.tab} className={'tab' + (view === item.tab ? ' on' : '')} onClick={() => onTab(item.tab)}>
          <i className={'ti ' + item.icon} />
          <span>{label[item.tab]}</span>
        </button>
      ))}
    </nav>
  )
}

export default function App() {
  const [view, setView] = useState<ViewName>('cat') // 처음 진입 시 둘러보기 화면
  const [lastTab, setLastTab] = useState<TabName>('cat')

  const [favorites, setFavorites] = useState<Set<number>>(() => new Set([7, 11]))
  const [reviews, setReviews] = useState<Reviews>({
    7: { rating: 5, text: '매일 아침 라떼로 내려 마시는데 코코아 향이 진하게 올라와서 만족스러워요. 우유랑 정말 잘 맞아요.' },
    2: { rating: 4, text: '생각보다 훨씬 강렬하다. 오후엔 좀 부담스럽고 아침에 잠 깰 때 딱이에요.' },
  })
  const [settings, setSettings] = useState<Settings>({ decafDefault: false, dark: false, intensityStyle: 'bar', lang: 'ko' })

  const [recState, setRecState] = useState<RecState>({ intensity: 9, acidity: 3, body: 4, notes: new Set(), decaf: false })
  const [catState, setCatState] = useState<CatState>({ brand: '전체', machine: 'all', notes: new Set(), search: '', sort: 'intensity-desc' })

  const [detail, setDetail] = useState<{ id: number | null; matchPct?: number }>({ id: null, matchPct: undefined })

  // 다크 모드 토글을 body에 반영
  useEffect(() => {
    document.body.classList.toggle('dark', settings.dark)
  }, [settings.dark])

  const goTab = (name: TabName) => {
    // 추천 탭 진입 시 디카페인 기본값 설정 적용(원본 동작)
    if (name === 'rec' && settings.decafDefault && !recState.decaf) {
      setRecState(s => ({ ...s, decaf: true }))
    }
    setLastTab(name)
    setView(name)
    document.querySelector('.scroll')?.scrollTo(0, 0)
  }

  const openDetail = (id: number, matchPct?: number) => {
    setDetail({ id, matchPct })
    setView('detail')
    document.querySelector('.scroll')?.scrollTo(0, 0)
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

  const isDetail = view === 'detail'

  return (
    <I18nProvider lang={settings.lang}>
      <div className="phone">
        <div className="screen-wrap">
          <div className="scroll">
            {view === 'rec' && (
              <RecView recState={recState} setRecState={setRecState} onOpenDetail={openDetail} />
            )}
            {view === 'cat' && (
              <CatView
                catState={catState}
                setCatState={setCatState}
                intensityStyle={settings.intensityStyle}
                onOpenDetail={openDetail}
              />
            )}
            {view === 'fav' && (
              <FavView favorites={favorites} intensityStyle={settings.intensityStyle} onOpenDetail={openDetail} />
            )}
            {view === 'my' && (
              <MyView
                favorites={favorites}
                reviews={reviews}
                settings={settings}
                setSettings={setSettings}
                onOpenDetail={openDetail}
              />
            )}
            {isDetail && detail.id != null && (
              <DetailView
                id={detail.id}
                matchPct={detail.matchPct}
                favorites={favorites}
                reviews={reviews}
                onToggleFav={toggleFav}
                onSaveReview={saveReview}
                onOpenDetail={openDetail}
                onBack={() => goTab(lastTab)}
              />
            )}
          </div>

          {!isDetail && <TabBar view={view} onTab={goTab} />}
        </div>
      </div>
    </I18nProvider>
  )
}
