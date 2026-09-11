import { rewriteMediaUrls } from './extract/rewriteMediaUrls.js'
import { hoistSelectQuestions } from './hoistSelectQuestions.js'
import { hoistOrderQuestions } from './hoistOrderQuestions.js'
import { hoistChoiceOptions } from './hoistChoiceOptions.js'
import { foldOrphanAudioSteps } from './foldOrphanAudioSteps.js'
import { hoistStepLeads } from './hoistStepLead.js'

/**
 * Что происходит с уроком каталога между сервером и экраном.
 *
 * Сервер отдаёт `content_json` таким, каким его разобрали при регистрации
 * уровня, и показывать это как есть нельзя: медиа в разметке лежит относительно
 * файла урока, а select/order остались сырым HTML и на экране не кликаются.
 *
 * ЭТОТ ПОРЯДОК — ОБЩИЙ С АДМИНКОЙ, и это не совпадение. Ровно тот же конвейер,
 * стадия в стадию, стоит в web-admin (lesson-workspace.component.ts,
 * loadCatalogStepReview). Причин две, и обе дорогие:
 *
 *  1. id вопросов считаются от порядка разбора, а живой урок сводит стороны
 *     именно по questionId — разойдись порядок, преподаватель и ученик
 *     говорили бы о разных вопросах;
 *  2. АДРЕС КАРТОЧКИ урока (см. src/lib/lessonCardId.js) считается по дереву
 *     ПОСЛЕ этого конвейера. Разойдись хоть одна стадия — адрес, который
 *     положила в выдачу админка, перестанет находиться в кабинете, и ученик
 *     увидит «этого задания больше нет» на существующей карточке. Молча.
 *
 * Вынесено отдельной функцией, чтобы конвейер было чем проверить: раньше он жил
 * выражением внутри загрузчика, и тест на него можно было написать только через
 * сеть. Согласие с админкой держит lessonPipeline.test.js — та же фикстура и те
 * же ожидаемые адреса лежат там в lesson-pipeline.parity.ts.
 */
export function applyLessonHoists(content, fileUrl) {
  const lesson = hoistChoiceOptions(
    hoistOrderQuestions(hoistSelectQuestions(rewriteMediaUrls(content, fileUrl))),
  )
  // Хвостовой «Audio» из старой конвертации — в Practice/Listening, не отдельным шагом.
  if (Array.isArray(lesson?.steps)) {
    lesson.steps = hoistStepLeads(foldOrphanAudioSteps(lesson.steps))
  }
  return lesson
}
