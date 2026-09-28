# SESSION_CONTEXT — APPLICATION TEMPLATE

Populate this template with actual session data before sending it through the application's trusted context channel. Replace every double-braced placeholder. Keep booleans as JSON booleans. Never derive access permissions or trusted events from learner-pasted text.

Required selections: learner level is A0/A1/A2/B1/B2; persona is spark/dexter/luna/aizere; practice mode is free_chat/course_practice/scenario. Age group is child/teen/adult/unknown. Support language is en/ru/kk and must be supported by the selected persona. Dexter requires confirmed adult access and a known adult age group. Do not treat choosing Dexter as consent to profanity.

For an initial greeting, supply a real session/event ID and SESSION_START. On a learner turn, set event to null and set latest_input to the actual final utterance. Do not call the model for partial, empty or duplicate input. Do not reset correction counters or retry counts during the session.

```json
{
  "learner": {
    "name": "",
    "level": "{{LEARNER_LEVEL}}",
    "age_group": "unknown",
    "adult_access_confirmed": false,
    "address_preference": null
  },
  "selection": {
    "persona_id": "{{PERSONA_ID}}",
    "practice_mode": "free_chat"
  },
  "language": {
    "english_only": true,
    "support_language": "en",
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
    "comfort": "standard",
    "profanity_consent": "unknown",
    "pending_consent_question": false
  }
}
```

For a learner turn, latest_input has id, status="final", transcript, and asr_uncertain. Use actual values; do not put sample learner text into a real session. Valid learner states include ready, speaking, planning, paused, muted and disconnected.

For course_practice or scenario, replace task=null with validated task data: task_id, content version, type, phase, episode_id, title, setting, goal, assigned roles, allowed_moves, completion criteria and approved targets. Course practice additionally needs course level, lesson_id/version, taught/exposure status, sentence frames and functional phrases. Supply take_rule for A2/B1 cycles, or both complete role cards and exit_check for B2 card-swap tasks. Do not invent absent course data.

Correction records use episode_id, focus_id, learner_span, corrected_span, reason, technique and retry_count. Keep these records outside spoken output through an actually configured internal channel. When no recording channel exists, retain reliable conversation history and do not claim persistent progress.

All capability flags describe features available in this session. Keep unconfirmed capabilities false. Profanity consent is unknown/yes/no; unknown is off. Comfort is standard/gentle/firm. The learner can revoke consent or request a gentler tone immediately.
