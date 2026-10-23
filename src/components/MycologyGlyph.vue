<script setup>
import { computed } from 'vue'

const props = defineProps({ icon: { type: String, required: true }, color: String })
const ink = '#53634c'
const cap = '#d9be95'
const paper = '#f8f6ec'
const path = (d, attrs = {}) => ({ tag: 'path', attrs: { d, ...attrs } })
const circle = (cx, cy, r, attrs = {}) => ({ tag: 'circle', attrs: { cx, cy, r, ...attrs } })
const ellipse = (cx, cy, rx, ry, attrs = {}) => ({ tag: 'ellipse', attrs: { cx, cy, rx, ry, ...attrs } })
const line = (x1, y1, x2, y2, attrs = {}) => ({ tag: 'line', attrs: { x1, y1, x2, y2, ...attrs } })
const text = (value, x = 48, y = 54, attrs = {}) => ({ tag: 'text', text: value, attrs: { x, y, 'text-anchor': 'middle', stroke: 'none', fill: ink, 'font-size': 35, 'font-family': 'Georgia, serif', ...attrs } })
const slash = () => line(25, 62, 71, 16, { stroke: '#a07061', 'stroke-width': 2.4 })
const ground = () => path('M19 70q29 5 58 0', { stroke: '#b0b79e' })
const stem = (d = 'M43 39h10l4 29q-9 4-18 0Z') => path(d, { fill: paper })
const capPath = {
  hemispherical: 'M15 43a33 33 0 0 1 66 0q-33 9-66 0Z',
  ovate: 'M29 49C18 10 42 0 48 5c10-5 30 9 19 44Z',
  conical: 'M13 46 48 8 83 46q-35 7-70 0Z',
  bell: 'M19 47C34 40 26 11 48 9c22 2 14 31 29 38q-29 8-58 0Z',
  convex: 'M12 43Q48-1 84 43q-36 9-72 0Z',
  flat: 'M10 39q38-7 76 0l-1 6q-37 6-74 0Z',
  depressed: 'M12 31q36 21 72 0l-2 13q-34 11-68 0Z',
  funnel: 'M10 24q38 30 76 0l-9 23q-29 22-58 0Z',
  umbonate: 'M11 43c16-12 23-9 29-20q8-19 16 0c6 11 13 8 29 20q-37 9-74 0Z',
  umbilicate: 'M12 41Q29 24 41 34q7 13 14 0Q68 24 84 41q-36 11-72 0Z',
  lobed: 'M11 39q4-10 13-5 9 7 16-2 8-9 16 0t16 0q10-7 14 7l-3 9q-9 7-17 0-8-7-16 0-8 7-17-1t-19 1Z',
}
const defaultCap = () => path(capPath.convex, { fill: cap })

function radialLines(count = 23, attrs = {}) {
  return Array.from({ length: count }, (_, i) => {
    const angle = i * Math.PI * 2 / count
    return line(48 + Math.cos(angle) * 8, 39 + Math.sin(angle) * 5,
      48 + Math.cos(angle) * 33, 39 + Math.sin(angle) * 21, attrs)
  })
}

function illustration(icon) {
  if (icon === 'unknown') return [circle(48, 39, 25, { 'stroke-dasharray': '2 4', stroke: '#adb5a1' }), text('?', 48, 51, { fill: '#929d83' })]
  if (icon.startsWith('cap-')) {
    const shape = icon.slice(4)
    if (shape === 'absent') return [stem(), path(capPath.convex, { fill: 'none', 'stroke-dasharray': '3 3', stroke: '#afb7a4' }), slash()]
    return [stem(), path(capPath[shape] || capPath.convex, { fill: cap }), ground()]
  }
  if (icon.startsWith('surface-')) {
    const shape = icon.slice(8)
    const parts = [stem(), defaultCap(), ground()]
    if (shape === 'scaly') parts.push(...[[28, 29], [43, 20], [57, 25], [38, 35], [65, 35]].map(([x, y]) => path(`M${x - 3} ${y + 2}l3-5 4 6Z`, { fill: '#a48b65' })))
    if (shape === 'warted') parts.push(...[[28, 29], [43, 20], [57, 25], [38, 35], [65, 35]].map(([x, y]) => circle(x, y, 3, { fill: paper })))
    if (shape === 'striate') parts.push(...Array.from({ length: 11 }, (_, i) => line(20 + i * 5.5, 39 - Math.sin(i * Math.PI / 10) * 3, 19 + i * 5.8, 44)))
    if (shape === 'fibrillose') parts.push(...Array.from({ length: 9 }, (_, i) => path(`M48 16q${(i - 4) * 4} 8 ${(i - 4) * 8} 25`, { 'stroke-width': .7 })))
    if (shape === 'hairy') parts.push(...Array.from({ length: 12 }, (_, i) => {
      const x = 20 + i * 5
      const y = 39 - Math.sin(i * Math.PI / 11) * 22
      return line(x, y, x - 2, y - 5)
    }))
    if (shape === 'viscid') parts.push(path('M24 35q8-14 20-14', { stroke: paper, 'stroke-width': 3 }), path('M73 45q-8 10 0 13 8-3 0-13Z', { fill: '#adc2b3', stroke: '#7c9c91' }))
    if (shape === 'smooth') parts.push(path('M28 31q9-12 22-12', { stroke: paper, 'stroke-width': 2.7 }))
    return parts
  }
  if (icon.startsWith('hymenium-')) {
    const shape = icon.slice(9)
    if (shape === 'none') return [ellipse(48, 39, 33, 22, { 'stroke-dasharray': '3 3', fill: paper }), slash()]
    if (shape === 'gleba') return [path('M49 12c-29 0-36 26-27 45q26 16 52-1c8-20-3-43-25-44Z', { fill: cap }), path('M48 13v50', { 'stroke-dasharray': '3 3' }), ...[[31, 32], [37, 45], [28, 48], [37, 23], [40, 55]].map(([x, y]) => circle(x, y, 2, { fill: ink })), ground()]
    if (shape === 'teeth') return [path('M12 27q36-18 72 0v9H12Z', { fill: cap }), ...Array.from({ length: 10 }, (_, i) => path(`M${15 + i * 6.5} 36l3 23 3-23`, { fill: '#e7debf' }))]
    const parts = [ellipse(48, 39, 36, 24, { fill: '#eee5ce' })]
    if (shape === 'gills') parts.push(...radialLines(), ellipse(48, 39, 7, 4, { fill: paper }))
    if (shape === 'pores') {
      for (let y = -2; y <= 2; y++) for (let x = -4; x <= 4; x++) if ((x / 4.6) ** 2 + (y / 2.6) ** 2 < 1) parts.push(circle(48 + x * 7, 39 + y * 8, 2.1, { fill: '#a59e65', stroke: '#858456', 'stroke-width': .7 }))
    }
    if (shape === 'ridges') parts.push(...[-1, 1].flatMap(sign => [
      path(`M${48 + 5 * sign} 40q${16 * sign}-18 ${27 * sign}-18m${-17 * sign} 9 ${-3 * sign}-12m${6 * sign} 7 ${9 * sign}-2`, { 'stroke-width': 2.6 }),
      path(`M${48 + 6 * sign} 43q${11 * sign} 15 ${24 * sign} 14m${-14 * sign}-6 ${2 * sign} 9`, { 'stroke-width': 2.6 }),
    ]))
    if (shape === 'smooth') parts.push(path('M25 32q8-10 24-10', { stroke: '#fffdf1', 'stroke-width': 3 }))
    return parts
  }
  if (icon.startsWith('attachment-')) {
    const shape = icon.slice(11)
    const parts = [stem('M43 27h10v43H43Z'), path('M10 33Q48-8 86 33', { fill: cap })]
    const edges = {
      free: 'M11 34h25v9H12m72-9H60v9h24',
      adnexed: 'M11 34h32l-8 10H12m73-10H53l8 10h23',
      adnate: 'M11 34h32v11H12m73-11H53v11h31',
      sinuate: 'M11 34h32q-9 4-4 11H12m73-11H53q9 4 4 11h27',
      decurrent: 'M11 34h32v26Q35 42 12 44m73-10H53v26q8-18 31-16',
      collarium: 'M11 34h24v9H12m73-9H61v9h23M37 35v14q11 5 22 0V35',
    }
    if (shape === 'none') parts.push(slash())
    else parts.push(path(edges[shape] || edges.adnate, { fill: '#9f926c', 'stroke-width': 1.4 }))
    return parts
  }
  if (icon.startsWith('stipe-') || icon.startsWith('veil-')) {
    const shape = icon.replace(/^(?:stipe|veil)-/, '')
    if (shape === 'lateral') return [path('M19 30q16-27 49-6l10 17q-35 15-59-11Z', { fill: cap }), stem('M66 39h10l-5 30H59Z'), ground()]
    const shapes = {
      cylindrical: 'M42 35h12v34H42Z', clavate: 'M44 35h8c1 10 10 18 10 29q-14 13-28 0c0-11 9-19 10-29Z',
      bulbous: 'M42 35h12v21c19 17-31 23-20 6l8-7Z', tapering: 'M44 34h8l9 35H35Z',
      rooting: 'M42 35h12v25l-7 15-6-5 3-10Z',
    }
    const parts = [path(shapes[shape] || shapes.cylindrical, { fill: shape === 'solid' ? '#c7c6a5' : paper }), defaultCap(), ground()]
    if (shape === 'absent') { parts[0].attrs['stroke-dasharray'] = '3 3'; parts[0].attrs.fill = 'none'; parts.push(slash()) }
    if (shape === 'hollow') parts.push(path('M46 46h4v18h-4Z', { fill: '#808971' }))
    if (shape === 'reticulate') parts.push(path('m42 45 12 12m-12-5 12 12m0-19L42 57m12-5L42 64', { 'stroke-width': .9 }))
    if (shape === 'scaly') parts.push(...[46, 53, 60].flatMap(y => [path(`M41 ${y}l4 2-3 2`, { fill: ink }), path(`M51 ${y + 3}l4 2-3 2`, { fill: ink })]))
    if (shape === 'ribbed') parts.push(path('M45 45v21m6-21v21M42 54h12M42 62h12'))
    if (['ring', 'ring-volva'].includes(shape)) parts.push(path('M40 47q8 5 16 0l5 8q-7 4-13-1-6 5-13 1Z', { fill: paper }))
    if (['volva', 'ring-volva'].includes(shape)) parts.push(path('M34 59q7 9 14 7 7 2 14-7l-4 13H38Z', { fill: '#ece7d7' }))
    if (shape === 'ringless') parts.push(ellipse(48, 51, 17, 4, { 'stroke-dasharray': '2 3', stroke: '#b4b6a7' }), line(31, 58, 65, 44, { stroke: '#a07061' }))
    if (shape === 'cortina') parts.push(...[-1, 1].flatMap(sign => [path(`M${48 + 26 * sign} 43l${-20 * sign} 13m${20 * sign}-13 ${-20 * sign} 8m${20 * sign}-8 ${-20 * sign} 18`, { stroke: '#b7af97', 'stroke-width': .8 })]))
    return parts
  }
  if (icon.startsWith('spore-')) {
    if (icon === 'spore-none') return [ellipse(48, 39, 31, 22, { fill: paper, 'stroke-dasharray': '3 3', stroke: '#b4b9a8' }), slash()]
    const color = props.color || '#9a8b6b'
    const parts = [ellipse(48, 40, 34, 25, { fill: paper, stroke: '#c4c7b7' })]
    if (icon === 'spore-mass') parts.push(...Array.from({ length: 30 }, (_, i) => circle(28 + (i * 13 % 41), 24 + (i * 17 % 33), 2.5, { fill: color, stroke: color === '#faf9ef' ? '#b8bfab' : color })))
    else {
      if (color === '#faf9ef') parts.push(...radialLines(42, { stroke: '#d5d9c9', 'stroke-width': 3.4 }))
      parts.push(...radialLines(42, { stroke: color, 'stroke-width': 2.5 }), ellipse(48, 39, 6, 4, { fill: paper, stroke: '#c4c7b7' }))
    }
    return parts
  }
  if (icon.startsWith('body-')) {
    const shape = icon.slice(5)
    const forms = {
      coral: [path('M43 70V41L29 29V13m0 17L16 21V10m27 35 13-16V10m0 16 12-9V8m-25 48L24 44V34m19 11 28-10V24m-28 8L41 15V7', { stroke: '#b19261', 'stroke-width': 5 })],
      cup: [path('M17 23q31 14 62 0c-1 26-15 38-31 38S18 49 17 23Z', { fill: cap }), ellipse(48, 23, 31, 10, { fill: '#ad8763' }), stem('M43 60h10l4 9H39Z')],
      saddle: [stem('M41 39h14l6 29H35Z'), path('M16 38C7 13 33 8 45 24 55 5 85 16 80 40c-16-13-20 10-35-3-11 15-18-4-29 1Z', { fill: '#dbcfb3' }), path('M43 46v19m8-19v19')],
      bracket: [path('M72 9v63h8V9Z', { fill: '#b4a68a' }), path('M73 17C12 9 5 43 72 45Zm0 29C24 40 19 68 73 68Z', { fill: cap }), path('M24 30q22-11 48-5M39 57q18-7 32-5')],
      puffball: [path('M43 14c-33 2-37 44-11 48l6 9h20l6-9c27-6 21-48-11-48Z', { fill: '#e4dcc5' }), ...[[30, 31], [45, 23], [60, 31], [35, 46], [53, 48], [67, 43]].map(([x, y]) => circle(x, y, 1.5, { fill: ink }))],
      earthstar: [path('m48 29 11 16 20-9-6 19 13 8-26 1-12 12-13-12H10l14-10-4-18 19 9Z', { fill: cap }), circle(48, 42, 17, { fill: '#ddd5bb' }), circle(48, 28, 2, { fill: ink })],
      jelly: [path('M18 56C1 46 19 29 29 37 16 9 52 4 51 25 67 7 85 25 72 37c27 4 13 31-5 25-16 19-35 12-36-1-5 7-12 4-13-5Z', { fill: '#ddbb79' }), path('M30 55q8-12 2-21m17 24q-7-16 3-24m12 16q7-12 2-19', { stroke: '#af935c' })],
      crust: [path('M13 25 83 15v44L13 69Z', { fill: '#b6aa8c' }), path('m20 38 8-9 10 4 7-7 12 3 8-4 12 11-2 16-14 1-10 6-12-4-15 5-8-11Z', { fill: '#e8dcc0' }), path('m27 42 10-4 8 8 11-8 11 5', { stroke: '#bcac87' })],
      morel: [stem('M42 54h12l6 16H36Z'), path('M48 6C32 6 18 57 32 59h33C79 57 63 6 48 6Z', { fill: cap }), ...[[45, 18], [39, 33], [54, 32], [34, 47], [49, 48], [62, 47]].map(([x, y]) => ellipse(x, y, 4, 6, { fill: '#8f7b54' }))],
      club: [path('M43 69c3-18-10-31-8-48C37 1 63 1 64 21c1 17-17 30-12 48Z', { fill: '#dbb678' })],
      mould: [path('M16 64Q21 9 80 13C76 54 55 73 16 64Z', { fill: '#bdc6a1' }), path('M18 63 68 24'), ...Array.from({ length: 18 }, (_, i) => circle(28 + i * 13 % 39, 29 + i * 19 % 25, 2, { fill: '#f6f4e6', stroke: '#f6f4e6' }))],
      sporangia: [path('M12 70h72', { stroke: '#b4a68a', 'stroke-width': 5 }), ...[24, 40, 57, 73].flatMap((x, i) => [line(x, 67, x, 34 - i % 2 * 11), ellipse(x, 28 - i % 2 * 11, 7, 12, { fill: '#b9a18d' })])],
    }
    return [...(forms[shape] || []), ground()]
  }
  if (icon.startsWith('ecology-')) {
    const shape = icon.slice(8)
    const smallFungus = [stem('M63 44h7l2 20H60Z'), path('M49 44q17-23 34 0Z', { fill: cap })]
    if (shape === 'mycorrhizal') return [path('M20 43V24m0 15-9-8m9-2 9-9M20 43v13l-12 9m12-9 13 11m-13-6 5 9', { stroke: '#798967', 'stroke-width': 2 }), circle(20, 20, 14, { fill: '#c3cdad' }), ...smallFungus, path('M20 58q21 18 44 6m-44 0q28 12 47 0', { stroke: '#a79970', 'stroke-dasharray': '2 3' }), ground()]
    if (shape === 'saprotrophic') return [path('M15 48h59v23H15Z', { fill: '#c0ad8e' }), ellipse(74, 59, 9, 12, { fill: '#d9c8a7' }), ellipse(74, 59, 4, 7), path('M23 54h24m-25 10h32'), stem('M37 31h8v18h-8Z'), path('M23 31q18-23 36 0Z', { fill: cap })]
    if (shape === 'fungicolous') return [stem(), defaultCap(), stem('M49 16h6v12h-6Z'), path('M40 16q12-18 24 0Z', { fill: '#ba986f' }), ground()]
    if (shape === 'insect') return [...[24, 36, 48, 60, 72].map(x => circle(x, 59, 8, { fill: '#b9c3a1' })), stem('M44 27h8v25h-8Z'), path('M35 27q13-19 26 0Z', { fill: '#cca26b' }), path('m24 67-3 5m16-5-3 5m16-5-3 5m16-5-3 5')]
    if (shape === 'parasitic') return [path('M16 66Q14 12 76 11C83 59 54 74 16 66Z', { fill: '#bfcaab' }), path('m19 63 44-40m-28 27-2-16m14 4 15 1'), ...[[44, 23], [57, 46], [30, 51]].map(([x, y]) => circle(x, y, 5, { fill: '#be9177', stroke: '#9b7c62' }))]
    if (shape === 'lichenized') return [path('m20 57-8-10 9-8-1-13 15 3 8-14 9 13 17-8 2 15 13 5-10 11 3 15-20-5-10 10-12-11Z', { fill: '#b5c4a0' }), ...[[33, 40], [53, 34], [61, 52], [43, 55]].map(([x, y]) => ellipse(x, y, 5, 3, { fill: '#c5a16f' }))]
    if (shape === 'moss') return [path('M11 69h74'), ...[20, 31, 43, 56, 69, 79].map((x, i) => path(`M${x} 68V${40 + i % 3 * 6}m0 14-6-7m6 0 6-7m-6 16-6-7m6 0 6-7`, { stroke: '#8d9e71' }))]
  }
  if (icon.startsWith('edibility-')) {
    const shape = icon.slice(10)
    const plate = [ellipse(48, 43, 24, 22, { fill: paper, stroke: '#a6af97' }), ellipse(48, 43, 17, 15, { stroke: '#bec5af' }), path('M12 17v16m6-16v16m6-16v16M12 28q6 13 12 0m-6 10v30m66-51v51m0-51q-14 14 0 24')]
    if (shape === 'choice') return [...plate, path('m48 22 4 8 9 1-7 7 2 10-8-5-8 5 2-10-7-7 9-1Z', { fill: '#c2ad72', stroke: '#a08d58' })]
    if (shape === 'edible') return [...plate, path('m37 43 8 7 15-19', { stroke: '#6e875b', 'stroke-width': 3 })]
    if (shape === 'conditional') return [path('M24 42h49l-6 23H31Z', { fill: '#e0c89e' }), path('M24 42H13m62 0h9M33 28q-8-7 0-15m15 15q-8-7 0-15m15 15q-8-7 0-15', { stroke: '#a68e69' }), ground()]
    if (shape === 'inedible') return [...plate, slash()]
    if (shape === 'unknown') return [...plate, text('?', 48, 54, { 'font-size': 29, fill: '#9a947b' })]
    if (shape === 'psychoactive') return [path('M49 58c-30 0-31-40-3-40 25 0 25 30 5 30-15 0-14-18-2-18 8 0 9 10 2 10', { stroke: '#95829e', 'stroke-width': 2.5 }), ...[[20, 16], [76, 32], [24, 62], [70, 66]].map(([x, y]) => path(`M${x - 4} ${y}h8m-4-4v8`, { stroke: '#b4a4b8' }))]
    if (['deadly', 'poisonous'].includes(shape)) return [
      path('M48 13c-27 0-31 29-12 36v13h24V49c20-7 15-36-12-36Z', { fill: '#e7d4c6', stroke: '#a17460' }),
      ellipse(38, 35, 5, 6, { fill: '#96755f', stroke: 'none' }), ellipse(58, 35, 5, 6, { fill: '#96755f', stroke: 'none' }),
      path('m48 42-3 6h6ZM42 55v7m6-7v7m6-7v7', { stroke: '#96755f' }),
      ...(shape === 'deadly' ? [path('m20 65 57 10m-55 1 55-13', { stroke: '#a17460', 'stroke-width': 3 })] : []),
    ]
  }
  if (icon.startsWith('flesh-')) {
    const shape = icon.slice(6)
    const colors = { blue: '#789cae', red: '#bf7c75', yellow: '#d4b35a', green: '#8caa76', black: '#5e655c', unchanging: '#e8e2cb' }
    return [path('M22 18q28-16 51 7l-17 9-9 34-13-4 10-36Z', { fill: paper }), path('m44 28 12 6-9 34-13-4Z', { fill: colors[shape] || paper }), path('m64 46 16 11m-5-8 5 8-10-1', { stroke: '#adb59b' }), ground()]
  }
  if (icon.startsWith('microscopy-')) {
    const shape = icon.slice(11)
    const parts = [circle(48, 38, 30, { fill: '#f3f0e2', stroke: '#c9ccbb' })]
    const forms = {
      globose: [circle(48, 38, 18, { fill: '#d7c9a4' })],
      ellipsoid: [ellipse(48, 38, 23, 13, { fill: '#d7c9a4', transform: 'rotate(-28 48 38)' })],
      fusiform: [path('M22 52q6-34 52-28-8 35-52 28Z', { fill: '#d7c9a4' })],
      almond: [path('M25 53C18 20 60 13 72 23 70 47 43 64 25 53Z', { fill: '#d7c9a4' })],
      cylindrical: [path('M27 52c-14-17 26-43 42-29 11 13-28 41-42 29Z', { fill: '#d7c9a4' })],
    }
    if (forms[shape]) return [...parts, ...forms[shape], circle(45, 37, 3, { fill: '#b3a584', stroke: 'none' })]
    parts.push(ellipse(48, 38, 22, 16, { fill: '#d7c9a4' }))
    if (shape === 'smooth') parts.push(path('M34 35q7-8 17-7', { stroke: '#f5ecd5', 'stroke-width': 3 }))
    if (shape === 'warted') parts.push(...[[32, 32], [43, 22], [57, 25], [68, 37], [59, 50], [42, 53], [28, 42]].map(([x, y]) => circle(x, y, 2, { fill: '#a0946d' })))
    if (shape === 'spiny') parts.push(...Array.from({ length: 13 }, (_, i) => {
      const angle = i * Math.PI * 2 / 13
      return line(48 + Math.cos(angle) * 22, 38 + Math.sin(angle) * 16, 48 + Math.cos(angle) * 27, 38 + Math.sin(angle) * 21)
    }))
    if (shape === 'reticulate') parts.push(path('m31 29 29 22m-21-27 29 22m-35 0 25-21m-17 28 25-21m-37 6 17 14', { 'stroke-width': 1 }))
    return parts
  }
  return [text('?')]
}

const shapes = computed(() => illustration(props.icon))
</script>

<template>
  <svg class="mycology-glyph" viewBox="0 0 96 80" fill="none" :stroke="ink" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" :data-variant="icon">
    <component :is="shape.tag" v-for="(shape, index) in shapes" :key="index" v-bind="shape.attrs">{{ shape.text }}</component>
  </svg>
</template>
