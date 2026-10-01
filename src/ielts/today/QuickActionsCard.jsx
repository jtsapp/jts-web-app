import Card from '../ui/Card.jsx'
import Chip from '../ui/Chip.jsx'
import { TimerIcon, FlagIcon, TranslateIcon, HeadphonesIcon } from '../icons.jsx'
import { useI18n } from '../../i18n.jsx'

// «Быстрые действия» (ТЗ §11, блок 4): полный mock, слабые места, словарь со
// счётчиком слов к повторению, правописание. Куда ведёт ключ — решает экран.
export default function QuickActionsCard({ vocabDue, onAction }) {
  const { t } = useI18n()
  const actions = [
    { key: 'mock', Icon: TimerIcon, label: t('ieltsHub.quick.mock') },
    { key: 'weak', Icon: FlagIcon, label: t('ieltsHub.quick.weak') },
    {
      key: 'vocab',
      Icon: TranslateIcon,
      label: vocabDue ? t('ieltsHub.quick.vocabN', { n: String(vocabDue) }) : t('ieltsHub.quick.vocab'),
    },
    { key: 'spelling', Icon: HeadphonesIcon, label: t('ieltsHub.quick.spelling') },
  ]
  return (
    <Card className="ih-quick" title={t('ieltsHub.quick.title')}>
      <div className="ih-quick__list">
        {actions.map(({ key, Icon, label }) => (
          <Chip key={key} icon={<Icon size={18} />} onClick={() => onAction?.(key)}>
            {label}
          </Chip>
        ))}
      </div>
    </Card>
  )
}
