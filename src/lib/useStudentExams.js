'use client'

import { useEffect, useState } from 'react'
import { getIeltsMe, getSatMeCached } from '../api.js'
import { userIdFromToken } from './jwt.js'

const EMPTY = Object.freeze({ ready: false, ielts: false, sat: false, ieltsAccount: false })

/** Перепроверяем экзамены после свежей матрицы, сохраняя экран при обычном успешном опросе. */
export function useStudentExams(token, sections) {
  const owner = token ? userIdFromToken(token) ?? token : null
  const [state, setState] = useState({ owner: null, ...EMPTY })
  useEffect(() => {
    if (!token || sections?.status !== 'ready') return
    let alive = true
    const safely = (load) => Promise.resolve().then(load).catch(() => null)
    Promise.all([safely(() => getIeltsMe(token)), safely(() => getSatMeCached(token))]).then(([ielts, sat]) => {
      if (alive) setState({ owner, ready: true, ielts: !!(ielts?.purchased || ielts?.ieltsAccount),
        sat: !!sat?.purchased, ieltsAccount: !!ielts?.ieltsAccount })
    })
    return () => { alive = false }
  }, [token, owner, sections])
  return owner !== null && state.owner === owner ? state : EMPTY
}
