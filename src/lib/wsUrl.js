// STOMP broker URL derived from the REST API base: https→wss, http→ws, plus /ws.
// NEXT_PUBLIC_API_URL is inlined by Next at build; falls back to the dev server.
export function wsBase() {
  const api = (typeof process !== 'undefined' && process.env && process.env.NEXT_PUBLIC_API_URL) || 'https://dev-server.justtostudy.kz'
  const ws = api.replace(/^http/, 'ws')
  return ws.replace(/\/+$/, '') + '/ws'
}
