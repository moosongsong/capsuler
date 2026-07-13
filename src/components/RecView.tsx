import { useEffect } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { capsules, noteIcons, recScore, recReasons } from '../data'
import { Switch, Empty } from './common'
import { useI18n } from '../i18n'
import type { UIKey } from '../i18n'
import type { RecState, MachineSystem } from '../types'

// 실제 API 향미 중 대표적인 것들을 취향 선택 칩으로 노출
const REC_NOTES = ['cocoa', 'woody', 'fruity', 'caramel', 'biscuity', 'berry']
type SliderKey = 'intensity' | 'acidity' | 'body' | 'bitterness'
const SLIDERS: { key: SliderKey; labelKey: UIKey; icon: string; min: number; max: number }[] = [
  { key: 'intensity', labelKey: 'slider_intensity', icon: 'ti-flame', min: 1, max: 13 },
  { key: 'acidity', labelKey: 'slider_acidity', icon: 'ti-lemon-2', min: 1, max: 5 },
  { key: 'body', labelKey: 'slider_body', icon: 'ti-droplet', min: 1, max: 5 },
  { key: 'bitterness', labelKey: 'slider_bitter', icon: 'ti-coffee', min: 1, max: 5 },
]
// 근거의 dim → 슬라이더 라벨 키 매핑
const DIM_LABEL: Record<'intensity' | 'acidity' | 'body' | 'bitterness', UIKey> = {
  intensity: 'slider_intensity', acidity: 'slider_acidity', body: 'slider_body', bitterness: 'slider_bitter',
}

interface RecViewProps {
  recState: RecState
  setRecState: Dispatch<SetStateAction<RecState>>
  decafDefault: boolean
  machines: MachineSystem[] // 보유 머신(비어 있으면 전체)
  onOpenDetail: (id: number, matchPct?: number) => void
}

export default function RecView({ recState, setRecState, decafDefault, machines, onOpenDetail }: RecViewProps) {
  const { t, note, name, brand, whyNotes, whyClose } = useI18n()

  // 추천 화면 진입 시 '디카페인 기본값' 설정이 켜져 있으면 디카페인만 보기 활성화
  useEffect(() => {
    if (decafDefault && !recState.decaf) setRecState(s => ({ ...s, decaf: true }))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const setField = (key: SliderKey | 'decaf', value: number | boolean) =>
    setRecState(s => ({ ...s, [key]: value }))

  const toggleNote = (n: string) => {
    setRecState(s => {
      const notes = new Set(s.notes)
      notes.has(n) ? notes.delete(n) : notes.add(n)
      return { ...s, notes }
    })
  }

  // 보유 머신이 지정돼 있으면 해당 머신 호환 캡슐만 추천 대상으로 삼는다
  const pool = machines.length
    ? capsules.filter(c => c.compat.some(m => machines.includes(m)))
    : capsules

  const ranked = pool
    .map(c => ({ c, s: recScore(recState, c) }))
    .filter(x => x.s > -Infinity)
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)

  return (
    <section className="view active" id="view-rec">
      <div className="header-cap">
        <div className="badge-round"><i className="ti ti-coffee" /></div>
        <p style={{ fontSize: 18, fontWeight: 600, color: 'var(--amber-600)' }}>{t('rec_title')}</p>
        <p style={{ fontSize: 13, color: 'var(--amber-600)', opacity: 0.8, marginTop: 4 }}>{t('rec_sub')}</p>
      </div>
      <div className="sheet">
        {SLIDERS.map(({ key, labelKey, icon, min, max }) => (
          <label className="field" key={key}>
            <div className="field-head">
              <span><i className={'ti ' + icon} /> {t(labelKey)}</span>
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

        <p className="section-label">{t('rec_notes_q')}</p>
        <div className="chips" style={{ marginBottom: 18 }}>
          {REC_NOTES.map(n => (
            <button
              key={n}
              className={'chip' + (recState.notes.has(n) ? ' on' : '')}
              onClick={() => toggleNote(n)}
            >
              <i className={'ti ' + noteIcons[n]} />{note(n)}
            </button>
          ))}
        </div>

        <div className="toggle-row" style={{ marginBottom: 22 }}>
          <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>
            <i className="ti ti-moon" /> {t('decaf_only')}
          </span>
          <Switch label={t('decaf_only')} on={recState.decaf} onClick={() => setField('decaf', !recState.decaf)} />
        </div>

        <div className="h-row"><i className="ti ti-sparkles" /> {t('rec_header')}</div>
        <div>
          {ranked.length === 0 ? (
            <Empty icon="ti-mood-empty">{t('empty_relax')}</Empty>
          ) : (
            ranked.map((x, i) => {
              const c = x.c
              const pct = Math.round(Math.max(0, Math.min(1, x.s)) * 100)
              const reasons = recReasons(recState, c).map(r =>
                r.kind === 'notes' ? whyNotes(r.notes.map(note)) : whyClose(t(DIM_LABEL[r.dim])),
              )
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
                        {name(c)}
                      </span>
                      <span className="rec-brand">{brand(c.brand)}</span>
                    </div>
                    <span className="pct">{pct}%</span>
                  </div>
                  {reasons.length > 0 && (
                    <div className="rec-why">
                      {reasons.map((r, j) => (
                        <span key={j} className="why-chip"><i className="ti ti-check" /> {r}</span>
                      ))}
                    </div>
                  )}
                  <div className="rec-stats">
                    <span><i className="ti ti-flame" /> {c.intensity}</span>
                    <span><i className="ti ti-lemon-2" /> {c.acidity}</span>
                    <span><i className="ti ti-droplet" /> {c.body}</span>
                    <span><i className="ti ti-coffee" /> {c.bitterness}</span>
                  </div>
                  <div className="rec-notes">
                    {c.notes.map(n => (
                      <span key={n} className={'tag-sm' + (recState.notes.has(n) ? ' match' : '')}>
                        {note(n)}
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
