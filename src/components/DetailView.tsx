import { useState, useEffect, useRef } from 'react'
import { capsules, noteLabels, noteIcons, machineLabels, won, similar } from '../data'
import type { Reviews, Review } from '../types'

interface DetailViewProps {
  id: number
  matchPct?: number
  favorites: Set<number>
  reviews: Reviews
  onToggleFav: (id: number) => void
  onSaveReview: (id: number, review: Review) => void
  onOpenDetail: (id: number) => void
  onBack: () => void
}

export default function DetailView({
  id,
  matchPct,
  favorites,
  reviews,
  onToggleFav,
  onSaveReview,
  onOpenDetail,
  onBack,
}: DetailViewProps) {
  const c = capsules.find(x => x.id === id)
  const existing = reviews[id]

  const [rating, setRating] = useState(existing ? existing.rating : 0)
  const [text, setText] = useState(existing ? existing.text : '')
  const [savedNote, setSavedNote] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout>>()

  // 다른 캡슐(비슷한 캡슐 클릭 등)로 전환되면 후기 입력 상태를 다시 채움
  useEffect(() => {
    const r = reviews[id]
    setRating(r ? r.rating : 0)
    setText(r ? r.text : '')
    setSavedNote(false)
    document.querySelector('.scroll')?.scrollTo(0, 0)
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimeout(timerRef.current), [])

  if (!c) return null

  const handleSave = () => {
    const trimmed = text.trim()
    if (rating === 0 && !trimmed) return
    onSaveReview(id, { rating: rating || 0, text: trimmed })
    setSavedNote(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setSavedNote(false), 2400)
  }

  const isFav = favorites.has(id)

  return (
    <section className="view active" id="view-detail">
      <div className="d-top">
        <button className="icon-btn" aria-label="뒤로 가기" onClick={onBack}>
          <i className="ti ti-arrow-left" />
        </button>
        <button className={'icon-btn d-fav' + (isFav ? ' on' : '')} aria-label="찜하기" onClick={() => onToggleFav(id)}>
          <i className="ti ti-heart" />
        </button>
      </div>

      <div className="d-hero">
        <div className="big"><i className="ti ti-coffee" /></div>
        {matchPct ? (
          <div className="match-badge"><i className="ti ti-sparkles" /> 취향과 {matchPct}% 일치</div>
        ) : null}
        <p className="d-name">{c.name}</p>
        <p className="d-brand">{c.brand}{c.caffeine === 'decaf' ? ' · 디카페인' : ''}</p>
      </div>

      <div className="sheet">
        <div className="stat-row">
          <div className="stat hi"><div className="k">강도</div><div className="v">{c.intensity}<small>/13</small></div></div>
          <div className="stat"><div className="k">산미</div><div className="v">{c.acidity}<small>/5</small></div></div>
          <div className="stat"><div className="k">바디</div><div className="v">{c.body}<small>/5</small></div></div>
          <div className="stat"><div className="k">쓴맛</div><div className="v">{c.bitterness}<small>/5</small></div></div>
        </div>

        <p className="section-label">호환 머신</p>
        <div className="chips" style={{ marginBottom: 20 }}>
          {c.compat.map(m => (
            <span key={m} className="chip on" style={{ cursor: 'default' }}>
              <i className="ti ti-puzzle" />{machineLabels[m]}
            </span>
          ))}
        </div>

        <p className="section-label">향미 노트</p>
        <div className="chips" style={{ marginBottom: 20 }}>
          {c.notes.map(n => (
            <span key={n} className="chip on" style={{ cursor: 'default' }}>
              <i className={'ti ' + noteIcons[n]} />{noteLabels[n]}
            </span>
          ))}
        </div>

        <div className="desc">{c.desc}</div>

        <div className="h-row"><i className="ti ti-message-circle-2" /> 내 후기</div>
        <div className="review-box">
          <div className="stars">
            {[1, 2, 3, 4, 5].map(v => (
              <i
                key={v}
                className={'ti ti-star-filled' + (v <= rating ? ' on' : '')}
                onClick={() => setRating(v)}
              />
            ))}
          </div>
          <textarea
            rows={2}
            placeholder="마셔본 느낌을 한 줄 남겨보세요"
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <button className="review-save" onClick={handleSave}>후기 저장</button>
          {savedNote && (
            <div className="saved-note">후기를 저장했어요. 마이 페이지에서 다시 볼 수 있어요.</div>
          )}
        </div>

        <div className="h-row"><i className="ti ti-flame" /> 비슷한 캡슐</div>
        <div style={{ marginBottom: 20 }}>
          {similar(c).map(s => (
            <div key={s.id} className="sim-item" onClick={() => onOpenDetail(s.id)}>
              <div className="cat-ava" style={{ width: 32, height: 32 }}>
                <i className="ti ti-coffee" style={{ fontSize: 16 }} />
              </div>
              <div className="cat-meta">
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {s.name} <span style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 400 }}>{s.brand}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>
                  강도 {s.intensity} · {s.notes.map(n => noteLabels[n]).join(', ')}
                </div>
              </div>
              <i className="ti ti-chevron-right" style={{ fontSize: 16, color: 'var(--ink-3)' }} />
            </div>
          ))}
        </div>

        <div className="buy-row">
          <div className="buy-price"><div className="k">캡슐당</div><div className="v">{won(c.price)}</div></div>
          <button className="buy-btn"><i className="ti ti-shopping-cart" /> 구매처 보기</button>
        </div>
      </div>
    </section>
  )
}
