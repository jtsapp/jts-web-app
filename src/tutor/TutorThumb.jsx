import JarvisOrb from './JarvisOrb.jsx'

/**
 * Аватар тьютора в маленьком виде: карточка выбора, шапка звонка, топбар
 * дашборда, слайд маскота. Отдельный компонент, потому что мест четыре, а
 * развилка одна и обязана быть в них одинаковой.
 *
 * У тьюторов с лицом это по-прежнему просто <img src={tutor.avatar}>.
 * face: 'orb' есть только у Джарвиса (см. tutors.js): картинки у него нет
 * вообще, и без этой развилки он показывался бы аватаркой Спарка — так
 * работает дефолт деструктуризации на всех этих экранах.
 */
export default function TutorThumb({ tutor = {}, className = '' }) {
  if (tutor.face === 'orb') {
    return <JarvisOrb className={className} label={tutor.name} />
  }
  return <img className={className || undefined} src={tutor.avatar} alt="" />
}
