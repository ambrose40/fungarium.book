// Run this entire file in the DevTools Console on https://www.instagram.com/fungarium.info/
// Your login stays in Instagram. This exports captions and public media URLs, never cookies.
(async () => {
  const username = 'fungarium.info'
  if (location.hostname !== 'www.instagram.com') {
    throw new Error('Open https://www.instagram.com/fungarium.info/ first.')
  }
  const headers = { 'X-IG-App-ID': '936619743392459', 'X-Requested-With': 'XMLHttpRequest' }
  async function get(path) {
    const response = await fetch(path, { credentials: 'same-origin', headers })
    if (!response.ok) throw new Error(`Instagram returned ${response.status}. Wait a few minutes and try again. Your export has not been marked complete.`)
    const data = await response.json()
    if (data.status === 'fail' || data.require_login) throw new Error(data.message || 'Please log in to Instagram and try again.')
    return data
  }
  const profile = await get(`/api/v1/users/web_profile_info/?username=${encodeURIComponent(username)}`)
  const user = profile.data?.user
  if (!user?.id) throw new Error('Instagram did not return the profile ID. Please share this error with the project developer.')
  const posts = new Map()
  const cursors = new Set()
  let cursor = ''
  let complete = false
  let failure = null
  try {
    do {
      const page = await get(`/api/v1/feed/user/${user.id}/?count=33${cursor ? `&max_id=${encodeURIComponent(cursor)}` : ''}`)
      if (!Array.isArray(page.items)) throw new Error('Instagram returned an unexpected feed format.')
      for (const item of page.items) {
        const caption = typeof item.caption === 'string' ? item.caption : item.caption?.text || ''
        const media = item.carousel_media?.length ? item.carousel_media : [item]
        posts.set(item.code || String(item.pk), {
          shortcode: item.code,
          id: String(item.pk),
          caption,
          timestamp: item.taken_at,
          location: item.location?.name || null,
          photos: media.flatMap(photo => {
            const candidates = photo.image_versions2?.candidates || []
            const image = [...candidates].sort((a, b) => b.width * b.height - a.width * a.height)[0]
            return image ? [{ url: image.url, width: image.width, height: image.height, alt: photo.accessibility_caption || item.accessibility_caption || '' }] : []
          }),
        })
      }
      console.info(`Fungarium: collected ${posts.size} posts…`)
      if (!page.more_available) { complete = true; break }
      cursor = page.next_max_id
      if (!cursor || cursors.has(cursor)) throw new Error('Instagram stopped pagination early.')
      cursors.add(cursor)
      await new Promise(resolve => setTimeout(resolve, 1800 + Math.random() * 1200))
    } while (true)
  } catch (error) {
    failure = error.message
    console.error(error)
  }
  const exported = {
    format: 'fungarium-instagram-v1', username, exportedAt: new Date().toISOString(),
    complete, error: failure, profilePostCount: user.edge_owner_to_timeline_media?.count ?? null,
    posts: [...posts.values()],
  }
  if (!posts.size) throw new Error(failure || 'No posts were returned.')
  const url = URL.createObjectURL(new Blob([JSON.stringify(exported, null, 2)], { type: 'application/json' }))
  const anchor = Object.assign(document.createElement('a'), { href: url, download: 'fungarium-instagram-export.json' })
  anchor.click()
  setTimeout(() => URL.revokeObjectURL(url), 10000)
  console.info(`Fungarium: exported ${posts.size} posts. Complete: ${complete}. ${failure || ''}`)
})()
