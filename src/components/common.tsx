import { useState } from 'react'
import type { ReactNode, CSSProperties } from 'react'
import { intensityBars } from '../data'
import { useI18n } from '../i18n'
import type { Capsule, IntensityStyle } from '../types'

// 아바타 내부: 상품 이미지가 있으면 표시, 없거나 로드 실패 시 커피 아이콘으로 폴백
export function AvatarInner({ url }: { url?: string }) {
  const [err, setErr] = useState(false)
  if (url && !err) {
    return (
      <img
        src={url}
        alt=""
        loading="lazy"
        onError={() => setErr(true)}
        style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%', backgroundColor: '#fff' }}
      />
    )
  }
  return <i className="ti ti-coffee" />
}

// 토글 스위치
export function Switch({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <div className={'switch' + (on ? ' on' : '')} onClick={onClick}>
      <span className="knob" />
    </div>
  )
}

// 강도 막대(또는 숫자) 표시
export function IntensityDisplay({ value, style }: { value: number; style: IntensityStyle }) {
  // 강도 미표기(0)는 대시로 표시
  if (value === 0) {
    return <span style={{ color: 'var(--ink-3)' }}>–</span>
  }
  if (style === 'num') {
    return <span style={{ fontWeight: 600, color: 'var(--amber-400)' }}>{value}</span>
  }
  return (
    <span className="ibar">
      {intensityBars(value).map((filled, i) => (
        <span key={i} className={filled ? 'f' : ''} />
      ))}
    </span>
  )
}

// 캡슐 목록 한 줄(둘러보기/찜 공용)
export function CapsuleItem({
  capsule: c,
  intensityStyle,
  onClick,
}: {
  capsule: Capsule
  intensityStyle: IntensityStyle
  onClick: () => void
}) {
  const { t, note, name, price, intensityWord, brand } = useI18n()
  return (
    <div className="cat-item" onClick={onClick}>
      <div className="cat-ava"><AvatarInner url={c.image} /></div>
      <div className="cat-meta">
        <div className="cat-name">
          {name(c)}
          <span className="b">{brand(c.brand)}</span>
          {c.caffeine === 'decaf' && <span className="decaf-pill">{t('decaf_label')}</span>}
        </div>
        <div className="cat-sub">
          {c.intensity !== 0 && (
            <>
              <IntensityDisplay value={c.intensity} style={intensityStyle} />
              <span>{intensityWord(c.intensity)}</span>
              <span>·</span>
            </>
          )}
          <span>{c.notes.map(n => note(n)).join(', ')}</span>
        </div>
      </div>
      <span className="price-r">{price(c.price)}</span>
    </div>
  )
}

// 빈 상태 표시
export function Empty({ icon, children, style }: { icon: string; children: ReactNode; style?: CSSProperties }) {
  return (
    <div className="empty" style={style}>
      <i className={'ti ' + icon} />
      {children}
    </div>
  )
}
