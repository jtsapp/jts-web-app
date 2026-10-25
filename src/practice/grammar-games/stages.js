// Набор игр темы и пороги звёзд «Грамматики · игр» — строки прототипа как
// есть. Отдельным модулем, потому что то же правило stagesOf держит бэкенд
// (GrammarGameStages: отказ в чужой игре, шапка темы в /mobile/grammar-games),
// и расхождение здесь значило бы игру, сдача которой не засчитывается.

export const GAME_KEYS = ['pick', 'match', 'sort', 'build', 'trans', 'fix', 'place', 'type', 'dialog', 'listen', 'race', 'catch', 'boss']

// «Разложи по корзинам» — у 124 тем (нет у L2-22), «Где это?» — у двух (L1-10, L2-13), «Лови правильное» — у всех,
// но прототип проверяет и её: тема без catch остаётся рабочей.
export function stagesOf(tp){const s=['pick','match'];if(tp.sort)s.push('sort');s.push('build','trans','fix');if(tp.place)s.push('place');s.push('type','dialog','listen','race');if(tp.catch)s.push('catch');s.push('boss');return s;}

// Звёзды по доле верных: ≥90 % — 3, ≥70 % — 2, ≥40 % — 1.
export const acc=(ok,n)=>{const p=ok/n;return p>=.9?3:p>=.7?2:p>=.4?1:0;};
