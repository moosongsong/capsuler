import { capsules } from '../data'
import { CapsuleItem, Empty } from './common'
import type { IntensityStyle } from '../types'

interface FavViewProps {
  favorites: Set<number>
  intensityStyle: IntensityStyle
  onOpenDetail: (id: number) => void
}

export default function FavView({ favorites, intensityStyle, onOpenDetail }: FavViewProps) {
  const list = capsules.filter(c => favorites.has(c.id))

  return (
    <section className="view active" id="view-fav">
      <div className="topbar" style={{ paddingBottom: 14 }}>
        <h1><i className="ti ti-heart" /> 찜한 캡슐</h1>
        <p className="sub">마음에 둔 캡슐을 모아뒀어요</p>
      </div>
      <div className="sheet">
        {list.length === 0 ? (
          <Empty icon="ti-heart">
            아직 찜한 캡슐이 없어요<br />
            <span style={{ fontSize: 12 }}>마음에 드는 캡슐의 하트를 눌러보세요</span>
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
