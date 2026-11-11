import { useCallback, useRef } from 'react'
import { useI18n } from '../i18n.jsx'
import { reportBirgePost, setBirgeLike } from './birgeApi.js'

/**
 * Лайк и жалоба — одни у ленты и у ветки. Лайк ставится сразу (оптимистично), затем число берётся из ответа сервера:
 * параллельные лайки других учеников могли его сдвинуть. Отказ возвращает прежнее. Жалоба одна на пост (§3.4):
 * после неё кнопка уходит, а повтор (409) значит «уже жаловался».
 * update(id, patch) — поправить пост в своём списке; remove(id) — убрать (жалобы скрыли пост).
 */
export function usePostActions({ token, update, remove, onToast }) {
  const { t } = useI18n()
  // Второй клик по тому же лайку, пока первый в пути, перевернул бы его обратно не дождавшись сервера.
  const pending = useRef(new Set())
  const reporting = useRef(new Set())

  const like = useCallback(
    async (post) => {
      if (pending.current.has(post.id)) return
      pending.current.add(post.id)
      const liked = !post.liked
      update(post.id, { liked, likes: Math.max(0, (post.likes ?? 0) + (liked ? 1 : -1)) })
      try {
        const res = await setBirgeLike(token, post.id, liked)
        if (res && typeof res.liked === 'boolean') update(post.id, { liked: res.liked, likes: Number(res.likes) || 0 })
      } catch {
        update(post.id, { liked: Boolean(post.liked), likes: post.likes ?? 0 })
        onToast?.(t('birge.like.failed'))
      } finally {
        pending.current.delete(post.id)
      }
    },
    [token, update, onToast, t],
  )

  const report = useCallback(
    async (post) => {
      // Второе нажатие, пока первая жалоба в пути, получило бы 409 и тост «уже жаловались» поверх «Спасибо».
      if (reporting.current.has(post.id)) return
      reporting.current.add(post.id)
      try {
        const res = await reportBirgePost(token, post.id, null)
        update(post.id, { canReport: false })
        // Пост скрылся после жалоб — у остальных его больше нет, убираем и у пожаловавшегося.
        if (res?.hidden) remove?.(post.id)
        onToast?.(t(res?.hidden ? 'birge.report.hidden' : 'birge.report.sent'))
      } catch (err) {
        if (err?.status === 409) {
          update(post.id, { canReport: false })
          onToast?.(t('birge.report.already'))
        } else {
          onToast?.(t('birge.report.failed'))
        }
      } finally {
        reporting.current.delete(post.id)
      }
    },
    [token, update, remove, onToast, t],
  )

  return { like, report }
}
