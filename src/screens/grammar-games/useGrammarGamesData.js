'use client'

// Данные «Грамматики · игр» с бэкенда (/mobile/grammar-games/**): список тем и
// звёзды — на каждый заход (методист мог скрыть тему, звёзды могли прийти с
// другого устройства), тела тем и словарь — по требованию движка и в памяти
// вкладки, по владельцу токена. В localStorage ничего не кладём: квота домена
// уже съедала прогресс Практики.
//
// Перезапрос — по ВЛАДЕЛЬЦУ токена, а не по строке: тихое обновление access
// меняет строку каждые несколько минут, и движок пересоздавался бы посреди игры.
//
// Сдачи идут очередью (practice/grammar-games/results.js): не дошедшая из-за
// сети уходит со следующей или при следующем заходе, и её звёзды до тех пор
// лежат поверх ответа /progress — ученик видит свой результат, а не ноль.

import { useCallback, useEffect, useRef, useState } from 'react'
import { getGrammarGames, getGrammarGamesGloss, getGrammarGamesProgress, getGrammarGamesTopic, postGrammarGamesResult } from '../../api.js'
import { ownerOf } from '../../practice/progressStore.js'
import { createResultQueue } from '../../practice/grammar-games/results.js'

const memo = new Map()
function store(owner) {
  if (!memo.has(owner)) {
    const s = { token: null, topics: new Map(), gloss: null, queue: null }
    // Токен — свежий на момент отправки: сдача, отложенная сетью, уйдёт уже с обновлённым access.
    s.queue = createResultQueue((body) => postGrammarGamesResult(s.token, body))
    memo.set(owner, s)
  }
  return memo.get(owner)
}

// Лучшее из двух карт «тема → игра → звёзды».
function mergeStars(a, b) {
  const out = JSON.parse(JSON.stringify(a || {}))
  for (const [tid, games] of Object.entries(b || {})) {
    out[tid] = out[tid] || {}
    for (const [g, n] of Object.entries(games)) out[tid][g] = Math.max(out[tid][g] || 0, n)
  }
  return out
}

// Промис в памяти; провал не запоминается — следующий клик спросит заново.
function once(map, key, load) {
  if (!map.has(key)) {
    const p = load()
    map.set(key, p)
    p.catch(() => map.delete(key))
  }
  return map.get(key)
}

export function useGrammarGamesData(token) {
  const owner = ownerOf(token)
  const tokenRef = useRef(token)
  useEffect(() => {
    tokenRef.current = token
    if (token) store(owner).token = token
  }, [token, owner])
  const [state, setState] = useState({ status: token ? 'loading' : 'guest', index: null, progress: null })
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    const tk = tokenRef.current
    if (!tk) {
      setState({ status: 'guest', index: null, progress: null })
      return undefined
    }
    const s = store(owner)
    s.token = tk
    let alive = true
    setState((st) => (st.index ? st : { status: 'loading', index: null, progress: null }))
    // Сначала доотправить сдачи прошлого захода — тогда /progress уже их знает.
    const progress = s.queue.flush().catch(() => 0).then(() => getGrammarGamesProgress(tk))
    Promise.all([getGrammarGames(tk), progress])
      .then(([index, prog]) => {
        if (!alive) return
        if (!index || !Array.isArray(index.topics)) throw new Error('список тем без topics')
        setState({ status: 'ready', index, progress: mergeStars(prog?.stars, s.queue.pendingStars()) })
      })
      .catch((e) => alive && setState({ status: e?.status === 404 ? 'missing' : 'error', index: null, progress: null }))
    return () => {
      alive = false
    }
  }, [owner, attempt])

  const retry = useCallback(() => setAttempt((n) => n + 1), [])
  const loadTopic = useCallback((id) => {
    const s = store(owner)
    return once(s.topics, id, () => getGrammarGamesTopic(s.token, id))
  }, [owner])
  const loadGloss = useCallback(() => {
    const s = store(owner)
    if (!s.gloss) {
      s.gloss = getGrammarGamesGloss(s.token)
      s.gloss.catch(() => {
        s.gloss = null
      })
    }
    return s.gloss
  }, [owner])
  const submit = useCallback((topicId, game, stars) => store(owner).queue.submit({ topicId, game, stars }), [owner])

  return { ...state, retry, loadTopic, loadGloss, submit }
}
