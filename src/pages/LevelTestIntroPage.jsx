import Shell from '../components/Shell.jsx'
import DexterChat from '../components/DexterChat.jsx'

const script = [
  { text: 'Давай определим твой уровень знаний', delay: 900 },
  {
    text: 'Нужно пройти тестирование, чтобы мы смогли подобрать тебе обучение',
    delay: 1400,
  },
  {
    text:
      'Я задам около 14 вопросов, которые подстраиваются под твои ответы — ответишь правильно, и следующий станет сложнее. Займёт примерно 5 минут.',
    delay: 1900,
  },
]

export default function LevelTestIntroPage({ onBack, onStart, onLater }) {
  return (
    <Shell onBack={onBack}>
      <div className="reg-inner">
        <DexterChat
          script={script}
          footer={
            <div className="auth">
              <button className="auth-primary" type="button" onClick={onStart}>
                Начать тестирование сейчас
              </button>
              <button className="btn-later" type="button" onClick={onLater}>
                Пройду позже
              </button>
            </div>
          }
        />
      </div>
    </Shell>
  )
}
