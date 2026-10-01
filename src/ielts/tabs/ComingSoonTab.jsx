import EmptyState from '../ui/EmptyState.jsx'
import PillButton from '../ui/PillButton.jsx'
import { useI18n } from '../../i18n.jsx'

// Вкладка, чей экран ещё переносится из прототипа (Словарь, Инфо): честная
// заглушка с объяснением и, если есть, переходом туда, где это уже работает.
export default function ComingSoonTab({ tabKey, icon, action }) {
  const { t } = useI18n()
  return (
    <EmptyState
      icon={icon}
      title={t(`ieltsHub.soon.${tabKey}.title`)}
      text={t(`ieltsHub.soon.${tabKey}.text`)}
      action={
        action && (
          <PillButton variant="primary" onClick={action.onClick}>
            {action.label}
          </PillButton>
        )
      }
    />
  )
}
