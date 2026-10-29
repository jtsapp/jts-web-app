import { useI18n } from '../../i18n.jsx'

/**
 * Код сбоя оценки и id запроса под фразой ошибки. Ученик пересылает его в поддержку, а разработчик по id находит
 * строку `ielts_speaking_assess` в логе стенда (этап, распознавание по ответам, попытки модели) — без этого жалоба
 * «ИИ не оценил» приходила без единой зацепки.
 */
export default function GradeErrorNote({ code, debugId }) {
  const { t } = useI18n()
  if (!code && !debugId) return null
  const text = [code, debugId].filter(Boolean).join(' · ')
  return (
    <small className="ih-muted ih-errcode" data-error-code={code || ''} data-debug-id={debugId || ''}>
      {t('ieltsSpeaking.errorCode')}: <code data-selectable="">{text}</code>
    </small>
  )
}
