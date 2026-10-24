import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import { MYCOLOGY_ART_ICONS } from '../src/lib/mycology-art-index.mjs'
import { root } from './project-paths.mjs'

// Original field-guide schematics. Geometry is drawn at specimen scale, then
// rasterized at 3×; fine contours and washes replace the old chunky glyphs.
const p = (d, fill = 'none', extra = '') => `<path d="${d}" fill="${fill}" ${extra}/>`
const e = (x, y, rx, ry, fill = 'none', extra = '') => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${fill}" ${extra}/>`
const c = (x, y, r, fill = 'none', extra = '') => `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${extra}/>`
const l = (x, y, a, b, extra = '') => `<path d="M${x} ${y}L${a} ${b}" ${extra}/>`
const group = (body, transform = '') => `<g transform="${transform}">${body}</g>`
const capShapes = {
  hemispherical: 'M19 64C21 4 139 4 141 64Q80 79 19 64Z',
  ovate: 'M47 70C24 9 68 3 80 8C111 2 139 32 113 70Q80 80 47 70Z',
  conical: 'M18 65L78 10Q81 8 84 12L143 65Q80 77 18 65Z',
  bell: 'M28 69C53 59 47 11 79 10C112 10 108 60 135 69Q80 83 28 69Z',
  convex: 'M17 63C40 13 121 13 144 63Q80 79 17 63Z',
  flat: 'M16 57Q80 44 145 57L143 65Q80 75 18 65Z',
  depressed: 'M18 47Q80 80 143 47L137 65Q80 84 23 65Z',
  funnel: 'M17 37Q80 87 143 37L125 73Q80 99 35 73Z',
  umbonate: 'M17 64C39 44 64 48 72 24Q80 5 89 24C96 48 122 43 144 64Q80 79 17 64Z',
  umbilicate: 'M18 61Q47 34 66 47Q80 68 94 47Q116 34 143 61Q80 81 18 61Z',
  lobed: 'M18 58C28 38 39 61 55 48C72 33 79 61 96 49C116 32 123 60 144 56L140 70C122 83 115 65 98 75C78 88 69 65 51 75C31 85 25 69 18 72Z',
}
const stemShapes = {
  cylindrical: 'M72 57Q80 60 89 57L91 113Q80 119 70 113Z',
  clavate: 'M74 57H87C86 86 103 104 96 114Q80 125 64 113C61 103 75 82 74 57Z',
  bulbous: 'M72 57H89L89 98C115 114 98 124 79 122C55 122 54 109 71 100Z',
  tapering: 'M67 56H94L86 116Q80 120 75 116Z',
  rooting: 'M72 57H88L87 104L80 126L76 120L77 103Z',
}
const ground = () => e(81, 121, 48, 3, '#77715d', 'opacity=".09" stroke="none"')
const stem = (shape = 'cylindrical', fill = 'url(#stem)') => p(stemShapes[shape] || stemShapes.cylindrical, fill)
const cap = (shape = 'convex') => p(capShapes[shape] || capShapes.convex, 'url(#cap)')
const absent = () => p('M29 108L131 21', 'none', 'stroke="#9a6755" stroke-width="1.7"')
const hatchStem = () => [75, 79, 84, 87].map((x, i) => p(`M${x} 74q${i - 2} 15 0 35`, 'none', 'stroke="#a5987d" stroke-width=".55" opacity=".65"')).join('')
const mushroom = (shape = 'convex', stemShape = 'cylindrical') => ground() + stem(stemShape) + hatchStem() + cap(shape)
const arrow = () => p('M71 75h18m-5-5 5 5-5 5', 'none', 'stroke="#8a806b" stroke-width="1.1"')
const drop = (x, y, colour = '#b9c7c7', size = 1) => group(p(`M0 -8C-2 -3-6 0-5 4C-4 11 5 11 6 4C7 0 2-4 0-8Z`, colour, 'stroke="#675b52" stroke-width=".8"') + p('M-2 1q-2 4 1 5', 'none', 'stroke="#fff" opacity=".8" stroke-width="1"'), `translate(${x} ${y}) scale(${size})`)

function gills(count = 40, extra = '') {
  return Array.from({ length: count }, (_, i) => {
    const angle = i * Math.PI * 2 / count
    return p(`M${80 + Math.cos(angle) * 11} ${67 + Math.sin(angle) * 7}Q${80 + Math.cos(angle) * 35} ${64 + Math.sin(angle) * 20} ${80 + Math.cos(angle) * 63} ${67 + Math.sin(angle) * 39}`, 'none', `stroke="#77654b" stroke-width=".7" ${extra}`)
  }).join('')
}

function cutSection(colour = '#f4eedb') {
  return p('M68 55L91 55L94 118Q80 124 66 118Z', colour) + p('M14 57Q80-8 147 57L140 69Q80 59 22 69Z', 'url(#cap)') + p('M23 65Q80 26 139 65Q79 60 23 65Z', colour) + l(80, 65, 80, 116, 'stroke="#a6977d" stroke-width=".65" stroke-dasharray="2 3"')
}

function draw(icon) {
  const [family, ...rest] = icon.split('-')
  const shape = rest.join('-')
  if (family === 'cap') return shape === 'absent' ? group(mushroom(), 'translate(0 0)') + absent() : mushroom(shape)
  if (family === 'surface') {
    let details = ''
    if (shape === 'smooth' || shape === 'viscid') details += p('M39 46Q59 24 89 31', 'none', 'stroke="#fffdf5" stroke-width="2.2" opacity=".8"')
    if (shape === 'viscid') details += drop(133, 83, '#c8d7d5', .9)
    if (shape === 'scaly') details += [[42, 45], [62, 34], [85, 37], [105, 47], [68, 53], [120, 58]].map(([x, y]) => p(`M${x - 4} ${y + 3}q4-10 9 0Z`, '#a28359', 'stroke-width=".6"')).join('')
    if (shape === 'warted') details += [[42, 45], [62, 34], [85, 37], [105, 47], [68, 53], [120, 58]].map(([x, y]) => p(`m${x - 3} ${y + 2} 3-5 4 4-3 2Z`, '#faf5e7', 'stroke="#8d7c62" stroke-width=".65"')).join('')
    if (shape === 'striate') details += Array.from({ length: 23 }, (_, i) => l(23 + i * 5, 61 - Math.sin(i / 22 * Math.PI) * 2, 23 + i * 5, 65 + Math.sin(i / 22 * Math.PI) * 4, 'stroke="#806e52" stroke-width=".6"')).join('')
    if (shape === 'fibrillose') details += Array.from({ length: 19 }, (_, i) => p(`M80 29Q${40 + i * 4} 44 ${22 + i * 6.4} 64`, 'none', 'stroke="#806e52" stroke-width=".55" opacity=".7"')).join('')
    if (shape === 'hairy') details += Array.from({ length: 29 }, (_, i) => { const x = 23 + i * 4; const y = 61 - Math.sin(i / 28 * Math.PI) * 32; return p(`M${x} ${y}q-2-4-1-7`, 'none', 'stroke="#7c6c56" stroke-width=".7"') }).join('')
    return mushroom() + details
  }
  if (family === 'hymenium') {
    if (shape === 'gleba') return ground() + p('M79 17C25 16 25 104 62 112L98 112C138 102 132 17 79 17Z', 'url(#cap)') + p('M80 20C49 22 42 84 64 104H80Z', '#a18b62') + Array.from({ length: 55 }, (_, i) => c(57 + i * 11 % 20, 34 + i * 17 % 64, .65, '#574b38', 'stroke="none"')).join('') + l(80, 20, 80, 111)
    if (shape === 'teeth') return p('M15 38Q80 9 145 38L142 51H18Z', 'url(#cap)') + Array.from({ length: 20 }, (_, i) => p(`M${18 + i * 6.2} 50q-1 16 2 ${31 + i % 3 * 5}q5-22 4-${31 + i % 3 * 5}`, 'url(#stem)', 'stroke-width=".75"')).join('')
    let details = ''
    if (shape === 'gills') details = gills() + e(80, 67, 10, 6, 'url(#stem)')
    if (shape === 'pores') for (let y = -4; y <= 4; y++) for (let x = -8; x <= 8; x++) if ((x / 8.2) ** 2 + (y / 4.3) ** 2 < 1) details += e(80 + x * 7.3 + (y % 2 ? 2 : 0), 67 + y * 8, 2.2, 2.6, '#b6a37a', 'stroke="#7c6d4e" stroke-width=".55"')
    if (shape === 'ridges') details = [-1, 1].flatMap(sign => Array.from({ length: 6 }, (_, i) => p(`M${80 + sign * 10} ${57 + i * 4}q${sign * 20} ${-24 + i * 8} ${sign * 48} ${-25 + i * 10}m${-sign * 26} ${10 - i * 4}q${sign * 8}-10 ${sign * 13}-19`, 'none', 'stroke="#8d7955" stroke-width="1.4"'))).join('')
    if (shape === 'smooth') details = p('M36 56Q63 32 100 43', 'none', 'stroke="#fffdf7" stroke-width="2"')
    return e(80, 67, 64, 41, 'url(#gill)') + `<g clip-path="url(#hymenium)">${details}</g>` + (shape === 'none' ? absent() : '')
  }
  if (family === 'attachment') {
    const edges = {
      free: 'M19 60Q40 53 65 57L65 70Q40 61 21 68M141 60Q119 53 96 57L96 70Q120 61 140 68',
      adnexed: 'M19 60Q46 53 73 57L64 70Q43 61 21 68M141 60Q117 53 88 57L97 70Q117 61 140 68',
      adnate: 'M19 60Q46 53 73 57V72Q45 61 21 68M141 60Q117 53 88 57V72Q117 61 140 68',
      sinuate: 'M19 60Q47 53 73 57Q62 64 69 72Q43 61 21 68M141 60Q117 53 88 57Q99 64 93 72Q117 61 140 68',
      decurrent: 'M19 60Q46 53 73 57L73 91Q60 66 21 68M141 60Q117 53 88 57L88 91Q104 66 140 68',
      collarium: 'M19 60Q42 53 61 57V71Q41 62 21 68M141 60Q120 53 100 57V71Q120 62 140 68M66 58V75Q80 83 95 75V58',
    }
    return ground() + stem() + cap() + p(edges[shape] || edges.adnate, '#b9a883', 'stroke-width=".8"') + (shape === 'none' ? absent() : '')
  }
  if (family === 'stipe' || family === 'veil') {
    let details = hatchStem()
    if (shape === 'hollow') details = p('M77 73h7v37h-7Z', '#716b59', 'stroke-width=".6"')
    if (shape === 'solid') details = p('M74 75q7-3 13 0v34q-6 3-13 0Z', '#ded0b0', 'stroke-width=".6"')
    if (shape === 'reticulate') details = [77, 83, 89, 95, 101, 107].map(y => p(`m71 ${y} 18 12m0-12-18 12`, 'none', 'stroke="#8a7656" stroke-width=".6"')).join('')
    if (shape === 'scaly') details += [76, 84, 92, 100, 108].map((y, i) => p(`m${73 + i % 2 * 7} ${y} 2-3 2 4`, '#8d7251', 'stroke-width=".5"')).join('')
    if (shape === 'ribbed') details = [74, 78, 83, 87].map(x => p(`M${x} 72q-2 22 0 40`, 'none', 'stroke="#85755e" stroke-width="1"')).join('')
    if (shape === 'ring' || shape === 'ring-volva') details += p('M70 74Q80 79 91 74L96 84Q86 89 81 83Q73 91 65 85Z', 'url(#stem)', 'stroke-width=".85"')
    if (shape === 'volva' || shape === 'ring-volva') details += p('M62 104Q70 118 80 112Q91 118 100 104L94 122H67Z', 'url(#stem)')
    if (shape === 'cortina') details += [-1, 1].flatMap(sign => [7, 12, 18].map(y => p(`M${80 + sign * 53} 64L${80 + sign * 9} ${70 + y}`, 'none', 'stroke="#9c927d" stroke-width=".6" opacity=".8"'))).join('')
    if (shape === 'ringless') details += e(81, 84, 23, 5, 'none', 'stroke-dasharray="2 4" stroke="#b3aa98"') + l(58, 94, 103, 74, 'stroke="#9a6755"')
    if (shape === 'lateral') return ground() + p('M110 57H126L120 115H102Z', 'url(#stem)') + p('M26 44C49 9 116 20 139 61Q75 97 26 44Z', 'url(#cap)')
    return ground() + stem(shape) + details + cap() + (shape === 'absent' ? absent() : '')
  }
  if (family === 'flesh') {
    const colours = { blue: '#719baa', red: '#c18a83', yellow: '#d3ba68', black: '#5c5c54', green: '#8caa82', violet: '#ae91b4', unchanging: '#f4eedb' }
    return group(cutSection(), 'translate(3 10) scale(.43 .85)') + group(cutSection(colours[shape]), 'translate(91 10) scale(.43 .85)') + arrow()
  }
  if (family === 'maturation') {
    if (shape === 'blackening') return group(mushroom('conical'), 'translate(3 10) scale(.43 .85)') + group(stem('cylindrical', '#56594f') + p(capShapes.conical, '#40453f'), 'translate(91 10) scale(.43 .85)') + arrow()
    return group(mushroom('bell'), 'translate(2 7) scale(.43 .85)') + p('M117 54h8l2 63h-12Z', 'url(#stem)') + p('M94 48Q121 18 148 48L143 67L137 62L131 77L124 66L118 75L110 65L102 72Z', '#59594f') + [103, 118, 138].map((x, i) => drop(x, 91 + i % 2 * 15, '#303735', .65)).join('') + arrow()
  }
  if (family === 'exudate') {
    const kind = rest[0]
    const colour = { white: '#fcfbef', red: '#aa3e43', purple: '#89536e', orange: '#d68c43' }[rest[1]] || '#d3dedb'
    // Close-up tissue diagrams also apply to brackets, stipes, and mould colonies;
    // don't imply that every fluid-producing fungus has a cap and central stem.
    if (kind === 'guttation') return p('M15 67Q80 42 145 67L141 108Q80 86 19 108Z', 'url(#stem)') + p('M15 67Q80 37 145 67Q82 87 15 67Z', '#eee4cf') + [[39, 63], [64, 58], [94, 59], [122, 65]].map(([x, y]) => drop(x, y, colour, .8)).join('') + p('M30 85q15-5 26-4M107 84q15 0 24 4', 'none', 'stroke="#ac9b7c" stroke-width=".6"')
    return ground() + p('M26 39Q63 21 111 26L137 81L53 110Z', 'url(#cap)') + p('M26 39L53 110Q94 95 137 81Q84 72 26 39Z', 'url(#stem)') + p('M40 52Q77 70 117 81M45 64Q78 78 99 83M49 82Q66 87 79 90', 'none', 'stroke="#b3a17e" stroke-width=".55"') + drop(121, 93, colour, .95) + drop(134, 116, colour, .5)
  }
  if (family === 'use') return p('M28 48H98L90 111Q64 121 36 111Z', '#ddd9ce') + e(63, 48, 35, 9, '#c6c8ba') + p('M30 62H18V87H34M97 62h11v25H94', 'none') + [42, 62, 83].map(x => p(`M${x} 31q-6-6 0-13`, 'none', 'stroke="#9e9f93"')).join('') + e(120, 81, 19, 33, '#ede7d9') + Array.from({ length: 9 }, (_, i) => p(`M108 ${59 + i * 5}q25 9 25 22`, 'none', 'stroke="#8f8877" stroke-width=".65"')).join('') + p('M110 67h22M108 91h24', 'none', 'stroke-width="1.5"')
  if (family === 'body') {
    if (shape === 'coral') return ground() + p('M78 119V68L49 44V15M49 44L29 28V13M78 82L108 48V16M108 49L134 31V17M78 69L79 33L68 17M78 100L44 78V56M78 87L123 76V56', 'none', 'stroke="#8f7955" stroke-width="2.3"') + p('M49 27l12-10M109 29l-9-16M29 20 20 10M80 42 93 27M44 66 32 52', 'none', 'stroke="#a58e65" stroke-width="1.2"')
    if (shape === 'cup') return ground() + p('M29 36Q79 57 132 36C129 102 30 110 29 36Z', 'url(#cap)') + e(80, 36, 51, 17, '#b29670') + p('M41 36Q80 20 119 36', 'none', 'stroke="#d3b78e"')
    if (shape === 'saddle') return ground() + stem('clavate') + p('M25 60C8 15 56 8 78 36C100 4 151 30 136 64C107 48 100 80 78 59C58 86 46 54 25 60Z', 'url(#cap)') + p('M28 55Q55 26 78 54Q104 29 135 55', 'none', 'stroke="#867153"')
    if (shape === 'bracket' || shape === 'crust') return p('M119 13h20v110h-20Z', '#c6b99f') + [123, 130, 135].map(x => p(`M${x} 18l-2 24 3 33-2 37`, 'none', 'stroke="#9a8869" stroke-width=".6"')).join('') + (shape === 'bracket' ? p('M122 33C24 9 7 76 122 72ZM122 77C41 60 38 117 122 112Z', 'url(#cap)') + p('M35 54Q71 29 119 48M46 61Q83 43 121 57M65 99Q92 80 120 93', 'none', 'stroke="#97805d" stroke-width=".75"') : p('M37 40L118 26L119 105L35 116Z', '#d9c9a9') + p('M42 59l17-7 8 10 20-15 24 6M43 83l23-9 12 10 31-10M43 104l18-10 20 8 27-9', 'none', 'stroke="#a99673" stroke-width=".7"'))
    if (shape === 'puffball' || shape === 'earthstar') return ground() + (shape === 'earthstar' ? p('M80 49L100 72L142 59L123 87L149 109L107 107L81 127L54 106L12 110L39 86L20 60L60 73Z', 'url(#cap)') + c(80, 70, 29, 'url(#stem)') + e(80, 43, 3, 2, '#665d4a') : p('M78 17C18 15 23 106 61 112L66 121H96L102 110C140 101 139 17 78 17Z', 'url(#stem)') + Array.from({ length: 38 }, (_, i) => c(47 + i * 11 % 68, 37 + i * 17 % 58, .8, '#9d8b6c', 'stroke="none"')).join(''))
    if (shape === 'jelly') return ground() + p('M32 97C8 75 38 48 54 67C29 13 82 9 84 48C110 16 151 42 126 66C164 69 145 119 113 106C90 137 51 113 55 92C47 108 36 109 32 97Z', '#d9b273', 'stroke="#9e8053"') + p('M54 93Q70 73 59 54M84 110Q74 82 95 54M113 94Q132 76 120 58', 'none', 'stroke="#ac8755" stroke-width=".8"')
    if (shape === 'morel') return ground() + stem('clavate') + p('M80 8C59 8 29 90 53 94H110C132 91 101 8 80 8Z', 'url(#cap)') + [[77, 26], [65, 46], [91, 45], [58, 71], [81, 70], [104, 72]].map(([x, y]) => p(`M${x} ${y - 8}l7 9-5 10-9-7Z`, '#8e7756', 'stroke="#d8c29c"')).join('')
    if (shape === 'club') return ground() + p('M74 117C83 83 54 54 61 29C66 2 105 5 110 29C117 56 82 84 88 117Z', 'url(#cap)')
    if (shape === 'mould') return p('M24 111Q23 15 133 18Q145 114 24 111Z', '#c2ccad') + p('M28 108L118 36', 'none', 'stroke="#83916d"') + Array.from({ length: 31 }, (_, i) => { const x = 48 + i * 13 % 68; const y = 41 + i * 17 % 53; return p(`M${x} ${y}l2-9m-2 5-4-3m4 3 5-3`, 'none', 'stroke="#f9f7ed" stroke-width="1.1"') }).join('')
    if (shape === 'sporangia') return p('M17 115H144L140 124H20Z', '#bca98a') + [35, 64, 93, 123].map((x, i) => l(x, 115, x, 57 + i % 2 * 14) + e(x, 43 + i % 2 * 14, 9, 21, 'url(#cap)')).join('')
  }
  if (family === 'ecology') {
    if (shape === 'saprotrophic') return p('M24 76H126V116H24Z', '#c5af8b') + e(126, 96, 15, 20, '#e6d5b5') + e(126, 96, 8, 12) + e(126, 96, 3, 5) + p('M31 88l47-3M34 101l51 3M58 77l2 37', 'none', 'stroke="#927b58" stroke-width=".7"') + group(mushroom(), 'translate(25 0) scale(.55 .65)')
    if (shape === 'fungicolous') return mushroom('flat') + group(mushroom('convex'), 'translate(60 -2) scale(.35 .46)')
    if (shape === 'insect') return [34, 50, 66, 82, 98, 114].map((x, i) => e(x, 108 - Math.sin(i) * 3, 10, 9, '#b8b797') + l(x, 116, x - 4, 122)).join('') + group(mushroom(), 'translate(34 9) scale(.55 .75)')
    if (shape === 'moss') return ground() + [25, 43, 61, 80, 99, 119, 137].map((x, i) => p(`M${x} 118V${39 + i % 3 * 12}m0 21-10-12m10 3 10-13m-10 31-12-13m12 3 11-14`, 'none', 'stroke="#7f8e62" stroke-width="1"')).join('')
    if (shape === 'lichenized') return p('M24 94l-10-17 20-7-3-22 23 3 12-26 19 21 26-13 4 23 28 6-17 20 5 25-27-9-23 24-19-18Z', '#b9c39d') + [[51, 73], [78, 54], [108, 79], [82, 96]].map(([x, y]) => e(x, y, 8, 4, '#b1976b')).join('')
    const leaf = p('M24 105Q20 16 128 19Q135 117 24 105Z', '#c7d0b0') + p('M27 103L112 34M58 76L49 47M74 63L112 69', 'none', 'stroke="#7f8c64" stroke-width=".8"')
    if (shape === 'parasitic') return leaf + [[58, 57], [93, 81], [46, 92]].map(([x, y]) => e(x, y, 7, 5, '#bda17d', 'stroke="#8d7158"')).join('')
    return p('M42 76V45m0 24-19-17m19 9 22-17M42 77v22l-20 17m20-17 20 19m-20-10 3 15', 'none', 'stroke="#7d8260" stroke-width="1.1"') + e(42, 38, 24, 23, '#c5ceb1') + group(mushroom(), 'translate(80 24) scale(.47 .78)') + p('M31 113q43 17 77-2M48 110q30 9 54-3', 'none', 'stroke="#a99370" stroke-dasharray="1 3"')
  }
  if (family === 'edibility') {
    if (shape === 'conditional') return p('M34 66H127L116 115H45Z', '#ddd2ba') + e(80, 66, 46, 9, '#eee6d5') + p('M34 78H20v18h18M126 78h15v18h-18M53 45q-9-10 0-23M80 45q-9-10 0-23M108 45q-9-10 0-23', 'none', 'stroke="#8c8068"')
    if (shape === 'psychoactive') return p('M80 109C23 104 27 26 78 26C123 26 125 86 87 87C55 87 55 46 81 46C100 46 101 69 85 69', 'none', 'stroke="#8b7692" stroke-width="1.3"') + [28, 130].map((x, i) => p(`M${x - 5} ${35 + i * 65}h10m-5-5v10`, 'none', 'stroke="#b1a2b5"')).join('')
    const plate = e(80, 73, 37, 35, '#f5f0e4') + e(80, 73, 28, 25, 'none', 'stroke="#b4ac98" stroke-width=".65"') + p('M20 29v24m7-24v24m7-24v24M20 47q7 13 14 0M27 58v62M140 29v91m0-91q-19 19 0 33', 'none', 'stroke="#7b7866"')
    if (shape === 'poisonous' || shape === 'deadly') return plate + p('M80 35L111 94H49Z', '#eee1d4', 'stroke="#986451"') + p('M80 54v19m0 9v2', 'none', 'stroke="#8c5140" stroke-width="2"') + (shape === 'deadly' ? p('M61 110h38', 'none', 'stroke="#8c5140" stroke-width="1.6"') : '')
    if (shape === 'edible' || shape === 'choice') return plate + p('M63 74l12 12 26-32', 'none', 'stroke="#637950" stroke-width="1.8"') + (shape === 'choice' ? p('m80 15 3 7 8 1-6 5 2 8-7-4-7 4 2-8-6-5 8-1Z', '#c7af70', 'stroke-width=".75"') : '')
    return plate + (shape === 'inedible' ? absent() : '<text x="80" y="87" text-anchor="middle" font-family="Georgia,serif" font-size="39" fill="#827961" stroke="none">?</text>')
  }
  if (family === 'microscopy') {
    const lens = c(80, 68, 51, '#f5f1e7', 'stroke="#b4af9b" stroke-width=".7"') + c(80, 68, 47, 'none', 'stroke="#e2ddcd" stroke-width=".6"')
    const forms = {
      globose: c(80, 68, 28, 'url(#spore)'), ellipsoid: e(80, 68, 36, 21, 'url(#spore)', 'transform="rotate(-28 80 68)"'),
      fusiform: p('M38 91Q52 33 123 44Q108 102 38 91Z', 'url(#spore)'), almond: p('M44 94C30 39 99 25 119 43C114 83 71 108 44 94Z', 'url(#spore)'),
      cylindrical: p('M43 91C20 65 91 20 116 44C137 67 69 113 43 91Z', 'url(#spore)'),
    }
    if (forms[shape]) return lens + forms[shape]
    let details = ''
    if (shape === 'warted' || shape === 'spiny') details = Array.from({ length: 19 }, (_, i) => {
      const a = i * Math.PI * 2 / 19; const x = 80 + Math.cos(a) * 35; const y = 68 + Math.sin(a) * 25
      return shape === 'warted' ? c(x, y, 1.6, '#9a8965', 'stroke-width=".5"') : l(x, y, 80 + Math.cos(a) * 41, 68 + Math.sin(a) * 31, 'stroke-width=".85"')
    }).join('')
    if (shape === 'reticulate') details = p('M51 57l48 27M64 45l46 26M52 82l43-36M67 92l43-34', 'none', 'stroke="#8b7856" stroke-width=".8"')
    if (shape === 'smooth') details = p('M54 60Q65 44 85 46', 'none', 'stroke="#fffdf5" stroke-width="1.8"')
    return lens + e(80, 68, 35, 25, 'url(#spore)') + details
  }
  return ''
}

export function renderMycologyArt(icon) {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="480" height="396" viewBox="0 0 160 132"><defs>
    <clipPath id="hymenium"><ellipse cx="80" cy="67" rx="63" ry="40"/></clipPath>
    <linearGradient id="cap" x2=".25" y2="1"><stop stop-color="#eee1c7"/><stop offset=".55" stop-color="#d3bb91"/><stop offset="1" stop-color="#a48d69"/></linearGradient>
    <linearGradient id="stem"><stop stop-color="#d7ccb5"/><stop offset=".45" stop-color="#faf6e9"/><stop offset="1" stop-color="#d6c9ab"/></linearGradient>
    <radialGradient id="gill"><stop stop-color="#d3c29c"/><stop offset="1" stop-color="#f0e5ca"/></radialGradient>
    <linearGradient id="spore" x2=".8" y2="1"><stop stop-color="#eee3c6"/><stop offset="1" stop-color="#c7b58a"/></linearGradient>
    <pattern id="paper" width="7" height="7" patternUnits="userSpaceOnUse"><circle cx="1" cy="2" r=".35" fill="#a29576" opacity=".12"/><circle cx="5" cy="6" r=".25" fill="#b7a991" opacity=".1"/></pattern>
  </defs><rect width="160" height="132" rx="3" fill="#f5f1e6"/><rect width="160" height="132" fill="url(#paper)"/><g fill="none" stroke="#655f50" stroke-width="1" stroke-linecap="round" stroke-linejoin="round">${draw(icon)}</g></svg>`
}

export async function prepareMycologyArt() {
  const directory = path.join(root, 'public/illustrations/mycology')
  await mkdir(directory, { recursive: true })
  let written = 0
  // Sequential small renders keep librsvg/sharp memory use bounded.
  for (const icon of MYCOLOGY_ART_ICONS) {
    const buffer = await sharp(Buffer.from(renderMycologyArt(icon))).webp({ quality: 88 }).toBuffer()
    const file = path.join(directory, `${icon}.webp`)
    let previous
    try { previous = await readFile(file) } catch (error) { if (error.code !== 'ENOENT') throw error }
    if (!previous?.equals(buffer)) { await writeFile(file, buffer); written++ }
  }
  console.info(`Mycology artwork: ${MYCOLOGY_ART_ICONS.length} raster schematics; ${written} updated.`)
}
