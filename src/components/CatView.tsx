import type { Dispatch, SetStateAction } from 'react'
import { capsules, noteLabels, machineLabelsShort, MACHINES } from '../data'
import { CapsuleItem, Empty } from './common'
import type { CatState, IntensityStyle, SortKey } from '../types'

const CAT_NOTES = ['cocoa', 'woody', 'fruity', 'floral', 'nutty']
const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: 'intensity-desc', label: '진한 순' },
  { value: 'intensity-asc', label: '연한 순' },
  { value: 'price-asc', label: '저렴한 순' },
  { value: 'price-desc', label: '비싼 순' },
  { value: 'name', label: '이름순' },
]

interface CatViewProps {
  catState: CatState
  setCatState: Dispatch<SetStateAction<CatState>>
  intensityStyle: IntensityStyle
  onOpenDetail: (id: number) => void
}

export default function CatView({ catState, setCatState, intensityStyle, onOpenDetail }: CatViewProps) {
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
  if (catState.search) list = list.filter(c => c.name.toLowerCase().includes(catState.search))
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
          <h1><i className="ti ti-mug" /> 캡슐 둘러보기</h1>
          <span style={{ fontSize: 12, color: 'var(--amber-600)', opacity: 0.8 }}>전체 {capsules.length}개</span>
        </div>
      </div>
      <div className="sheet">
        <div className="search-wrap">
          <i className="ti ti-search" />
          <input
            type="text"
            placeholder="캡슐 이름 검색"
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
              {b}
            </button>
          ))}
        </div>

        <div className="brand-row">
          <button
            className={'brand-chip' + (catState.machine === 'all' ? ' on' : '')}
            onClick={() => setCatState(s => ({ ...s, machine: 'all' }))}
          >
            <i className="ti ti-puzzle" /> 전체 머신
          </button>
          {MACHINES.map(m => (
            <button
              key={m}
              className={'brand-chip' + (catState.machine === m ? ' on' : '')}
              onClick={() => setCatState(s => ({ ...s, machine: m }))}
            >
              {machineLabelsShort[m]}
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
              {noteLabels[n]}
            </button>
          ))}
        </div>

        <div className="cat-toolbar">
          <span className="cat-count">{list.length}개 표시 중</span>
          <select value={catState.sort} onChange={e => setCatState(s => ({ ...s, sort: e.target.value as SortKey }))}>
            {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        <div>
          {list.length === 0 ? (
            <Empty icon="ti-mood-empty">조건에 맞는 캡슐이 없어요</Empty>
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
