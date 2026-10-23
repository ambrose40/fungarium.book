<script setup>
defineProps({ size: { type: [Number, String], default: 29 } })
</script>
<template>
  <svg :width="size" :height="size" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 18C3 3 29 3 29 18c-7 3-19 3-26 0Z"/><path d="M13 20c1 4 0 7-2 9h10c-2-2-3-5-2-9M5 18c6-3 16-3 22 0M8 12l2-1m8-3 2 1m2 4 1 1M14 12l1 1"/></svg>
</template>
