import Shell from '../components/Shell.jsx'

export default function SuccessPage({ name, onHome }) {
  return (
    <Shell>
      <div className="form-card">
        <div className="success-badge" aria-hidden="true">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none">
            <path
              d="m5 13 4 4L19 7"
              stroke="currentColor"
              strokeWidth="2.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        <h2 className="form-title">
          {name ? `${name}, добро пожаловать!` : 'Добро пожаловать!'}
        </h2>
        <p className="form-sub">
          Регистрация завершена — твой аккаунт создан. Декстер уже готовит первый урок 🎓
        </p>
        <button className="form-primary" type="button" onClick={onHome}>
          На главную
        </button>
      </div>
    </Shell>
  )
}
