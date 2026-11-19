import { RoomAgentDispatch, RoomConfiguration } from 'livekit-server-sdk'

export function tutorAgentName() {
  return (process.env.LIVEKIT_AGENT_NAME || '').trim()
}

export function dispatchTutor(token, agentName) {
  if (agentName) {
    token.roomConfig = new RoomConfiguration({
      agents: [new RoomAgentDispatch({ agentName })],
    })
  }
}
