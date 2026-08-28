// Где искать mp3 задания. У воркбука есть только id трека из учебника
// (`01_08` у A0–B1, `1.1` у B2) — прототип подставлял его в имя файла и, если
// ничего не нашлось, отдавал реплики синтезу (playTrack, :5306).
//
// Своя папка идёт первой: туда кладут дозаписанные треки, и они обязаны
// перебивать учебник. Второй кандидат — аудио курса, уже лежащее в репозитории:
// у A2 и B1 id воркбука сходятся с именами курса почти полностью (47/49 и
// 53/56), у B2 — через слитную форму (`10.7` → `a107.mp3`). У A0/A1 имена
// курса другие (хэши и `A1_L10_1_17`), совпадений нет — там пока только синтез.

/** Свой файл раздела: public/practice/workbook/audio/<level>/Track_<id>.mp3 */
export function ownSource(level, track) {
  return '/practice/workbook/audio/' + level + '/Track_' + track + '.mp3'
}

/**
 * Имя трека в аудио курса. `01_03` → `Track_1.3.mp3`: ведущие нули учебник не
 * пишет, а разделитель у него точка.
 */
export function courseSource(level, track) {
  const m = /^(\d+)[_.](\d+)$/.exec(track)
  if (!m) return null
  const unit = String(Number(m[1]))
  const num = String(Number(m[2]))
  if (level === 'b2') return '/course/b2/audio/a' + unit + num + '.mp3'
  return '/course/' + level + '/audio/Track_' + unit + '.' + num + '.mp3'
}

/** Кандидаты по порядку проверки; пустой список = сразу синтез. */
export function trackSources(level, track) {
  if (!track) return []
  const out = [ownSource(level, track)]
  const course = courseSource(level, track)
  if (course) out.push(course)
  return out
}
