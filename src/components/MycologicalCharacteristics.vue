<script setup>
import { computed } from 'vue'
import { ChevronDown } from 'lucide-vue-next'
import { getMycologicalCharacteristics } from '../lib/mycology.mjs'
import MycologyGlyph from './MycologyGlyph.vue'

const props = defineProps({ science: { type: Object, required: true }, year: String })
const characteristics = computed(() => getMycologicalCharacteristics(props.science))
</script>

<template>
  <section v-if="characteristics.length" class="mycology-panel" aria-label="Mycological characteristics">
    <header class="mycology-heading">
      <div><p class="eyebrow">THE SPECIES AT A GLANCE</p><h3>Mycological characteristics</h3></div>
      <span>Illustrated from the {{ year }} profile</span>
    </header>
    <p class="mycology-intro">Original field-guide schematics. Labels and source descriptions record the actual features; open any card for the caption's wording, variations, and timing.</p>
    <div class="mycology-grid">
      <details v-for="characteristic in characteristics" :key="characteristic.id" class="mycology-card" :data-characteristic="characteristic.id">
        <summary>
          <span class="mycology-card-heading">{{ characteristic.title }}<ChevronDown :size="13" /></span>
          <span v-if="characteristic.timeline" class="mycology-seasonality">
            <span class="mycology-season-scope">{{ characteristic.timeline.scope }}</span>
            <span class="mycology-season-strip" :class="{ 'is-monthly': characteristic.timeline.kind === 'months' }" role="img" :aria-label="characteristic.timeline.label">
              <span v-for="segment in characteristic.timeline.segments" :key="segment.id" class="mycology-season" :class="{ 'is-active': segment.active }" :data-season="segment.id" :data-active="segment.active" aria-hidden="true"><span class="mycology-season-marker">{{ segment.active ? '●' : '·' }}</span>{{ characteristic.timeline.kind === 'months' ? segment.label.slice(0, 3) : segment.label }}</span>
            </span>
            <span class="mycology-season-label">{{ characteristic.timeline.label }}</span>
          </span>
          <span v-else class="mycology-variants">
            <span v-for="item in characteristic.items" :key="item.id" class="mycology-variant" :class="{ 'is-unknown': item.id === 'unknown', 'is-tentative': item.tentative }" :data-value="item.id">
              <MycologyGlyph :icon="item.icon" :color="item.color" />
              <span class="mycology-variant-label">{{ item.label }}<small v-if="item.tentative">Variable / qualified</small></span>
            </span>
          </span>
          <span v-if="characteristic.id === 'flesh'" class="mycology-diagram-note">Cut surface → reaction; timing and extent vary</span>
          <span v-if="characteristic.id === 'maturation'" class="mycology-diagram-note">Fresh → changed</span>
        </summary>
        <div class="mycology-evidence">
          <template v-if="characteristic.evidence.length">
            <p class="mycology-source-title">IN THE ORIGINAL DESCRIPTION</p>
            <p v-for="(row, index) in characteristic.evidence" :key="index"><strong>{{ row.label }}:</strong> {{ row.text }}</p>
          </template>
          <p v-else>This characteristic is not specified in the latest scientific profile.</p>
        </div>
      </details>
    </div>
    <p class="mycology-key"><span class="mycology-key-dot"></span> Coloured circles show recorded spore colours; seasonal bands follow named periods in the profile. A question mark means unspecified or not confidently classified.</p>
  </section>
</template>

<style scoped>
.mycology-panel{margin:29px 0 34px;padding:25px;background:var(--surface);border:1px solid var(--line);border-radius:6px}
.mycology-heading{display:flex;justify-content:space-between;align-items:flex-end;gap:20px}
.mycology-heading .eyebrow{font-size:8px;letter-spacing:1.7px;color:var(--muted);margin-bottom:7px}
.mycology-heading h3{font-family:var(--serif);font-size:31px;font-weight:400;line-height:1.15;letter-spacing:-.3px}
.mycology-heading>span{font-size:9px;color:var(--muted);white-space:nowrap;padding-bottom:3px}
.mycology-intro{font-size:11px;line-height:1.8;color:var(--text-secondary);margin:12px 0 21px;max-width:690px}
.mycology-grid{columns:4;column-gap:14px}
.mycology-card{background:var(--surface-raised);border:1px solid var(--line);border-radius:5px;min-width:0;overflow:hidden;break-inside:avoid;margin-bottom:14px}
.mycology-card>summary{list-style:none;cursor:pointer;padding:13px 11px 16px}
.mycology-card>summary::-webkit-details-marker{display:none}
.mycology-card>summary:hover{background:var(--surface-hover)}
.mycology-card-heading{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:10px;font-weight:500;color:var(--text);line-height:1.45;min-height:29px;border-bottom:1px solid var(--line);padding-bottom:9px}
.mycology-card-heading>svg{color:var(--muted);transition:transform .2s}
.mycology-card[open] .mycology-card-heading>svg{transform:rotate(180deg)}
.mycology-variants{display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-start;gap:15px 10px;padding-top:14px}
.mycology-variant{display:flex;flex-direction:column;align-items:center;gap:8px;min-width:0;max-width:100%;flex:1 1 92px}
.mycology-glyph{display:block;width:116px;max-width:100%;height:96px;object-fit:contain;border-radius:3px;padding:0}
.mycology-swatch{width:80px;height:80px;background:none}
.mycology-unknown{width:48px;height:48px;background:none;color:var(--muted)}
.mycology-variant-label{font-size:14px;line-height:1.5;text-align:center;color:var(--text-secondary);max-width:140px;overflow-wrap:anywhere}
.mycology-diagram-note{display:block;margin-top:13px;color:var(--text-secondary);font-size:12px;line-height:1.6;text-align:center}
.mycology-card[data-characteristic="seasonality"]{column-span:all}
.mycology-seasonality{display:block;padding-top:16px}
.mycology-season-scope{display:block;color:var(--text-secondary);font-size:14px;margin-bottom:12px}
.mycology-season-strip{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}
.mycology-season-strip.is-monthly{grid-template-columns:repeat(12,minmax(0,1fr))}
.mycology-season{display:flex;align-items:center;justify-content:center;gap:7px;padding:10px 5px;border:1px solid var(--line);border-radius:3px;color:var(--text-secondary);font-size:14px;background:var(--background)}
.mycology-season.is-active{border-color:#b58a68;background:#34281e;color:#f2d6b7;text-decoration:underline;text-underline-offset:4px}
.mycology-season-marker{font-size:12px}
.mycology-season-label{display:block;margin-top:11px;font-size:14px;color:var(--text-secondary)}
.mycology-variant-label>small{display:block;font-size:7px;color:var(--accent);margin-top:4px;letter-spacing:.2px}
.is-tentative .mycology-variant-label{border-bottom:1px dotted #825c47;padding-bottom:3px}
.is-unknown .mycology-variant-label{color:var(--muted);font-size:9px}
.mycology-evidence{padding:13px 12px 15px;border-top:1px solid var(--line);background:var(--background);font-size:10px;color:var(--text-secondary);overflow-wrap:anywhere}
.mycology-evidence p{line-height:1.85;margin:0 0 9px}
.mycology-evidence p:last-child{margin-bottom:0}
.mycology-evidence strong{font-weight:500;color:var(--text)}
.mycology-evidence .mycology-source-title{font-size:7px;letter-spacing:1.1px;color:var(--muted);margin-bottom:8px}
.mycology-key{font-size:9px;color:var(--muted);display:flex;align-items:baseline;gap:7px;margin-top:17px;line-height:1.8}
.mycology-key-dot{display:inline-block;width:5px;height:5px;background:var(--accent);border-radius:50%;flex-shrink:0}
@media(max-width:1100px){.mycology-grid{columns:3}.mycology-heading h3{font-size:29px}}
@media(max-width:760px){.mycology-panel{padding:18px}.mycology-grid{columns:2}.mycology-heading{align-items:flex-start;flex-direction:column;gap:10px}.mycology-heading>span{font-size:8px}.mycology-heading h3{font-size:29px}.mycology-intro{font-size:10px}.mycology-key{font-size:8px}}
@media(max-width:760px){.mycology-season-strip.is-monthly{grid-template-columns:repeat(6,minmax(0,1fr))}}
@media(max-width:420px){.mycology-panel{padding:14px 11px;margin-block:24px}.mycology-grid{columns:1}.mycology-card>summary{padding:12px 10px 15px}.mycology-card-heading{font-size:14px}.mycology-variant{flex-basis:90px}.mycology-evidence{font-size:14px;padding-inline:10px}.mycology-heading h3{font-size:27px}.mycology-season-strip{grid-template-columns:repeat(2,minmax(0,1fr))}.mycology-season-strip.is-monthly{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(forced-colors:active){.mycology-season.is-active{border:2px solid Highlight;color:CanvasText;background:Canvas}.mycology-season-marker{forced-color-adjust:none}}
</style>
