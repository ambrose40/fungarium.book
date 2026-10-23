<script setup>
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { ChevronDown, Search, X } from 'lucide-vue-next'
import { normalizeSearch, setTaxonomyFilter } from '../lib/catalog.mjs'

const props = defineProps({
  field: { type: String, required: true },
  entries: { type: Array, required: true },
  selected: { type: String, default: '' },
})
const route = useRoute()
const find = ref('')
const isGenus = computed(() => props.field === 'genus')
const title = computed(() => isGenus.value ? 'Genera' : 'Families')
const singular = computed(() => isGenus.value ? 'genus' : 'family')
const shown = computed(() => props.entries.filter(item => normalizeSearch(item.name).includes(normalizeSearch(find.value))))
function link(name = '') {
  return { name: 'gallery', query: setTaxonomyFilter(route.query, props.field, name) }
}
</script>

<template>
  <details class="taxonomy-filter" :data-taxonomy="field" open>
    <summary>
      <span class="taxonomy-section-title"><span class="eyebrow">BROWSE BY {{ singular.toUpperCase() }}</span><span class="taxonomy-title">{{ title }} <span class="count">{{ entries.length }}</span></span></span>
      <span v-if="selected" class="taxonomy-selected">{{ selected }}</span>
      <ChevronDown :size="16" />
    </summary>
    <div class="taxonomy-filter-body">
      <div class="taxonomy-tools">
        <label class="taxonomy-find"><Search :size="13" /><input v-model="find" type="text" :aria-label="`Find a ${singular}`" :placeholder="`Find ${title.toLowerCase()}…`" autocomplete="off" /><button v-if="find" type="button" :aria-label="`Clear ${singular} list search`" @click="find = ''"><X :size="12" /></button></label>
        <RouterLink :to="link()" class="taxonomy-all" :aria-current="!selected ? 'true' : undefined" :aria-label="selected ? `Clear ${singular} filter` : `All ${title.toLowerCase()}`">{{ selected ? 'Clear filter' : `All ${title.toLowerCase()}` }}</RouterLink>
      </div>
      <nav class="taxonomy-links" :aria-label="`${title} quick filters`" tabindex="0">
        <RouterLink v-for="item in shown" :key="item.name" :to="link(item.name)" class="taxonomy-link" :class="{ 'is-selected': selected === item.name }" :aria-current="selected === item.name ? 'true' : undefined" :aria-label="`Show ${singular} ${item.name} (${item.count} taxa)`">
          <span :class="{ 'genus-name': isGenus }">{{ item.name }}</span><small>{{ item.count }}</small>
        </RouterLink>
        <p v-if="!shown.length" class="taxonomy-no-matches">No {{ title.toLowerCase() }} match “{{ find }}”.</p>
      </nav>
    </div>
  </details>
</template>

<style scoped>
.taxonomy-filter{border:1px solid var(--line);border-radius:4px;background:#111110;min-width:0}
.taxonomy-filter>summary{list-style:none;display:flex;align-items:center;gap:12px;cursor:pointer;padding:15px 17px}
.taxonomy-filter>summary::-webkit-details-marker{display:none}
.taxonomy-section-title{display:flex;flex-direction:column;gap:5px;flex:1;min-width:0}
.taxonomy-section-title .eyebrow{color:var(--muted);font-size:7px;letter-spacing:1.5px}
.taxonomy-title{display:flex;align-items:center;gap:10px;font-family:var(--serif);font-size:24px;line-height:1}
.taxonomy-title .count{font-size:8px;padding:3px 6px}
.taxonomy-filter>summary>svg{color:var(--muted);transition:transform .2s}
.taxonomy-filter[open]>summary>svg{transform:rotate(180deg)}
.taxonomy-selected{font-size:10px;color:var(--accent);max-width:45%;overflow-wrap:anywhere}
.taxonomy-filter-body{padding:0 17px 15px}
.taxonomy-tools{display:flex;align-items:center;gap:14px;margin-bottom:12px;padding-top:2px}
.taxonomy-find{display:flex;align-items:center;gap:7px;flex:1;min-width:0;color:var(--muted);border:1px solid var(--line);border-radius:3px;padding:7px 9px;background:var(--background)}
.taxonomy-find input{width:100%;min-width:0;border:0;outline:0;background:none;font-size:10px;color:var(--text)}
.taxonomy-find input:focus-visible{outline:1px solid var(--accent);outline-offset:3px}
.taxonomy-find input::placeholder{color:var(--muted)}
.taxonomy-find button{display:flex;padding:0;background:none;color:var(--muted)}
.taxonomy-all{font-size:9px;white-space:nowrap;color:var(--text-secondary);border-bottom:1px solid transparent;padding-bottom:3px}
.taxonomy-all[aria-current=true],.taxonomy-all:hover{color:var(--accent);border-color:#77554c}
.taxonomy-links{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));align-content:start;gap:6px;max-height:157px;overflow-y:auto;overscroll-behavior:contain;scrollbar-width:thin;scrollbar-color:#514b40 #111110;padding:2px 5px 3px 2px}
.taxonomy-link{display:flex;align-items:center;justify-content:space-between;gap:7px;min-width:0;padding:7px 8px;background:var(--surface-raised);border:1px solid #2d2d28;border-radius:3px;color:var(--text-secondary);font-size:10px;line-height:1.5}
.taxonomy-link>span{overflow-wrap:anywhere}
.taxonomy-link .genus-name{font-style:italic}
.taxonomy-link small{font-size:8px;color:var(--muted);flex-shrink:0}
.taxonomy-link:hover{background:#2c2520;border-color:#6b4b3d;color:#f1c5af}
.taxonomy-link.is-selected{background:var(--accent-soft);border-color:#9e5b4a;color:#f1c5af}
.taxonomy-link.is-selected small{color:#e7b29e}
.taxonomy-no-matches{grid-column:1/-1;font-size:10px;color:var(--muted);padding:8px 0}
@media(max-width:1100px){.taxonomy-links{grid-template-columns:repeat(2,minmax(0,1fr))}}
@media(max-width:600px){.taxonomy-filter>summary{padding:13px 14px}.taxonomy-filter-body{padding:0 14px 13px}.taxonomy-title{font-size:23px}.taxonomy-links{max-height:140px}.taxonomy-link{font-size:10px}.taxonomy-find input{font-size:10px}}
</style>
