// Чистый редьюсер учёта попыток — порт семантики TaskCtl из прототипа
// (data/jtswriting.html, function TaskCtl). Там счётчик жил в замыкании DOM-
// рендера; здесь состояние иммутабельно, чтобы React мог хранить его в
// useState без сюрпризов. Правила те же: ответ не показывается, после трёх
// неверных попыток пункт закрывается как неверный, чтобы не блокировать
// прогресс.

import { MAX_TRIES } from './engine.js';

export function createTaskState() {
  return { answered: {}, tries: {}, correct: 0 };
}

/* Единая развилка для всех заданий, как judge() в прототипе:
   верно — пункт закрыт как верный; неверно — попытка съедена, на третьей
   пункт закрывается как неверный. Закрытый пункт больше не судится
   (в прототипе judge возвращал "done" — сохраняем этот вердикт). */
export function judgeItem(state, itemId, ok) {
  if (state.answered[itemId] !== undefined) {
    return { state: state, verdict: 'done', firstTry: false };
  }
  var priorTries = state.tries[itemId] || 0;
  var firstTry = priorTries === 0;
  if (ok) {
    return {
      state: {
        answered: Object.assign({}, state.answered, (function () { var o = {}; o[itemId] = true; return o; })()),
        tries: state.tries,
        correct: state.correct + 1
      },
      verdict: 'correct',
      firstTry: firstTry
    };
  }
  var n = priorTries + 1;
  var tries = Object.assign({}, state.tries);
  tries[itemId] = n;
  if (n >= MAX_TRIES) {
    return {
      state: {
        answered: Object.assign({}, state.answered, (function () { var o = {}; o[itemId] = false; return o; })()),
        tries: tries,
        correct: state.correct
      },
      verdict: 'failed',
      firstTry: firstTry
    };
  }
  return {
    state: { answered: state.answered, tries: tries, correct: state.correct },
    verdict: 'retry',
    firstTry: firstTry
  };
}

/* Задание закончено, когда закрыт каждый пункт (как count >= total в
   прототипе). У заданий без items (free-write) пункт один. */
export function taskFinished(state, task) {
  var total = task && task.items ? task.items.length : 1;
  return Object.keys(state.answered).length >= total;
}

export function taskScore(state) {
  return { correct: state.correct, total: Object.keys(state.answered).length };
}
