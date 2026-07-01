import type { Dispatch, SetStateAction } from 'react'
import { capsules, noteLabels, noteIcons, recScore } from '../data'
import { Switch, Empty } from './common'
import type { RecState } from '../types'

const REC_NOTES = ['cocoa', 'woody', 'fruity', 'floral', 'nutty', 'caramel']
const SLIDERS: { key: 'intensity' | 'acidity' | 'body'; label: string; icon: string; min: number; max: number }[] = [
  { key: 'intensity', label: '진하기', icon: 'ti-flame', min: 1, max: 13 },
  { key: 'acidity', label: '상큼함', icon: 'ti-lemon-2', min: 1, max: 5 },
  { key: 'body', label: '묵직함', icon: 'ti-droplet', min: 1, max: 5 },
]

interface RecViewProps {
  recState: RecState
  setRecState: Dispatch<SetStateAction<RecState>>
  onOpenDetail: (id: number, matchPct?: number) => void
}

export default function RecView({ recState, setRecState, onOpenDetail }: RecViewProps) {
  const setField = (key: 'intensity' | 'acidity' | 'body' | 'decaf', value: number | boolean) =>
    setRecState(s => ({ ...s, [key]: value }))

  const toggleNote = (n: string) => {
    setRecState(s => {
      const notes = new Set(s.notes)
      notes.has(n) ? notes.delete(n) : notes.add(n)
      return { ...s, notes }
    })
  }

  const ranked = capsules
    .map(c => ({ c, s: recScore(recState, c) }))
    .filter(x => x.s > -Infinity)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)

  return (
    <section className="view active" id="view-rec">
      <div className="header-cap">
        <div className="badge-round"><i className="ti ti-coffee" /></div>
        <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--amber-600)' }}>오늘의 한 잔 찾기</p>
        <p style={{ fontSize: 13, color: 'var(--amber-600)', opacity: 0.8, marginTop: 4 }}>
          취향을 살짝 알려주면 딱 맞는 캡슐을 골라드려요
        </p>
      </div>
      <div className="sheet">
        {SLIDERS.map(({ key, label, icon, min, max }) => (
          <label className="field" key={key}>
            <div className="field-head">
              <span><i className={'ti ' + icon} /> {label}</span>
              <span className="val">{recState[key]}</span>
            </div>
            <input
              type="range"
              min={min}
              max={max}
              step="1"
              value={recState[key]}
              onChange={e => setField(key, +e.target.value)}
            />
          </label>
        ))}

        <p className="section-label">어떤 향이 좋아요?</p>
        <div className="chips" style={{ marginBottom: 18 }}>
          {REC_NOTES.map(n => (
            <button
              key={n}
              className={'chip' + (recState.notes.has(n) ? ' on' : '')}
              onClick={() => toggleNote(n)}
            >
              <i className={'ti ' + noteIcons[n]} />{noteLabels[n]}
            </button>
          ))}
        </div>

        <div className="toggle-row" style={{ marginBottom: 22 }}>
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>
            <i className="ti ti-moon" /> 디카페인만 볼래요
          </span>
          <Switch on={recState.decaf} onClick={() => setField('decaf', !recState.decaf)} />
        </div>

        <div className="h-row"><i className="ti ti-sparkles" /> 이건 어때요?</div>
        <div>
          {ranked.length === 0 ? (
            <Empty icon="ti-mood-empty">조건에 맞는 캡슐이 없어요. 살짝 풀어볼까요?</Empty>
          ) : (
            ranked.map((x, i) => {
              const c = x.c
              const pct = Math.round(Math.max(0, Math.min(1, x.s)) * 100)
              return (
                <div
                  key={c.id}
                  className={'rec-card' + (i === 0 ? ' top' : '')}
                  style={{ marginBottom: 10, cursor: 'pointer' }}
                  onClick={() => onOpenDetail(c.id, pct)}
                >
                  <div className="rec-top">
                    <div>
                      <span className="rec-name">
                        {i === 0 && <><i className="ti ti-crown" style={{ color: 'var(--amber-400)', fontSize: 14 }} /> </>}
                        {c.name}
                      </span>
                      <span className="rec-brand">{c.brand}</span>
                    </div>
                    <span className="pct">{pct}%</span>
                  </div>
                  <div className="rec-stats">
                    <span><i className="ti ti-flame" /> {c.intensity}</span>
                    <span><i className="ti ti-lemon-2" /> {c.acidity}</span>
                    <span><i className="ti ti-droplet" /> {c.body}</span>
                  </div>
                  <div className="rec-notes">
                    {c.notes.map(n => (
                      <span key={n} className={'tag-sm' + (recState.notes.has(n) ? ' match' : '')}>
                        {noteLabels[n]}
                      </span>
                    ))}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}
