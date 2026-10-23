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
    <p class="mycology-intro">Shapes, structures, and ways of life. Open a characteristic to see the original description. Multiple forms can reflect age or variation.</p>
    <div class="mycology-grid">
      <details v-for="characteristic in characteristics" :key="characteristic.id" class="mycology-card" :data-characteristic="characteristic.id">
        <summary>
          <span class="mycology-card-heading">{{ characteristic.title }}<ChevronDown :size="13" /></span>
          <span class="mycology-variants">
            <span v-for="item in characteristic.items" :key="item.id" class="mycology-variant" :class="{ 'is-unknown': item.id === 'unknown', 'is-tentative': item.tentative }" :data-value="item.id">
              <MycologyGlyph :icon="item.icon" :color="item.color" />
              <span class="mycology-variant-label">{{ item.label }}<small v-if="item.tentative">Variable / qualified</small></span>
            </span>
          </span>
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
    <p class="mycology-key"><span class="mycology-key-dot"></span> Illustrations follow the recorded wording. A question mark means unspecified or not confidently classified.</p>
  </section>
</template>

<style scoped>
.mycology-panel{margin:29px 0 34px;padding:25px;background:var(--surface);border:1px solid var(--line);border-radius:4px}
.mycology-heading{display:flex;justify-content:space-between;align-items:flex-end;gap:20px}
.mycology-heading .eyebrow{font-size:8px;letter-spacing:1.7px;color:var(--muted);margin-bottom:7px}
.mycology-heading h3{font-family:var(--serif);font-size:31px;font-weight:400;line-height:1.15;letter-spacing:-.3px}
.mycology-heading>span{font-size:9px;color:var(--muted);white-space:nowrap;padding-bottom:3px}
.mycology-intro{font-size:11px;line-height:1.8;color:var(--text-secondary);margin:12px 0 21px;max-width:690px}
.mycology-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;align-items:start}
.mycology-card{background:var(--surface-raised);border:1px solid var(--line);border-radius:3px;min-width:0;overflow:hidden}
.mycology-card>summary{list-style:none;cursor:pointer;padding:13px 11px 16px}
.mycology-card>summary::-webkit-details-marker{display:none}
.mycology-card>summary:hover{background:var(--surface-hover)}
.mycology-card-heading{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:10px;font-weight:500;color:var(--text);line-height:1.45;min-height:29px;border-bottom:1px solid var(--line);padding-bottom:9px}
.mycology-card-heading>svg{color:var(--muted);transition:transform .2s}
.mycology-card[open] .mycology-card-heading>svg{transform:rotate(180deg)}
.mycology-variants{display:flex;flex-wrap:wrap;justify-content:center;align-items:flex-start;gap:13px 6px;padding-top:13px}
.mycology-variant{display:flex;flex-direction:column;align-items:center;gap:5px;min-width:0;max-width:100%;flex:1 1 67px}
.mycology-glyph{display:block;width:76px;max-width:100%;height:64px;background:#deded0;border-radius:7px;padding:3px}
.mycology-variant-label{font-size:10px;line-height:1.45;text-align:center;color:var(--text-secondary);max-width:102px;overflow-wrap:anywhere}
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
@media(max-width:1100px){.mycology-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.mycology-heading h3{font-size:29px}}
@media(max-width:760px){.mycology-panel{padding:18px}.mycology-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.mycology-heading{align-items:flex-start;flex-direction:column;gap:10px}.mycology-heading>span{font-size:8px}.mycology-heading h3{font-size:29px}.mycology-intro{font-size:10px}.mycology-key{font-size:8px}}
@media(max-width:420px){.mycology-panel{padding:14px 11px;margin-block:24px}.mycology-grid{gap:7px}.mycology-card>summary{padding:10px 8px 13px}.mycology-card-heading{font-size:9px}.mycology-variant{flex-basis:57px}.mycology-glyph{width:65px;height:55px}.mycology-variant-label{font-size:9px}.mycology-evidence{font-size:10px;padding-inline:10px}.mycology-heading h3{font-size:27px}}
</style>
