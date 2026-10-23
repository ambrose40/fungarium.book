<script setup>
import { computed, ref } from 'vue'
import { ChevronDown, X, SlidersHorizontal } from 'lucide-vue-next'
import MycologyGlyph from './MycologyGlyph.vue'

const props = defineProps({
  groups: { type: Array, required: true },
  selections: { type: Object, required: true },
  counts: { type: Object, required: true },
})
const emit = defineEmits(['change', 'clear'])
const opened = ref({})
const activeCount = computed(() => Object.values(props.selections).reduce((sum, values) => sum + values.length, 0))
function toggle(group, value) {
  const selected = props.selections[group] || []
  emit('change', group, selected.includes(value) ? selected.filter(item => item !== value) : [...selected, value])
}
function count(group, option) { return props.counts[group]?.[option.value] ?? option.count }
</script>

<template>
  <section class="characteristic-filters" aria-labelledby="characteristic-filters-title">
    <div class="characteristic-filters-heading">
      <div><p class="eyebrow"><SlidersHorizontal :size="12" /> REFINE THE DISCOVERY</p><h3 id="characteristic-filters-title">Mycological filters <span v-if="activeCount" class="count">{{ activeCount }} selected</span></h3></div>
      <button type="button" class="text-button characteristic-clear-all" :disabled="!activeCount" @click="emit('clear')">Clear characteristics <X :size="13" /></button>
    </div>
    <p class="characteristic-filter-help">Add characteristics to your genus or family filter. Match any checked value within a group; combine different groups with AND.</p>
    <div class="characteristic-filter-grid">
      <details v-for="group in groups" :key="group.id" class="characteristic-filter-group" :data-characteristic-filter="group.id" :open="opened[group.id] || false" @toggle="opened[group.id] = $event.target.open">
        <summary><span><strong>{{ group.title }}</strong><small :class="{ 'has-selection': selections[group.id]?.length }">{{ selections[group.id]?.length ? `${selections[group.id].length} selected` : 'Any' }}</small></span><ChevronDown :size="14" /></summary>
        <div v-if="opened[group.id]" class="characteristic-options-body">
          <fieldset class="characteristic-options"><legend class="sr-only">{{ group.title }}</legend>
            <label v-for="option in group.options" :key="option.value" class="characteristic-option" :class="{ 'is-selected': selections[group.id]?.includes(option.value), 'has-no-matches': !count(group.id, option) }">
              <input type="checkbox" :checked="selections[group.id]?.includes(option.value) || false" :aria-label="`${group.title}: ${option.label}`" @change="toggle(group.id, option.value)" />
              <MycologyGlyph :icon="option.icon" :color="option.color" />
              <span>{{ option.label }}</span><small>{{ count(group.id, option) }}</small>
            </label>
          </fieldset>
          <button v-if="selections[group.id]?.length" type="button" class="text-button characteristic-group-clear" :aria-label="`Clear ${group.title} filter`" @click="emit('change', group.id, [])">Clear this group <X :size="12" /></button>
        </div>
      </details>
    </div>
    <p class="characteristic-filter-note">From the latest scientific profiles, including recorded variation. Counts reflect your other filters; unspecified information is kept separate from explicit absence.</p>
  </section>
</template>

<style scoped>
.characteristic-filters{margin:20px 0 16px;padding:18px;border:1px solid var(--line);border-radius:4px;background:#101010}
.characteristic-filters-heading{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:9px}
.characteristic-filters-heading .eyebrow{display:flex;align-items:center;gap:6px;font-size:7px;color:var(--muted);letter-spacing:1.4px;margin-bottom:7px}
.characteristic-filters-heading h3{display:flex;align-items:center;flex-wrap:wrap;gap:10px;font:400 27px/1.2 var(--serif)}
.characteristic-filters-heading .count{font-size:8px}
.characteristic-clear-all{font-size:10px;color:var(--accent);flex-shrink:0}
.characteristic-clear-all:disabled{color:#77746e;cursor:default}
.characteristic-filter-help{font-size:10px;color:var(--text-secondary);margin-bottom:16px}
.characteristic-filter-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:8px;align-items:start}
.characteristic-filter-group{min-width:0;border:1px solid #33332e;border-radius:3px;background:var(--surface)}
.characteristic-filter-group>summary{display:flex;align-items:center;justify-content:space-between;gap:8px;list-style:none;padding:11px 12px;cursor:pointer;min-height:60px}
.characteristic-filter-group>summary::-webkit-details-marker{display:none}
.characteristic-filter-group>summary:hover{background:var(--surface-hover)}
.characteristic-filter-group>summary>span{min-width:0}
.characteristic-filter-group strong{display:block;font-size:10px;line-height:1.5;font-weight:500;overflow-wrap:anywhere}
.characteristic-filter-group summary small{display:block;font-size:8px;color:var(--muted);margin-top:3px}
.characteristic-filter-group summary small.has-selection{color:var(--accent)}
.characteristic-filter-group summary>svg{color:var(--muted);transition:transform .2s}
.characteristic-filter-group[open] summary>svg{transform:rotate(180deg)}
.characteristic-options-body{border-top:1px solid var(--line);padding:6px}
.characteristic-options{border:0;padding:0;margin:0;min-width:0;max-height:222px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#514b40 #141414}
.characteristic-option{display:flex;align-items:center;gap:7px;padding:7px 5px;cursor:pointer;border-radius:3px;font-size:10px;line-height:1.4;color:var(--text-secondary)}
.characteristic-option:hover,.characteristic-option.is-selected{background:#2b241f;color:#f1c5af}
.characteristic-option input{margin:0;accent-color:#bb6856;flex-shrink:0;width:13px;height:13px}
.characteristic-option .mycology-glyph{width:32px;height:27px;padding:1px;background:#deded0;border-radius:3px;flex-shrink:0}
.characteristic-option>span{flex:1;min-width:0;overflow-wrap:anywhere}
.characteristic-option>small{font-size:8px;flex-shrink:0;color:var(--muted)}
.characteristic-option.has-no-matches:not(.is-selected){color:#97948c}
.characteristic-group-clear{font-size:9px;color:var(--accent);padding:9px 5px 4px}
.characteristic-filter-note{font-size:8px;color:var(--muted);line-height:1.8;margin-top:13px}
@media(max-width:1000px){.characteristic-filter-grid{grid-template-columns:repeat(3,minmax(0,1fr))}}
@media(max-width:700px){.characteristic-filter-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.characteristic-filters{padding:14px}.characteristic-filters-heading{align-items:flex-start;flex-direction:column;gap:11px}.characteristic-filters-heading h3{font-size:25px}.characteristic-filter-group>summary{padding:10px}.characteristic-filter-help{font-size:9px}}
@media(max-width:380px){.characteristic-filter-grid{grid-template-columns:1fr}.characteristic-filter-group>summary{min-height:48px}.characteristic-option{font-size:11px}.characteristic-options{max-height:190px}}
</style>
