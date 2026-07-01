import { useEffect } from 'react'
import { packages, capsules, perCapsulePrice } from '../data'
import { AvatarInner } from './common'
import { useI18n } from '../i18n'

interface PackageDetailViewProps {
  id: number
  onOpenDetail: (id: number) => void
  onBack: () => void
}

export default function PackageDetailView({ id, onOpenDetail, onBack }: PackageDetailViewProps) {
  const { t, note, machine, name, price, brand, intensityWord } = useI18n()
  const pkg = packages.find(p => p.id === id)
  const perCap = pkg ? perCapsulePrice(pkg) : null

  useEffect(() => {
    document.querySelector('.scroll')?.scrollTo(0, 0)
  }, [id])

  if (!pkg) return null

  // 구성 캡슐(존재하는 것만)
  const members = pkg.items
    .map(it => ({ capsule: capsules.find(c => c.id === it.id), qty: it.qty }))
    .filter((m): m is { capsule: NonNullable<typeof m.capsule>; qty: number } => !!m.capsule)

  return (
    <section className="view active" id="view-pkg">
      <div className="d-top">
        <button className="icon-btn" aria-label={t('back_aria')} onClick={onBack}>
          <i className="ti ti-arrow-left" />
        </button>
      </div>

      <div className="d-hero">
        <div className="big"><AvatarInner url={pkg.image} /></div>
        <p className="d-name">{name(pkg)}</p>
        <p className="d-brand">{brand(pkg.brand)}</p>
      </div>

      <div className="sheet">
        <p className="section-label">{t('compat_h')}</p>
        <div className="chips" style={{ marginBottom: 20 }}>
          {pkg.compat.map(m => (
            <span key={m} className="chip on" style={{ cursor: 'default' }}>
              <i className="ti ti-puzzle" />{machine(m)}
            </span>
          ))}
        </div>

        <div className="h-row"><i className="ti ti-package" /> {t('pkg_contents_h')} ({members.length})</div>
        <div style={{ marginBottom: 20 }}>
          {members.map(({ capsule: c, qty }) => (
            <div key={c.id} className="sim-item" onClick={() => onOpenDetail(c.id)}>
              <div className="cat-ava" style={{ width: 32, height: 32 }}>
                <AvatarInner url={c.image} />
              </div>
              <div className="cat-meta">
                <div style={{ fontSize: 13, fontWeight: 600 }}>
                  {name(c)} <span style={{ fontSize: 11, color: 'var(--ink-2)', fontWeight: 400 }}>{brand(c.brand)}</span>
                </div>
                <div style={{ fontSize: 11, color: 'var(--ink-3)', marginTop: 1 }}>
                  {c.intensity !== 0 ? `${intensityWord(c.intensity)} · ` : ''}{c.notes.map(n => note(n)).join(', ')}
                </div>
              </div>
              <div className="pkg-mem-right">
                <span className="mem-price">{price(c.price)}</span>
                <span className="qty-badge">×{qty}</span>
              </div>
              <i className="ti ti-chevron-right" style={{ fontSize: 16, color: 'var(--ink-3)' }} />
            </div>
          ))}
        </div>

        <div className="buy-row">
          <div className="buy-price">
            <div className="k">{t('pkg_price')}</div>
            <div className="v">{price(pkg.price)}</div>
            {perCap != null && <div className="per-cap">{t('per_capsule')} {price(perCap)}</div>}
          </div>
          <a className="buy-btn" href={pkg.buyUrl || '#'} target="_blank" rel="noopener noreferrer">
            <i className="ti ti-shopping-cart" /> {t('buy')}
          </a>
        </div>
      </div>
    </section>
  )
}
