import Shell from '../components/Shell.jsx'
import DexterChat from '../components/DexterChat.jsx'
import { useI18n } from '../i18n.jsx'

export default function LevelTestIntroPage({ onBack, onStart, onLater }) {
  const { t } = useI18n()
  const script = [
    { text: t('test.intro1'), delay: 900 },
    { text: t('test.intro2'), delay: 1400 },
    { text: t('test.intro3'), delay: 1900 },
  ]

  return (
    <Shell onBack={onBack}>
      <div className="reg-inner">
        <DexterChat
          script={script}
          footer={
            <div className="auth">
              <button className="auth-primary" type="button" onClick={onStart}>
                {t('test.start')}
              </button>
              <button className="btn-later" type="button" onClick={onLater}>
                {t('test.later')}
              </button>
            </div>
          }
        />
      </div>
    </Shell>
  )
}
