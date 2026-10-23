<script setup>
import { computed, nextTick, ref } from 'vue'
import { ChevronDown, Plus, Search, X } from 'lucide-vue-next'

const props = defineProps({ fields: { type: Array, required: true }, searches: { type: Object, required: true } })
const emit = defineEmits(['change', 'clear'])
const selected = ref('')
const added = ref([])
const activeCount = computed(() => Object.keys(props.searches).length)
const shown = computed(() => props.fields.filter(field => added.value.includes(field.id) || props.searches[field.id]))
const available = computed(() => props.fields.filter(field => !shown.value.some(item => item.id === field.id)))
async function add() {
  if (!selected.value) return
  const id = selected.value
  added.value.push(id)
  selected.value = ''
  await nextTick()
  document.getElementById(`description-search-${id}`)?.focus()
}
function remove(id) {
  added.value = added.value.filter(value => value !== id)
  emit('change', id, '')
}
function clear() { added.value = []; emit('clear') }
</script>

<template>
  <details class="scientific-text-search">
    <summary><Search :size="16" /><span>Search scientific descriptions</span><span v-if="activeCount" class="count">{{ activeCount }} active</span><ChevronDown :size="16" /></summary>
    <div class="scientific-text-search-body">
      <p>Search the original text in specific categories from the latest scientific profile. All entered words must match within each category; combine different categories with AND.</p>
      <div class="scientific-search-tools">
        <label for="scientific-category-picker">Add a search field</label>
        <select id="scientific-category-picker" v-model="selected"><option value="">Choose a scientific category…</option><option v-for="field in available" :key="field.id" :value="field.id">{{ field.label }} ({{ field.count }} taxa)</option></select>
        <button type="button" class="button button-outline" :disabled="!selected" @click="add"><Plus :size="14" /> Add field</button>
        <button type="button" class="text-button" :disabled="!activeCount && !added.length" @click="clear">Clear description searches <X :size="13" /></button>
      </div>
      <div v-if="shown.length" class="scientific-search-grid">
        <div v-for="field in shown" :key="field.id" class="scientific-search-field">
          <label :for="`description-search-${field.id}`">{{ field.label }}</label>
          <div><input :id="`description-search-${field.id}`" :value="searches[field.id] || ''" type="text" :aria-label="`Search ${field.label} descriptions`" :placeholder="`Text in ${field.label.toLowerCase()}…`" autocomplete="off" @input="emit('change', field.id, $event.target.value)" /><button type="button" class="icon-button" :aria-label="`Remove ${field.label} search field`" @click="remove(field.id)"><X :size="15" /></button></div>
        </div>
      </div>
      <p v-else class="scientific-search-empty">Choose any category, including specialist structures such as peridium, plasmodium, or sporangia when recorded.</p>
    </div>
  </details>
</template>

<style scoped>
.scientific-text-search{margin:18px 0;border:1px solid var(--line);border-radius:4px;background:#101010;min-width:0}
.scientific-text-search>summary{display:flex;align-items:center;gap:10px;padding:15px 17px;cursor:pointer;list-style:none;font-size:13px}
.scientific-text-search>summary::-webkit-details-marker{display:none}
.scientific-text-search>summary>span:first-of-type{flex:1;min-width:0}
.scientific-text-search>summary>svg{color:var(--accent)}
.scientific-text-search>summary>svg:last-child{color:var(--muted);transition:transform .2s}
.scientific-text-search[open]>summary>svg:last-child{transform:rotate(180deg)}
.scientific-text-search-body{padding:0 17px 17px}
.scientific-text-search-body>p{font-size:11px;color:var(--muted)}
.scientific-search-tools{display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin:15px 0}
.scientific-search-tools>label{font-size:11px;color:var(--text-secondary)}
.scientific-search-tools>select{flex:1;min-width:0;max-width:320px;border:1px solid #49463e;border-radius:3px;padding:11px;background:var(--surface);font-size:12px}
.scientific-search-tools>.button{min-height:44px;padding:9px 12px;gap:7px;font-size:11px}
.scientific-search-tools>.text-button{font-size:10px;color:var(--accent)}
.scientific-search-tools button:disabled{opacity:.5}
.scientific-search-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}
.scientific-search-field{min-width:0}
.scientific-search-field>label{display:block;font-size:11px;color:var(--text-secondary);margin-bottom:6px}
.scientific-search-field>div{display:flex;align-items:center;border:1px solid #49463e;border-radius:3px;background:var(--surface)}
.scientific-search-field input{flex:1;width:0;min-width:0;padding:12px;border:0;background:none;color:var(--text);font-size:13px}
.scientific-search-field .icon-button{border-radius:2px;min-height:44px;color:var(--muted)}
.scientific-search-field input::placeholder{color:var(--muted)}
@media(max-width:600px){.scientific-text-search>summary{padding:13px;font-size:12px}.scientific-text-search-body{padding:0 13px 13px}.scientific-search-grid{grid-template-columns:1fr}.scientific-search-tools>label{width:100%}.scientific-search-tools>select{flex-basis:100%;width:100%;max-width:none;font-size:16px}.scientific-search-tools>.button{flex:1}.scientific-search-tools>.text-button{width:100%;min-height:40px}.scientific-search-field input{font-size:16px}}
</style>
