import type { Dispatch, SetStateAction } from 'react'
import { capsules, packages, MACHINES } from '../data'
import { CapsuleItem, PackageCard, Empty } from './common'
import { useI18n } from '../i18n'
import type { UIKey } from '../i18n'
import type { CatState, IntensityStyle, SortKey } from '../types'

// 실제 API 향미 중 자주 등장하는 것들을 필터 칩으로 노출
const CAT_NOTES = ['cereal', 'woody', 'cocoa', 'biscuity', 'berry', 'caramel', 'spicy', 'fruity']
const SINGLE_SORT: { value: SortKey; labelKey: UIKey }[] = [
  { value: 'intensity-desc', labelKey: 'sort_intensity_desc' },
  { value: 'intensity-asc', labelKey: 'sort_intensity_asc' },
  { value: 'price-asc', labelKey: 'sort_price_asc' },
  { value: 'price-desc', labelKey: 'sort_price_desc' },
  { value: 'name', labelKey: 'sort_name' },
]
// 패키지는 강도 개념이 없어 가격/이름 정렬만 노출
const PACKAGE_SORT: { value: SortKey; labelKey: UIKey }[] = [
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
  const isPkg = catState.mode === 'package'
  const brands = ['전체', ...new Set(capsules.map(c => c.brand))]

  // 모드 전환 시 정렬값도 해당 모드에 맞게 초기화
  const setMode = (mode: CatState['mode']) =>
    setCatState(s => ({ ...s, mode, sort: mode === 'package' ? 'price-asc' : 'intensity-desc' }))

  const toggleNote = (n: string) => {
    setCatState(s => {
      const notes = new Set(s.notes)
      notes.has(n) ? notes.delete(n) : notes.add(n)
      return { ...s, notes }
    })
  }

  // 단품 목록
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

  // 패키지 목록 (강도·향미 필터 미적용, 가격/이름 정렬)
  let pkgList = packages.slice()
  if (catState.brand !== '전체') pkgList = pkgList.filter(p => p.brand === catState.brand)
  if (catState.machine !== 'all') {
    const m = catState.machine
    pkgList = pkgList.filter(p => p.compat.includes(m))
  }
  if (catState.search) pkgList = pkgList.filter(p => p.name.toLowerCase().includes(catState.search) || p.nameKo.includes(catState.search))
  pkgList.sort((a, b) => {
    switch (catState.sort) {
      case 'price-desc': return b.price - a.price
      case 'name': return a.name.localeCompare(b.name)
      default: return a.price - b.price
    }
  })

  const sortOptions = isPkg ? PACKAGE_SORT : SINGLE_SORT
  const totalN = isPkg ? packages.length : capsules.length
  const shownN = isPkg ? pkgList.length : list.length

  return (
    <section className="view active" id="view-cat">
      <div className="topbar" style={{ paddingBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h1><i className="ti ti-mug" /> {t('cat_title')}</h1>
          <span style={{ fontSize: 12, color: 'var(--amber-600)', opacity: 0.8 }}>{totalCount(totalN)}</span>
        </div>
      </div>
      <div className="sheet">
        <div className="segment">
          <button className={'seg' + (!isPkg ? ' on' : '')} onClick={() => setMode('single')}>
            <i className="ti ti-mug" /> {t('seg_single')}
          </button>
          <button className={'seg' + (isPkg ? ' on' : '')} onClick={() => setMode('package')}>
            <i className="ti ti-package" /> {t('seg_package')}
          </button>
        </div>

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

        {/* 향미 필터는 단품 전용 */}
        {!isPkg && (
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
        )}

        <div className="cat-toolbar">
          <span className="cat-count">{showing(shownN)}</span>
          <select value={catState.sort} onChange={e => setCatState(s => ({ ...s, sort: e.target.value as SortKey }))}>
            {sortOptions.map(o => <option key={o.value} value={o.value}>{t(o.labelKey)}</option>)}
          </select>
        </div>

        <div>
          {isPkg ? (
            pkgList.length === 0 ? (
              <Empty icon="ti-mood-empty">{t('empty_no_pkg')}</Empty>
            ) : (
              pkgList.map(p => <PackageCard key={p.id} pkg={p} />)
            )
          ) : list.length === 0 ? (
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
