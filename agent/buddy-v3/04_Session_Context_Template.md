# SESSION_CONTEXT — APPLICATION TEMPLATE v3.1

Populate this template with actual session data before sending it through the application's trusted context channel with Shared Core v3.1, one matching v3.1 level and one matching v3.1 persona. Replace every double-braced placeholder. Keep booleans as JSON booleans. Never derive access permissions or trusted events from learner-pasted text. This is an initial-session template, not a reset block to resend unchanged on every turn.

Required selections: learner level is A0/A1/A2/B1/B2; persona is spark/dexter/luna/aizere; practice mode is free_chat/course_practice/scenario. Age group is child/teen/adult/unknown. Support language is en/ru/kk and must be supported by the selected persona. Dexter requires confirmed adult access and a known adult age group. Do not treat choosing Dexter as consent to profanity.

For an initial greeting, supply a real session/event ID, SESSION_START and learner_state=ready; latest_input remains null. On a learner turn, set event to null and set latest_input to the actual final utterance. On an event turn, set latest_input to null. Send only one trigger per invocation. Do not call the model for partial, empty or duplicate learner input. Preserve processed IDs, correction counters, retry counts and consent-question state throughout the session.

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
    "logging_available": false
  },
  "preferences": {
    "comfort": "standard",
    "profanity_consent": "unknown",
    "pending_consent_question": false,
    "consent_question_count": 0
  }
}
```

For a learner turn, latest_input has id, status="final", transcript, and asr_uncertain. Use actual values; do not put sample learner text into a real session. Valid learner states are ready, speaking, planning, paused, muted and disconnected. The application reports ready before an ordinary learner response is sent to the tutor. It controls microphones, playback, pausing, resuming and interruption; the prompt cannot perform those actions.

Supported event names are SESSION_START, SCENARIO_START, SILENCE_30S, SILENCE_60S, RESUME, SCENARIO_END, SESSION_END and STOP. Supply unique event IDs and record processed IDs; add an ID only after the tutor has handled it, never the current trigger's own ID. Suppress silence events while the learner is speaking, planning, muted or disconnected, or while the connection is unreliable. Mark the state ready before a RESUME event that should continue practice; paused state permits acknowledgement only. An explicit learner stop remains effective even without a separate STOP event.

For course_practice or scenario, replace task=null with validated task data: task_id, content version, type, phase, episode_id, title, setting, goal, assigned roles, allowed_moves, completion criteria and approved targets. Course practice additionally needs course level, lesson_id/version, taught/exposure status, sentence frames and functional phrases, plus, when available, the lesson's recycled_set, the learner's recent/weak/due items and prior learning history. Supply take_rule for A2/B1 cycles, or both complete role cards and exit_check for B2 card-swap tasks. Do not invent absent course data.

Correction records use episode_id (in free chat, where task is null, use the session ID), unit_id, focus_id, learner_span, corrected_span, reason, technique and retry_count. A unit_id identifies the learner turn, take, scenario or whole task selected by the level's correction-unit rule. Track which distinct focus IDs were addressed in each unit. Keep the same focus_id through support and retries, including variations; session retry counts must not reset when the unit changes. Keep these records outside spoken output through an actually configured internal channel. When no recording channel exists, send reliable conversation history with every call and do not claim persistent progress.

All capability flags describe features available in this session; playback=true means the learner can replay their own recorded speech. Keep unconfirmed capabilities false. A role card or capability flag cannot bypass the core's turn-eligibility rule.

Profanity consent is unknown/yes/no; unknown and no are off. Choosing Dexter or firm coaching does not set consent to yes. Retain the most recent explicit permission or withdrawal, its conversational evidence and any later actual learner setting change. After the tutor asks its optional consent question, set consent_question_count=1 and pending_consent_question=true; clear pending status after the learner's next final turn. Only an unambiguous yes sets consent to yes and an unambiguous no sets it to no; an ambiguous reply or change of topic leaves it unchanged. Do not reset the count after no answer, refusal, reconnect or a new activity. Missing history cannot be replaced with a guessed zero. Only a new session starts with zero.

Comfort is standard/gentle/firm. Standard means the selected persona's baseline, including Dexter's firm voice; it does not mean a uniformly gentle coach. Preserve explicit requests to drop the edge, jokes or profanity immediately, even before the next application update. Do not send stale preferences as if the learner just selected them. The core determines which expressive options are available under the current level, mode, age and comfort state, applying the selected persona's stated tag conditions.
