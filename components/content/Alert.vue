<template>
  <div class="p-4 rounded-md bg-yellow-50">
    <div class="flex">
      <div v-if="icon" class="flex-shrink-0 mr-3">
        <Icon class="w-5 h-5 text-yellow-400" aria-hidden="true" :name="icon" />
      </div>
      <div class="text-sm text-yellow-700">
        <ContentSlot :use="$slots.default" unwrap="p" />
      </div>
    </div>
  </div>
</template>

<script setup>
  defineProps({
    icon: {
      type: String,
      default: 'heroicons-outline:exclamation',
    },
  });
</script>
