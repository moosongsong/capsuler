import { useState } from 'react'
import type { Dispatch, SetStateAction } from 'react'
import { Switch } from './common'
import { MACHINES } from '../data'
import { useI18n } from '../i18n'
import type { Settings, IntensityStyle, Lang, MachineSystem } from '../types'

interface MyViewProps {
  settings: Settings
  setSettings: Dispatch<SetStateAction<Settings>>
}

export default function MyView({ settings, setSettings }: MyViewProps) {
  const { t, machine } = useI18n()
  const [loginToggled, setLoginToggled] = useState(false)

  // 보유 머신 토글(다중 선택)
  const toggleMachine = (m: MachineSystem) =>
    setSettings(s => ({
      ...s,
      machines: s.machines.includes(m) ? s.machines.filter(x => x !== m) : [...s.machines, m],
    }))

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

        <div className="h-row" style={{ marginTop: 20 }}><i className="ti ti-settings" /> {t('settings_h')}</div>
        <div className="settings-group">
          <div className="setting-row" style={{ flexDirection: 'column', alignItems: 'stretch', gap: 10 }}>
            <div className="setting-label">
              <i className="ti ti-puzzle" />
              <div>{t('set_machine')}<div className="desc-sm">{t('set_machine_desc')}</div></div>
            </div>
            <div className="brand-row" style={{ marginBottom: 0 }}>
              {MACHINES.map(m => (
                <button
                  key={m}
                  className={'brand-chip' + (settings.machines.includes(m) ? ' on' : '')}
                  onClick={() => toggleMachine(m)}
                >
                  {machine(m, true)}
                </button>
              ))}
            </div>
          </div>
          <div className="setting-row">
            <div className="setting-label">
              <i className="ti ti-moon" />
              <div>{t('set_decaf')}<div className="desc-sm">{t('set_decaf_desc')}</div></div>
            </div>
            <Switch
              label={t('set_decaf')}
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
              label={t('set_dark')}
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
