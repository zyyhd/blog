<script setup>
import { computed } from 'vue'

const props = defineProps({
  page: { type: Number, required: true },
  totalPages: { type: Number, required: true },
})

const emit = defineEmits(['change'])

const items = computed(() => {
  const { page, totalPages } = props
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => ({ type: 'page', value: i + 1 }))
  }
  const set = new Set([1, 2, totalPages - 1, totalPages, page - 1, page, page + 1])
  const list = [...set].filter((n) => n >= 1 && n <= totalPages).sort((a, b) => a - b)
  const result = []
  let prev = 0
  for (const n of list) {
    if (n - prev > 1) result.push({ type: 'ellipsis' })
    result.push({ type: 'page', value: n })
    prev = n
  }
  return result
})

function go(p) {
  if (p >= 1 && p <= props.totalPages && p !== props.page) emit('change', p)
}
</script>

<template>
  <div v-if="totalPages > 1" class="pagination">
    <button class="page-btn" :disabled="page <= 1" @click="go(page - 1)">‹</button>
    <template v-for="(item, i) in items" :key="i">
      <span v-if="item.type === 'ellipsis'" class="page-ellipsis">…</span>
      <button v-else class="page-btn" :class="{ active: item.value === page }" @click="go(item.value)">
        {{ item.value }}
      </button>
    </template>
    <button class="page-btn" :disabled="page >= totalPages" @click="go(page + 1)">›</button>
  </div>
</template>
