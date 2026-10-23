import { test as base, expect } from '@playwright/test'

export { expect }

export const test = base.extend({
  googleMapsResponse: ['success', { option: true }],
  _googleMaps: [async ({ context, googleMapsResponse }, use) => {
    await context.route(url => url.hostname === 'maps.googleapis.com' && url.pathname === '/maps/api/js', async route => {
      if (googleMapsResponse === 'network-error') { await route.abort(); return }
      const callback = new URL(route.request().url()).searchParams.get('callback')
      await route.fulfill({ contentType: 'application/javascript', body: `
        window.__googleMapsTest = { maps: [], cleaned: 0 };
        window.google = { maps: {
          Map: class {
            constructor(element, options) {
              const record = { center: options.center, zoom: options.zoom, mapTypeId: options.mapTypeId, pins: [], titles: [] };
              const features = [];
              this.fitBounds = (bounds, padding) => { record.bounds = bounds.positions; record.padding = padding; };
              window.__googleMapsTest.maps.push(record);
              element.textContent = 'Google Maps test double';
              this.data = {
                add(feature) { features.push(feature); record.pins.push(feature.geometry.position); },
                setStyle(style) { record.titles = features.map(feature => (typeof style === 'function' ? style({ getProperty: key => feature.properties[key] }) : style).title); },
                setMap() {},
              };
            }
          },
          Data: { Point: class { constructor(position) { this.position = position; } } },
          LatLngBounds: class { constructor() { this.positions = []; } extend(position) { this.positions.push(position); return this; } },
          event: { trigger() {}, clearInstanceListeners() { window.__googleMapsTest.cleaned++; } },
        } };
        window[${JSON.stringify(callback)}]();
      ` })
    })
    await use()
  }, { auto: true }],
})
