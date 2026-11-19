#!/usr/bin/env bash
set -euo pipefail

: "${TUTOR_AGENT_SSH_TARGET:?Set user@host in GitLab CI/CD Variables}"
: "${TUTOR_AGENT_SSH_KEY:?Set the SSH private key as a File variable}"
: "${TUTOR_AGENT_SSH_KNOWN_HOSTS:?Set the pinned server host key as a File variable}"
: "${TUTOR_AGENT_LIVEKIT_URL:?Set the self-hosted WSS URL}"
: "${TUTOR_AGENT_LIVEKIT_API_KEY:?Set the self-hosted LiveKit API key}"
: "${TUTOR_AGENT_LIVEKIT_API_SECRET:?Set the self-hosted LiveKit API secret}"
: "${TUTOR_AGENT_JTS_API_URL:?Set the public URL of the dev web app}"
: "${SONIOX_API_KEY:?Set the dev Soniox API key}"
: "${INTERNAL_API_KEY:?Set the dev web app internal API key}"
: "${CI_COMMIT_SHA:?Missing GitLab commit SHA}"

work_dir=$(mktemp -d)
live=jts-tutor-agent-dev
candidate="$live-candidate"
previous="$live-previous"
image="jts/tutor-agent-dev:$CI_COMMIT_SHA"
candidate_created=false

remote_docker() {
  PATH="$work_dir/bin:$PATH" docker --host "ssh://$TUTOR_AGENT_SSH_TARGET" "$@"
}

cleanup() {
  if [ "$candidate_created" = true ]; then
    remote_docker rm -f "$candidate" >/dev/null 2>&1 || true
  fi
  rm -r -- "$work_dir"
}
trap cleanup EXIT

install -m 0600 "$TUTOR_AGENT_SSH_KEY" "$work_dir/key"
export TUTOR_SSH_BINARY="$(command -v ssh)"
export TUTOR_SSH_KEY_FILE="$work_dir/key"
mkdir "$work_dir/bin"
cat >"$work_dir/bin/ssh" <<'SSH'
#!/bin/sh
exec "$TUTOR_SSH_BINARY" -F /dev/null -i "$TUTOR_SSH_KEY_FILE" \
  -o IdentitiesOnly=yes -o BatchMode=yes -o StrictHostKeyChecking=yes \
  -o "UserKnownHostsFile=$TUTOR_AGENT_SSH_KNOWN_HOSTS" \
  -o ConnectTimeout=10 -o ServerAliveInterval=15 "$@"
SSH
chmod 0700 "$work_dir/bin/ssh"
remote_docker version --format 'Remote Docker {{.Server.Version}}'

for name in "$candidate" "$previous"; do
  if remote_docker container inspect "$name" >/dev/null 2>&1; then
    echo "Found an unfinished worker deployment ($name). Resolve it before retrying." >&2
    exit 1
  fi
done

remote_docker build --tag "$image" agent

export LIVEKIT_URL="$TUTOR_AGENT_LIVEKIT_URL"
export LIVEKIT_API_KEY="$TUTOR_AGENT_LIVEKIT_API_KEY"
export LIVEKIT_API_SECRET="$TUTOR_AGENT_LIVEKIT_API_SECRET"
export JTS_API_URL="$TUTOR_AGENT_JTS_API_URL"
provider_args=()
if [ -n "${TUTOR_AGENT_PROVIDER_ENV:-}" ]; then
  provider_args=(--env-file "$TUTOR_AGENT_PROVIDER_ENV")
fi

remote_docker run -d --name "$candidate" --restart unless-stopped \
  "${provider_args[@]}" \
  --env LIVEKIT_URL --env LIVEKIT_API_KEY --env LIVEKIT_API_SECRET \
  --env JTS_API_URL --env INTERNAL_API_KEY --env SONIOX_API_KEY \
  --env LIVEKIT_AGENT_NAME=jts-tutor --env KRISP_BVC=off \
  --env VOICE_STACK=cascade --env TURN_DETECTOR=v1-mini \
  "$image" >/dev/null
candidate_created=true

ready=false
for _ in $(seq 1 45); do
  if remote_docker exec "$candidate" python -c \
    'import urllib.request; urllib.request.urlopen("http://127.0.0.1:8081/", timeout=2)' 2>/dev/null \
    && remote_docker logs "$candidate" 2>&1 | grep -F 'registered worker' >/dev/null; then
    ready=true
    break
  fi
  sleep 2
done
if [ "$ready" = false ]; then
  echo "Tutor worker failed to register with LiveKit." >&2
  exit 1
fi

if remote_docker container inspect "$live" >/dev/null 2>&1; then
  remote_docker rename "$live" "$previous"
  if ! remote_docker rename "$candidate" "$live"; then
    remote_docker rename "$previous" "$live"
    exit 1
  fi
  candidate_created=false
  remote_docker stop --time 90 "$previous"
  remote_docker rm "$previous" >/dev/null
else
  remote_docker rename "$candidate" "$live"
  candidate_created=false
fi
echo "Dev tutor worker registered as jts-tutor."
