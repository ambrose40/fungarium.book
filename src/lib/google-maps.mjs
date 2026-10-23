const apiKey = import.meta.env?.VITE_GOOGLE_MAPS_API_KEY || ''
export const mapsConfigured = Boolean(apiKey)
const authenticationListeners = new Set()
let loading
let authenticationFailed = false
let attempt = 0

export function onMapsAuthenticationFailure(listener) {
  authenticationListeners.add(listener)
  return () => authenticationListeners.delete(listener)
}

export function loadGoogleMaps() {
  if (!apiKey) return Promise.reject(new Error('Google Maps is not configured.'))
  if (authenticationFailed) return Promise.reject(new Error('Google Maps authentication failed.'))
  if (loading) return loading
  if (window.google?.maps?.Map) return Promise.resolve(window.google.maps)

  loading = new Promise((resolve, reject) => {
    const script = document.createElement('script')
    const callback = `__fungariumMapsReady${++attempt}`
    let finished = false
    function fail() {
      if (finished) return
      finished = true
      window.clearTimeout(timeout)
      // A late response must not invoke a missing callback after a timeout.
      window[callback] = () => {}
      script.remove()
      reject(new Error('Google Maps could not be loaded.'))
    }
    window[callback] = () => {
      if (finished) return
      if (!window.google?.maps?.Map) { fail(); return }
      finished = true
      window.clearTimeout(timeout)
      delete window[callback]
      resolve(window.google.maps)
    }
    window.gm_authFailure = () => {
      authenticationFailed = true
      fail()
      for (const listener of authenticationListeners) listener()
    }
    script.src = `https://maps.googleapis.com/maps/api/js?${new URLSearchParams({ key: apiKey, loading: 'async', callback, v: 'weekly' })}`
    script.async = true
    script.onerror = fail
    const timeout = window.setTimeout(fail, 20000)
    document.head.append(script)
  }).catch(error => {
    loading = undefined
    throw error
  })
  return loading
}
