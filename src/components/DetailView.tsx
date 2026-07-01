import { capsules, noteIcons, similar, buyUrlFor, packagesContaining } from '../data'
import { AvatarInner, PackageCard } from './common'
import { useI18n } from '../i18n'

interface DetailViewProps {
  id: number
  matchPct?: number
  favorites: Set<number>
  onToggleFav: (id: number) => void
  onOpenDetail: (id: number) => void
  onOpenPackage: (id: number) => void
  onBack: () => void
}

export default function DetailView({
  id,
  matchPct,
  favorites,
  onToggleFav,
  onOpenDetail,
  onOpenPackage,
  onBack,
}: DetailViewProps) {
  const { t, note, machine, name, price, matchPct: fmtMatch, intensityWord, brand } = useI18n()
  const c = capsules.find(x => x.id === id)

  if (!c) return null

  const isFav = favorites.has(id)

  return (
    <section className="view active" id="view-detail">
      <div className="d-top">
        <button className="icon-btn" aria-label={t('back_aria')} onClick={onBack}>
          <i className="ti ti-arrow-left" />
        </button>
        <button className={'icon-btn d-fav' + (isFav ? ' on' : '')} aria-label={t('fav_aria')} onClick={() => onToggleFav(id)}>
          <i className={'ti ' + (isFav ? 'ti-heart-filled' : 'ti-heart')} />
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
          {c.intensity !== 0 && (
            <div className="stat hi"><div className="k">{t('stat_intensity')}</div><div className="v">{c.intensity}<small>/13</small></div></div>
          )}
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
                  {s.intensity !== 0 ? `${intensityWord(s.intensity)} · ` : ''}{s.notes.map(n => note(n)).join(', ')}
                </div>
              </div>
              <i className="ti ti-chevron-right" style={{ fontSize: 16, color: 'var(--ink-3)' }} />
            </div>
          ))}
        </div>

        {packagesContaining(c.id).length > 0 && (
          <>
            <div className="h-row"><i className="ti ti-package" /> {t('pkg_in_h')}</div>
            <div style={{ marginBottom: 20 }}>
              {packagesContaining(c.id).map(p => (
                <PackageCard key={p.id} pkg={p} matched={[c]} onClick={() => onOpenPackage(p.id)} />
              ))}
            </div>
          </>
        )}

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
