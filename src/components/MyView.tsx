import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { capsules } from '../data'
import { Switch, Empty } from './common'
import type { Reviews, Settings, IntensityStyle } from '../types'

interface MyViewProps {
  favorites: Set<number>
  reviews: Reviews
  settings: Settings
  setSettings: Dispatch<SetStateAction<Settings>>
  onOpenDetail: (id: number) => void
}

export default function MyView({ favorites, reviews, settings, setSettings, onOpenDetail }: MyViewProps) {
  const [loginToggled, setLoginToggled] = useState(false)

  const revList = Object.entries(reviews)
  const avg = revList.length
    ? (revList.reduce((s, [, r]) => s + r.rating, 0) / revList.length).toFixed(1)
    : '–'

  return (
    <section className="view active" id="view-my">
      <div className="topbar" style={{ paddingBottom: 14 }}>
        <h1><i className="ti ti-user" /> 마이 페이지</h1>
        <p className="sub">내 취향과 기록을 한곳에</p>
      </div>
      <div className="sheet">
        <div className="login-card" onClick={() => setLoginToggled(v => !v)}>
          <div className="login-ava" style={{ background: 'var(--amber-400)' }}>
            <i className="ti ti-coffee" style={{ color: '#fff' }} />
          </div>
          <div className="login-meta">
            <div className="t">{loginToggled ? '계정 관리 (준비 중)' : '송무송 님'}</div>
            <div className="s">
              {loginToggled ? '실제 앱에서는 프로필·로그아웃 메뉴가 열려요' : 'musong@coffee.app · 카카오로 로그인됨'}
            </div>
          </div>
          <i className="ti ti-chevron-right" style={{ fontSize: 18, color: 'var(--ink-3)' }} />
        </div>

        <div className="mp-stats">
          <div className="mp-stat"><div className="n">{favorites.size}</div><div className="l">찜</div></div>
          <div className="mp-stat"><div className="n">{revList.length}</div><div className="l">후기</div></div>
          <div className="mp-stat"><div className="n">{avg}</div><div className="l">평균 별점</div></div>
        </div>

        <div className="h-row"><i className="ti ti-message-circle-2" /> 내가 마셨던 캡슐 후기</div>
        <div style={{ marginBottom: 22 }}>
          {revList.length === 0 ? (
            <Empty icon="ti-message-circle-2" style={{ padding: '1.5rem 0' }}>
              아직 남긴 후기가 없어요<br />
              <span style={{ fontSize: 12 }}>캡슐 상세에서 별점과 한 줄을 남겨보세요</span>
            </Empty>
          ) : (
            revList.map(([id, r]) => {
              const c = capsules.find(x => x.id === +id)
              if (!c) return null
              return (
                <div key={id} className="review-item" style={{ cursor: 'pointer' }} onClick={() => onOpenDetail(c.id)}>
                  <div className="review-item-top">
                    <div className="review-item-name">{c.name}<span>{c.brand}</span></div>
                    <div className="stars sm">
                      {[1, 2, 3, 4, 5].map(i => (
                        <i key={i} className={'ti ti-star-filled' + (i <= r.rating ? ' on' : '')} />
                      ))}
                    </div>
                  </div>
                  {r.text && <div className="review-item-text">{r.text}</div>}
                </div>
              )
            })
          )}
        </div>

        <div className="h-row"><i className="ti ti-settings" /> 설정</div>
        <div className="settings-group">
          <div className="setting-row">
            <div className="setting-label">
              <i className="ti ti-moon" />
              <div>디카페인 기본값<div className="desc-sm">추천을 항상 디카페인으로 시작</div></div>
            </div>
            <Switch
              on={settings.decafDefault}
              onClick={() => setSettings(s => ({ ...s, decafDefault: !s.decafDefault }))}
            />
          </div>
          <div className="setting-row">
            <div className="setting-label">
              <i className="ti ti-color-swatch" />
              <div>다크 모드<div className="desc-sm">어두운 테마로 보기</div></div>
            </div>
            <Switch
              on={settings.dark}
              onClick={() => setSettings(s => ({ ...s, dark: !s.dark }))}
            />
          </div>
          <div className="setting-row">
            <div className="setting-label">
              <i className="ti ti-flame" />
              <div>강도 표시<div className="desc-sm">막대 또는 숫자로 표시</div></div>
            </div>
            <select
              style={{ height: 30 }}
              value={settings.intensityStyle}
              onChange={e => setSettings(s => ({ ...s, intensityStyle: e.target.value as IntensityStyle }))}
            >
              <option value="bar">막대</option>
              <option value="num">숫자</option>
            </select>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-3)', paddingBottom: 8 }}>
          오늘의 한 잔 · v0.1 프로토타입
        </div>
      </div>
    </section>
  )
}
