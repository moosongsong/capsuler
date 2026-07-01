import { useState, useEffect, useRef } from 'react'
import { capsules, noteIcons, similar, buyUrlFor } from '../data'
import { AvatarInner } from './common'
import { useI18n } from '../i18n'
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
  const { t, note, machine, name, price, matchPct: fmtMatch, intensityWord, brand } = useI18n()
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
        <button className="icon-btn" aria-label={t('back_aria')} onClick={onBack}>
          <i className="ti ti-arrow-left" />
        </button>
        <button className={'icon-btn d-fav' + (isFav ? ' on' : '')} aria-label={t('fav_aria')} onClick={() => onToggleFav(id)}>
          <i className="ti ti-heart" />
        </button>
      </div>

      <div className="d-hero">
        <div className="big"><AvatarInner url={c.image} /></div>
        {matchPct ? (
          <div className="match-badge"><i className="ti ti-sparkles" /> {fmtMatch(matchPct)}</div>
        ) : null}
        <p className="d-name">{name(c)}</p>
        <p className="d-brand">{brand(c.brand)}{c.caffeine === 'decaf' ? ` · ${t('decaf_label')}` : ''}</p>
      </div>

      <div className="sheet">
        <div className="stat-row">
          <div className="stat hi"><div className="k">{t('stat_intensity')}</div><div className="v">{c.intensity === 0 ? '–' : <>{c.intensity}<small>/13</small></>}</div></div>
          <div className="stat"><div className="k">{t('stat_acidity')}</div><div className="v">{c.acidity}<small>/5</small></div></div>
          <div className="stat"><div className="k">{t('stat_body')}</div><div className="v">{c.body}<small>/5</small></div></div>
          <div className="stat"><div className="k">{t('stat_bitter')}</div><div className="v">{c.bitterness}<small>/5</small></div></div>
        </div>

        <p className="section-label">{t('compat_h')}</p>
        <div className="chips" style={{ marginBottom: 20 }}>
          {c.compat.map(m => (
            <span key={m} className="chip on" style={{ cursor: 'default' }}>
              <i className="ti ti-puzzle" />{machine(m)}
            </span>
          ))}
        </div>

        <p className="section-label">{t('notes_h')}</p>
        <div className="chips" style={{ marginBottom: 20 }}>
          {c.notes.map(n => (
            <span key={n} className="chip on" style={{ cursor: 'default' }}>
              <i className={'ti ' + noteIcons[n]} />{note(n)}
            </span>
          ))}
        </div>

        <div className="desc">{c.desc}</div>

        <div className="h-row"><i className="ti ti-message-circle-2" /> {t('review_h')}</div>
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
            placeholder={t('review_ph')}
            value={text}
            onChange={e => setText(e.target.value)}
          />
          <button className="review-save" onClick={handleSave}>{t('review_save')}</button>
          {savedNote && <div className="saved-note">{t('review_saved')}</div>}
        </div>

        <div className="h-row"><i className="ti ti-flame" /> {t('similar_h')}</div>
        <div style={{ marginBottom: 20 }}>
          {similar(c).map(s => (
            <div key={s.id} className="sim-item" onClick={() => onOpenDetail(s.id)}>
              <div className="cat-ava" style={{ width: 32, height: 32 }}>
                <AvatarInner url={s.image} />
              </div>
              <div className="cat-meta">
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {name(s)} <span style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 400 }}>{brand(s.brand)}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>
                  {intensityWord(s.intensity)} · {s.notes.map(n => note(n)).join(', ')}
                </div>
              </div>
              <i className="ti ti-chevron-right" style={{ fontSize: 16, color: 'var(--ink-3)' }} />
            </div>
          ))}
        </div>

        <div className="buy-row">
          <div className="buy-price"><div className="k">{t('per_capsule')}</div><div className="v">{price(c.price)}</div></div>
          <a className="buy-btn" href={buyUrlFor(c)} target="_blank" rel="noopener noreferrer">
            <i className="ti ti-shopping-cart" /> {t('buy')}
          </a>
        </div>
      </div>
    </section>
  )
}
