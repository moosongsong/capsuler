import { capsules, recommendedPackages } from '../data'
import { CapsuleItem, PackageCard, Empty } from './common'
import { useI18n } from '../i18n'
import type { IntensityStyle } from '../types'

interface FavViewProps {
  favorites: Set<number>
  intensityStyle: IntensityStyle
  onOpenDetail: (id: number) => void
}

export default function FavView({ favorites, intensityStyle, onOpenDetail }: FavViewProps) {
  const { t } = useI18n()
  const list = capsules.filter(c => favorites.has(c.id))
  const byId = new Map(capsules.map(c => [c.id, c]))
  const recPkgs = recommendedPackages(favorites)

  return (
    <section className="view active" id="view-fav">
      <div className="topbar" style={{ paddingBottom: 14 }}>
        <h1><i className="ti ti-heart" /> {t('fav_title')}</h1>
        <p className="sub">{t('fav_sub')}</p>
      </div>
      <div className="sheet">
        {list.length === 0 ? (
          <Empty icon="ti-heart">
            {t('fav_empty1')}<br />
            <span style={{ fontSize: 12 }}>{t('fav_empty2')}</span>
          </Empty>
        ) : (
          list.map(c => (
            <CapsuleItem key={c.id} capsule={c} intensityStyle={intensityStyle} onClick={() => onOpenDetail(c.id)} />
          ))
        )}

        {recPkgs.length > 0 && (
          <>
            <div className="h-row" style={{ marginTop: 26, marginBottom: 4 }}><i className="ti ti-package" /> {t('fav_pkg_h')}</div>
            <p style={{ margin: '0 0 12px', fontSize: 12, color: 'var(--ink-3)' }}>{t('fav_pkg_sub')}</p>
            {recPkgs.map(m => (
              <PackageCard
                key={m.pkg.id}
                pkg={m.pkg}
                matched={m.matchIds.map(id => byId.get(id)).filter((c): c is NonNullable<typeof c> => !!c)}
                showMatchBadge
              />
            ))}
          </>
        )}
      </div>
    </section>
  )
}
