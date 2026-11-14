// src/screens/chess/strings.js
// Строки шахмат. Свой словарь, а не общий i18n: раздел по умолчанию английский при любом языке интерфейса
// (решение владельца) и переключается своим тумблером EN / RU. Запись ходов всегда латиницей.
export const CHESS_LANGS = ['en', 'ru']

const EN = {
  title: 'Chess', tabPlay: 'Play', tabGames: 'Games',
  newGame: 'New game', playAs: 'Play as', white: 'White', black: 'Black', random: 'Random',
  botRating: 'Opponent rating', time: 'Time control', noClock: 'No clock', minutes: '{n} min', play: 'Play',
  'level.beginner': 'Beginner', 'level.novice': 'Novice', 'level.club': 'Club player', 'level.strongClub': 'Strong club player',
  'level.expert': 'Expert', 'level.master': 'Master', 'level.grandmaster': 'Grandmaster',
  loadingEngine: 'Loading engine…', engineFailed: 'The chess engine did not load.', engineStopped: 'Engine stopped. The game is paused.',
  retry: 'Retry', unsupported: 'Chess needs a modern browser with WebAssembly.',
  you: 'You', bot: 'Stockfish', thinking: 'thinking…', yourRating: 'Your rating',
  undo: 'Undo', hint: 'Hint', flip: 'Flip board', resign: 'Resign', soundOn: 'Sound on', soundOff: 'Sound off',
  unrated: 'Unrated game: undo or hint used', cancel: 'Cancel',
  confirmResign: 'Resign this game?', confirmNewRated: 'Start a new game? The current one will count as a loss.',
  confirmNew: 'Start a new game? The current one will be dropped.',
  won: 'You won', lost: 'You lost', draw: 'Draw',
  'reason.checkmate': 'by checkmate', 'reason.stalemate': 'by stalemate', 'reason.insufficient': 'insufficient material',
  'reason.threefold': 'by threefold repetition', 'reason.fifty': 'by the fifty-move rule', 'reason.resignation': 'by resignation',
  'reason.timeout': 'on time', 'reason.abandoned': 'game abandoned',
  ratingChange: 'Rating {before} → {after}', rematch: 'Rematch', review: 'Review moves',
  gamesEmpty: 'No games yet. Play your first one!', vs: 'vs {rating}', movesCount: '{n} moves', back: 'Back',
  first: 'First move', prev: 'Previous move', next: 'Next move', last: 'Last move', badGame: 'This game could not be opened.',
  promoteTo: 'Promote to', 'piece.p': 'pawn', 'piece.n': 'knight', 'piece.b': 'bishop', 'piece.r': 'rook', 'piece.q': 'queen', 'piece.k': 'king',
  empty: 'empty', board: 'Chess board',
}

const RU = {
  title: 'Шахматы', tabPlay: 'Игра', tabGames: 'Партии',
  newGame: 'Новая партия', playAs: 'Играть за', white: 'Белые', black: 'Чёрные', random: 'Случайно',
  botRating: 'Рейтинг соперника', time: 'Контроль времени', noClock: 'Без часов', minutes: '{n} мин', play: 'Играть',
  'level.beginner': 'Начинающий', 'level.novice': 'Новичок', 'level.club': 'Клубный игрок', 'level.strongClub': 'Сильный клубный игрок',
  'level.expert': 'Эксперт', 'level.master': 'Мастер', 'level.grandmaster': 'Гроссмейстер',
  loadingEngine: 'Загружаем движок…', engineFailed: 'Шахматный движок не загрузился.', engineStopped: 'Движок остановился. Партия на паузе.',
  retry: 'Повторить', unsupported: 'Шахматам нужен современный браузер с WebAssembly.',
  you: 'Вы', bot: 'Stockfish', thinking: 'думает…', yourRating: 'Ваш рейтинг',
  undo: 'Вернуть ход', hint: 'Подсказка', flip: 'Перевернуть доску', resign: 'Сдаться', soundOn: 'Звук включён', soundOff: 'Звук выключен',
  unrated: 'Партия без рейтинга: был возврат хода или подсказка', cancel: 'Отмена',
  confirmResign: 'Сдать эту партию?', confirmNewRated: 'Начать новую партию? Текущая засчитается как поражение.',
  confirmNew: 'Начать новую партию? Текущая не сохранится.',
  won: 'Вы победили', lost: 'Вы проиграли', draw: 'Ничья',
  'reason.checkmate': 'мат', 'reason.stalemate': 'пат', 'reason.insufficient': 'недостаточно материала',
  'reason.threefold': 'троекратное повторение', 'reason.fifty': 'правило пятидесяти ходов', 'reason.resignation': 'сдача',
  'reason.timeout': 'по времени', 'reason.abandoned': 'партия брошена',
  ratingChange: 'Рейтинг {before} → {after}', rematch: 'Реванш', review: 'Смотреть ходы',
  gamesEmpty: 'Партий пока нет. Сыграйте первую!', vs: 'против {rating}', movesCount: 'ходов: {n}', back: 'Назад',
  first: 'Первый ход', prev: 'Предыдущий ход', next: 'Следующий ход', last: 'Последний ход', badGame: 'Эту партию не удалось открыть.',
  promoteTo: 'Превратить в', 'piece.p': 'пешка', 'piece.n': 'конь', 'piece.b': 'слон', 'piece.r': 'ладья', 'piece.q': 'ферзь', 'piece.k': 'король',
  empty: 'пусто', board: 'Шахматная доска',
}

// Экспорт — для теста полноты: chessT молча подставляет английский, и забытый русский ключ иначе не виден.
export const CHESS_DICTS = { en: EN, ru: RU }

export function chessT(lang) {
  const dict = CHESS_DICTS[lang] || EN
  return (key, vars) => {
    let s = dict[key] ?? EN[key] ?? key
    if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v))
    return s
  }
}
