import LearningLayout from './LearningLayout.jsx'

// Заглушка экрана кабинета: настоящая оболочка с меню и полосы вместо содержимого. Отдельным файлом и чанком, потому
// что гостю (вход, регистрация) оболочка кабинета не нужна. notifications={false}: заглушка живёт доли секунды, и
// поднимать ради неё сокет уведомлений, чтобы тут же закрыть, незачем.
export default function ScreenSkeleton({ label, ...shell }) {
  return (
    <LearningLayout {...shell} notifications={false}>
      <div className="scr-load__body" role="status" aria-busy="true" aria-label={label}>
        <div className="scr-load__bar ge-skel" />
        <div className="scr-load__block ge-skel" />
        <div className="scr-load__row">
          <div className="scr-load__block ge-skel" />
          <div className="scr-load__block ge-skel" />
        </div>
      </div>
    </LearningLayout>
  )
}
