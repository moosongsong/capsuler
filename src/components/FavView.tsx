import { capsules } from '../data'
import { CapsuleItem, Empty } from './common'
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
      </div>
    </section>
  )
}
