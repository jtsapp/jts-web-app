# ИИ-тьютор на выделенном LiveKit для dev

Тьютор работает в существующем кабинете на `https://dev-tutor.justtostudy.kz`. Web-приложение выдаёт токен для новой комнаты и указывает в нём имя агента `jts-tutor`. Сервер назначает этого агента только в комнатах с таким запросом. Токены обычных видеозвонков не запрашивают агента.

## Переменные деплоя агента

Откройте [GitLab → Settings → CI/CD → Variables](https://gitlab.com/just-to-study-group/jts-web-app/-/settings/ci_cd). Для всех новых переменных выберите scope `development`. Для однострочных секретов выберите **Masked and hidden**, отключите expansion. Для многострочных File variables GitLab требует **Visible**. Заканчивайте содержимое новой строкой и ограничьте SSH-ключ доверенными пайплайнами. Docker-доступ позволяет управлять R630.

| Переменная | Значение |
| --- | --- |
| `TUTOR_AGENT_SSH_TARGET` | `jts-tutor-deploy@185.35.223.69` |
| `TUTOR_AGENT_SSH_KEY` | File, приватный ключ выделенной учётной записи Docker-деплоя |
| `TUTOR_AGENT_SSH_KNOWN_HOSTS` | File, строка known_hosts с проверенным ключом сервера для `185.35.223.69` |
| `TUTOR_AGENT_LIVEKIT_URL` | `wss://185.35.223.69` |
| `TUTOR_AGENT_LIVEKIT_API_KEY`, `TUTOR_AGENT_LIVEKIT_API_SECRET` | Пара из секции `keys` в `/etc/livekit/livekit.yaml` на R630 |
| `TUTOR_AGENT_JTS_API_URL` | `https://dev-tutor.justtostudy.kz` |
| `INTERNAL_API_KEY`, `SONIOX_API_KEY` | Действующие ключи dev-приложения, доступны job в scope `development` |
| `TUTOR_AGENT_PROVIDER_ENV` | File, параметры используемых провайдеров речи агента в формате `NAME=value` |

На Mac файлы для двух SSH-переменных находятся в `~/.ssh/jts-tutor-dev-gitlab` и `~/.ssh/jts-tutor-dev-gitlab.known_hosts`. Чтобы перенести один файл в форму GitLab, скопируйте его через `pbcopy < путь-к-файлу` и сразу вставьте в поле **Value**.

В файл провайдеров перенесите параметры TTS и прямого доступа к моделям, которые нужны существующим персонам dev-агента. Например, для Azure используются `AZURE_SPEECH_KEY` и `AZURE_SPEECH_REGION`, для ElevenLabs — его ключи и ID голосов, для прямого Anthropic — `ANTHROPIC_API_KEY`. Назначения провайдеров по персонам находятся в функции `_tts_provider_for` в `agent/agent.py`. Job запускает каскадный стек с локальным детектором конца реплики и выключенным Krisp BVC.

## Переключение dev-кабинета

1. Влейте ветку с настройками в `develop`. В пайплайне запустите ручную job `tutor-agent-dev`. Дождитесь сообщения `Dev tutor worker registered as jts-tutor.`.
2. Сохраните старые значения LiveKit для быстрого отката. Обновите **только scope `development`**. Выставьте `LIVEKIT_URL=wss://185.35.223.69` и `LIVEKIT_AGENT_NAME=jts-tutor`. В `LIVEKIT_API_KEY` и `LIVEKIT_API_SECRET` поставьте ту же пару, которую получает агент.
3. Запустите обычный dev-деплой web-приложения. Проверьте разговор в кабинете, завершение сессии и списание минут. Проверьте отдельный видеозвонок и убедитесь, что агент к нему не присоединился.
4. Для резервного учёта при аварийном закрытии комнаты настройте на R630 LiveKit webhook `https://dev-tutor.justtostudy.kz/api/livekit/webhook` с тем же API-ключом. Этот шаг требует перезапуска LiveKit, поэтому выполняйте его, когда на сервере нет звонков.

Для отката верните старую тройку `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`, очистите `LIVEKIT_AGENT_NAME` и перезапустите обычный web-деплой dev.
