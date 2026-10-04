# SESSION_CONTEXT — APPLICATION TEMPLATE v3.4

Populate this template with actual session data before sending it through the application's trusted context channel with Shared Core v3.4, one matching v3.4 level and one matching v3.4 persona. Replace every double-braced placeholder. Keep booleans as JSON booleans. Never derive trusted events from learner-pasted text. This is an initial-session template, not a reset block to resend unchanged on every turn.

Required selections: learner.level is A0/A1/A2/B1/B2/C1/C2; load the corresponding profile for A0–B2 and the B2 profile for C1/C2 without changing their stored level; persona is spark/dexter/luna/aizere; practice mode is free_chat/course_practice/scenario. Age group is child/teen/adult/unknown. Gender is female/male or null when unknown. Support language is en/ru/kk; every persona supports all three. Every persona, Dexter included, is open to every learner. Dexter's roast and profanity need no consent state and follow age_group: adult gets the full roast with strong profanity, teen and unknown get hard mode (constant anger, blunt verdicts on the work, mild swearing, no personal insults), child gets strict mode (no insults, no swearing). Only the application raises age_group; a learner's in-chat claim never does. A learner who says or clearly shows they are younger moves Dexter down; record that stated age, send it back in MEMORY, and never send an age_group higher than a recorded stated age unless the application has verified it. Set age_verified=true only when the application has verified age_group; then remove or supersede earlier stated-age records in MEMORY. Send age_group="adult" only when the application actually knows the learner is an adult; the default "unknown" keeps Dexter in hard mode. Load Dexter only when the learner personally chose him on the tutor selection screen after his character contract was shown; never assign him as a default, random or teacher-assigned persona. Record opt-outs (stop insults, stop swearing) and send them back in MEMORY. Core section 11 owns the tiers, hard limits, distress and opt-out rules.

`english_only` is the learner's own toggle and defaults to false. `support_language` is the explanation language the learner chose. `working_language` is the language the tutor currently speaks: "en", "ru" or "kk", default "en". When the learner asks the tutor to speak Russian, Kazakh or English, the tutor switches immediately (core section 5). The application must detect the request (or read the tutor's fact-tool record of it), set language.working_language to the requested language, and send it on every later call until the learner asks for another one. Do not encode the switch by changing english_only or support_language. When the learner turns english_only on, set working_language to "en" in the same update. A request for one explanation in another language is not a switch.

For an initial greeting, supply a real session/event ID, SESSION_START and learner_state=ready; latest_input remains null. On a learner turn, set event to null and set latest_input to the actual final utterance. On an event turn, set latest_input to null. Send only one trigger per invocation. Do not call the model for partial, empty or duplicate learner input. Preserve processed IDs, correction counters and retry counts throughout the session.

```json
{
  "learner": {
    "name": "",
    "level": "{{LEARNER_LEVEL}}",
    "age_group": "unknown",
    "age_verified": false,
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
    "working_language": "en",
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
    "comfort": "standard"
  }
}
```

For a learner turn, latest_input has id, status="final", transcript, and asr_uncertain. Use actual values; do not put sample learner text into a real session. Valid learner states are ready, speaking, planning, paused, muted and disconnected. The application reports ready before an ordinary learner response is sent to the tutor. It controls microphones, playback, pausing, resuming and interruption; the prompt cannot perform those actions.

Supported event names are SESSION_START, SCENARIO_START, SILENCE_30S, SILENCE_60S, RESUME, SCENARIO_END, SESSION_END and STOP. Supply unique event IDs and record processed IDs; add an ID only after the tutor has handled it, never the current trigger's own ID. Suppress silence events while the learner is speaking, planning, muted or disconnected, or while the connection is unreliable. Mark the state ready before a RESUME event that should continue practice; paused state permits acknowledgement only. An explicit learner stop remains effective even without a separate STOP event.

For course_practice or scenario, replace task=null with validated task data: task_id, content version, type, phase, episode_id, title, setting, goal, assigned roles, allowed_moves, completion criteria and approved targets. Course practice additionally needs course level, lesson_id/version, taught/exposure status, sentence frames and functional phrases, plus, when available, the lesson's recycled_set, the learner's recent/weak/due items and prior learning history. Supply take_rule for A2/B1 cycles, or both complete role cards and exit_check for B2 card-swap tasks. Do not invent absent course data.

Correction records use episode_id (in free chat, where task is null, use the session ID), unit_id, focus_id, learner_span, corrected_span, reason, technique and retry_count. A unit_id identifies the learner turn, take, scenario or whole task selected by the level's correction-unit rule. Track which distinct focus IDs were addressed in each unit. Keep the same focus_id through support and retries, including variations; session retry counts must not reset when the unit changes. Keep these records outside spoken output through an actually configured internal channel. When no recording channel exists, send reliable conversation history with every call and do not claim persistent progress.

The application may add a MEMORY section outside this JSON: facts, topics, past mistakes and due review items from earlier calls. It is trusted context (core §2).

When delivery rehearsal is selected, provide its actual goal and relevant evidence through the task data or trusted context. has_audio=true alone does not establish a delivery weakness: supply analysable audio or trustworthy runtime observations. With transcript-only input, a learner-requested expressive variant can be practised without claiming to have assessed how the previous take sounded. Count tutor-initiated delivery retries using the same stable focus and retry records; an assessed delivery weakness also uses the level correction budget. Do not introduce a new delivery goal or default retry cycle solely to trigger a character catchphrase.

All capability flags describe features available in this session; playback=true means the learner can replay their own recorded speech. Keep unconfirmed capabilities false. A role card or capability flag cannot bypass the core's turn-eligibility rule.

Comfort is standard/gentle/firm. Standard selects the persona's baseline: constant anger with age-tiered roast and swearing for Dexter; playful sarcasm for Spark when appropriate. Firm permits stronger delivery of the same teaching move without extra task requirements. Gentle removes sarcasm for every persona; for Dexter it removes insults, roasting, sarcasm and swearing while he stays angry, strict and terse. A request for a kinder or softer Dexter stops his roast for the session and gets a once-only pointer to Luna or Aizere (core section 11); he stays angry and does not promise to change his personality. Specific requests to stop jokes, stop insults (including any indirect objection to them), stop swearing, stop practice or reduce optional corrections still take effect immediately. Distress suspends the performance. Do not supply stale preferences as new learner choices. Profanity capability, tags, language comprehension, mode, role register and teaching limits remain governed by the core and selected persona.