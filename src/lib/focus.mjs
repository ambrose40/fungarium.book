export function focusElement(element, { scroll = true } = {}) {
  if (!element?.isConnected || !element.getClientRects().length || element.matches(':disabled')) return false
  element.focus({ preventScroll: true })
  if (scroll) element.scrollIntoView({ block: 'nearest', inline: 'nearest' })
  return true
}

export function focusMainContent() {
  const main = document.getElementById('main')
  const target = main?.querySelector('h1') || main
  if (target && !target.hasAttribute('tabindex')) target.setAttribute('tabindex', '-1')
  return focusElement(target)
}

export function restoreFocus(opener, fallback) {
  if (!focusElement(opener)) {
    if (fallback) focusElement(fallback)
    else focusMainContent()
  }
}

export function containDialogFocus(event) {
  const dialog = event.currentTarget
  const controls = [...dialog.querySelectorAll('a[href], button, input, select, textarea, [tabindex]')]
    .filter(element => element.tabIndex >= 0 && !element.matches(':disabled') && element.getClientRects().length)
  const first = controls[0]
  const last = controls.at(-1)
  if (!first) { event.preventDefault(); return }
  if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
    event.preventDefault()
    focusElement(last)
  } else if (!event.shiftKey && (document.activeElement === last || document.activeElement === dialog)) {
    event.preventDefault()
    focusElement(first)
  }
}
