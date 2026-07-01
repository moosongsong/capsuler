import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { capsules } from '../data'
import { Switch, Empty } from './common'
import { useI18n } from '../i18n'
import type { Reviews, Settings, IntensityStyle, Lang } from '../types'

interface MyViewProps {
  favorites: Set<number>
  reviews: Reviews
  settings: Settings
  setSettings: Dispatch<SetStateAction<Settings>>
  onOpenDetail: (id: number) => void
}

export default function MyView({ favorites, reviews, settings, setSettings, onOpenDetail }: MyViewProps) {
  const { t, name } = useI18n()
  const [loginToggled, setLoginToggled] = useState(false)

  const revList = Object.entries(reviews)
  const avg = revList.length
    ? (revList.reduce((s, [, r]) => s + r.rating, 0) / revList.length).toFixed(1)
    : '–'

  return (
    <section className="view active" id="view-my">
      <div className="topbar" style={{ paddingBottom: 14 }}>
        <h1><i className="ti ti-user" /> {t('my_title')}</h1>
        <p className="sub">{t('my_sub')}</p>
      </div>
      <div className="sheet">
        <div className="login-card" onClick={() => setLoginToggled(v => !v)}>
          <div className="login-ava" style={{ background: 'var(--amber-400)' }}>
            <i className="ti ti-coffee" style={{ color: '#fff' }} />
          </div>
          <div className="login-meta">
            <div className="t">{loginToggled ? t('login_name2') : t('login_name')}</div>
            <div className="s">{loginToggled ? t('login_sub2') : t('login_sub')}</div>
          </div>
          <i className="ti ti-chevron-right" style={{ fontSize: 18, color: 'var(--ink-3)' }} />
        </div>

        <div className="mp-stats">
          <div className="mp-stat"><div className="n">{favorites.size}</div><div className="l">{t('stat_fav')}</div></div>
          <div className="mp-stat"><div className="n">{revList.length}</div><div className="l">{t('stat_review')}</div></div>
          <div className="mp-stat"><div className="n">{avg}</div><div className="l">{t('stat_avg')}</div></div>
        </div>

        <div className="h-row"><i className="ti ti-message-circle-2" /> {t('my_reviews_h')}</div>
        <div style={{ marginBottom: 22 }}>
          {revList.length === 0 ? (
            <Empty icon="ti-message-circle-2" style={{ padding: '1.5rem 0' }}>
              {t('my_reviews_empty1')}<br />
              <span style={{ fontSize: 12 }}>{t('my_reviews_empty2')}</span>
            </Empty>
          ) : (
            revList.map(([id, r]) => {
              const c = capsules.find(x => x.id === +id)
              if (!c) return null
              return (
                <div key={id} className="review-item" style={{ cursor: 'pointer' }} onClick={() => onOpenDetail(c.id)}>
                  <div className="review-item-top">
                    <div className="review-item-name">{name(c)}<span>{c.brand}</span></div>
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

        <div className="h-row"><i className="ti ti-settings" /> {t('settings_h')}</div>
        <div className="settings-group">
          <div className="setting-row">
            <div className="setting-label">
              <i className="ti ti-moon" />
              <div>{t('set_decaf')}<div className="desc-sm">{t('set_decaf_desc')}</div></div>
            </div>
            <Switch
              on={settings.decafDefault}
              onClick={() => setSettings(s => ({ ...s, decafDefault: !s.decafDefault }))}
            />
          </div>
          <div className="setting-row">
            <div className="setting-label">
              <i className="ti ti-color-swatch" />
              <div>{t('set_dark')}<div className="desc-sm">{t('set_dark_desc')}</div></div>
            </div>
            <Switch
              on={settings.dark}
              onClick={() => setSettings(s => ({ ...s, dark: !s.dark }))}
            />
          </div>
          <div className="setting-row">
            <div className="setting-label">
              <i className="ti ti-flame" />
              <div>{t('set_intensity')}<div className="desc-sm">{t('set_intensity_desc')}</div></div>
            </div>
            <select
              style={{ height: 30 }}
              value={settings.intensityStyle}
              onChange={e => setSettings(s => ({ ...s, intensityStyle: e.target.value as IntensityStyle }))}
            >
              <option value="bar">{t('intensity_bar')}</option>
              <option value="num">{t('intensity_num')}</option>
            </select>
          </div>
          <div className="setting-row">
            <div className="setting-label">
              <i className="ti ti-language" />
              <div>{t('set_lang')}<div className="desc-sm">{t('set_lang_desc')}</div></div>
            </div>
            <select
              style={{ height: 30 }}
              value={settings.lang}
              onChange={e => setSettings(s => ({ ...s, lang: e.target.value as Lang }))}
            >
              <option value="ko">한국어</option>
              <option value="en">English</option>
            </select>
          </div>
        </div>

        <div style={{ textAlign: 'center', fontSize: 11, color: 'var(--ink-3)', paddingBottom: 8 }}>
          {t('footer')}
        </div>
      </div>
    </section>
  )
}
