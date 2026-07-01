import type { Dispatch, SetStateAction } from 'react'
import { capsules, MACHINES } from '../data'
import { CapsuleItem, Empty } from './common'
import { useI18n } from '../i18n'
import type { UIKey } from '../i18n'
import type { CatState, IntensityStyle, SortKey } from '../types'

// 실제 API 향미 중 자주 등장하는 것들을 필터 칩으로 노출
const CAT_NOTES = ['cereal', 'woody', 'cocoa', 'biscuity', 'berry', 'caramel', 'spicy', 'fruity']
const SORT_OPTIONS: { value: SortKey; labelKey: UIKey }[] = [
  { value: 'intensity-desc', labelKey: 'sort_intensity_desc' },
  { value: 'intensity-asc', labelKey: 'sort_intensity_asc' },
  { value: 'price-asc', labelKey: 'sort_price_asc' },
  { value: 'price-desc', labelKey: 'sort_price_desc' },
  { value: 'name', labelKey: 'sort_name' },
]

interface CatViewProps {
  catState: CatState
  setCatState: Dispatch<SetStateAction<CatState>>
  intensityStyle: IntensityStyle
  onOpenDetail: (id: number) => void
}

export default function CatView({ catState, setCatState, intensityStyle, onOpenDetail }: CatViewProps) {
  const { t, note, machine, brand, totalCount, showing } = useI18n()
  const brands = ['전체', ...new Set(capsules.map(c => c.brand))]

  const toggleNote = (n: string) => {
    setCatState(s => {
      const notes = new Set(s.notes)
      notes.has(n) ? notes.delete(n) : notes.add(n)
      return { ...s, notes }
    })
  }

  let list = capsules.slice()
  if (catState.brand !== '전체') list = list.filter(c => c.brand === catState.brand)
  if (catState.machine !== 'all') {
    const m = catState.machine
    list = list.filter(c => c.compat.includes(m))
  }
  if (catState.search) list = list.filter(c => c.name.toLowerCase().includes(catState.search) || c.nameKo.includes(catState.search))
  if (catState.notes.size) list = list.filter(c => c.notes.some(n => catState.notes.has(n)))
  list.sort((a, b) => {
    switch (catState.sort) {
      case 'intensity-desc': return b.intensity - a.intensity
      case 'intensity-asc': return a.intensity - b.intensity
      case 'price-asc': return a.price - b.price
      case 'price-desc': return b.price - a.price
      case 'name': return a.name.localeCompare(b.name)
      default: return 0
    }
  })

  return (
    <section className="view active" id="view-cat">
      <div className="topbar" style={{ paddingBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1><i className="ti ti-mug" /> {t('cat_title')}</h1>
          <span style={{ fontSize: 12, color: 'var(--amber-600)', opacity: 0.8 }}>{totalCount(capsules.length)}</span>
        </div>
      </div>
      <div className="sheet">
        <div className="search-wrap">
          <i className="ti ti-search" />
          <input
            type="text"
            placeholder={t('search_ph')}
            value={catState.search}
            onChange={e => setCatState(s => ({ ...s, search: e.target.value.trim().toLowerCase() }))}
          />
        </div>

        <div className="brand-row">
          {brands.map(b => (
            <button
              key={b}
              className={'brand-chip' + (catState.brand === b ? ' on' : '')}
              onClick={() => setCatState(s => ({ ...s, brand: b }))}
            >
              {b === '전체' ? t('brand_all') : brand(b)}
            </button>
          ))}
        </div>

        <div className="brand-row">
          <button
            className={'brand-chip' + (catState.machine === 'all' ? ' on' : '')}
            onClick={() => setCatState(s => ({ ...s, machine: 'all' }))}
          >
            <i className="ti ti-puzzle" /> {t('machine_all')}
          </button>
          {MACHINES.map(m => (
            <button
              key={m}
              className={'brand-chip' + (catState.machine === m ? ' on' : '')}
              onClick={() => setCatState(s => ({ ...s, machine: m }))}
            >
              {machine(m, true)}
            </button>
          ))}
        </div>

        <div className="chips" style={{ marginBottom: 14 }}>
          {CAT_NOTES.map(n => (
            <button
              key={n}
              className={'chip' + (catState.notes.has(n) ? ' on' : '')}
              onClick={() => toggleNote(n)}
            >
              {note(n)}
            </button>
          ))}
        </div>

        <div className="cat-toolbar">
          <span className="cat-count">{showing(list.length)}</span>
          <select value={catState.sort} onChange={e => setCatState(s => ({ ...s, sort: e.target.value as SortKey }))}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
          </select>
        </div>

        <div>
          {list.length === 0 ? (
            <Empty icon="ti-mood-empty">{t('empty_no_match')}</Empty>
          ) : (
            list.map(c => (
              <CapsuleItem key={c.id} capsule={c} intensityStyle={intensityStyle} onClick={() => onOpenDetail(c.id)} />
            ))
          )}
        </div>
      </div>
    </section>
  )
}
