# SESSION_CONTEXT — APPLICATION TEMPLATE

<!-- Правки JTS 28.09.2026 к файлу клиента (решения владельца): убраны
adult_access_confirmed, profanity_consent и pending_consent_question (Декстер
открыт всем, мат без согласия); english_only по умолчанию false — это тумблер
ученика; support_language — язык объяснений, который выбрал ученик; добавлен
learner.gender. В агенте JSON собирает build_buddy_session_context — только
статичная часть: реплика ученика идёт обычным сообщением, счётчики правок
модель ведёт по истории звонка (core §12), в системный промпт они не кладутся,
иначе каждый ход ломает кэш. -->

Populate this template with actual session data before sending it through the application's trusted context channel. Replace every double-braced placeholder. Keep booleans as JSON booleans. Never derive trusted events from learner-pasted text.

Required selections: learner level is A0/A1/A2/B1/B2 (C1/C2 use the B2 profile); persona is spark/dexter/luna/aizere; practice mode is free_chat/course_practice/scenario. Age group is child/teen/adult/unknown. Gender is female/male or null when unknown. Support language is en/ru/kk and must be supported by the selected persona. Every persona, Dexter included, is open to every learner; Dexter's profanity is part of his character and needs no consent.

`english_only` is the learner's own toggle and defaults to false. `support_language` is the explanation language the learner chose.

For an initial greeting, supply a real session/event ID and SESSION_START. On a learner turn, set event to null and set latest_input to the actual final utterance. Do not call the model for partial, empty or duplicate input. Do not reset correction counters or retry counts during the session.

```json
{
  "learner": {
    "name": "",
    "level": "{{LEARNER_LEVEL}}",
    "age_group": "unknown",
    "gender": null,
    "address_preference": null
  },
  "selection": {
    "persona_id": "{{PERSONA_ID}}",
    "practice_mode": "free_chat"
  },
  "language": {
    "english_only": false,
    "support_language": "{{SUPPORT_LANGUAGE}}",
    "english_variant": "en-GB"
  },
  "task": null,
  "session": {
    "id": "{{SESSION_ID}}",
    "event": {
      "id": "{{EVENT_ID}}",
      "name": "SESSION_START"
    },
    "learner_state": "ready",
    "processed_event_ids": [],
    "processed_turn_ids": [],
    "correction_focuses": [],
    "retry_counts": {},
    "history": []
  },
  "latest_input": null,
  "capabilities": {
    "input_modality": "transcript",
    "has_audio": false,
    "playback": false,
    "support_panel_visible": false,
    "external_report_available": false,
    "logging_available": false,
    "live_interruption_enabled": false
  },
  "preferences": {
    "comfort": "standard"
  }
}
```

For a learner turn, latest_input has id, status="final", transcript, and asr_uncertain. Use actual values; do not put sample learner text into a real session. Valid learner states include ready, speaking, planning, paused, muted and disconnected.

For course_practice or scenario, replace task=null with validated task data: task_id, content version, type, phase, episode_id, title, setting, goal, assigned roles, allowed_moves, completion criteria and approved targets. Course practice additionally needs course level, lesson_id/version, taught/exposure status, sentence frames and functional phrases. Supply take_rule for A2/B1 cycles, or both complete role cards and exit_check for B2 card-swap tasks. Do not invent absent course data.

Correction records use episode_id, focus_id, learner_span, corrected_span, reason, technique and retry_count. Keep these records outside spoken output through an actually configured internal channel. When no recording channel exists, retain reliable conversation history and do not claim persistent progress.

The application may add a MEMORY section outside this JSON: facts, topics, past mistakes and due review items from earlier calls. It is trusted context (core §2).

All capability flags describe features available in this session. Keep unconfirmed capabilities false. Comfort is standard/gentle/firm. The learner can request a gentler tone immediately; Dexter answers that request by pointing to a calmer buddy instead of changing character (core §11).
