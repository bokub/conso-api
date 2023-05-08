<template>
  <div>
    <div class="text-center mt-11 mb-24">
      <h1 class="title">Conso API</h1>

      <p class="text-neutral-500">La passerelle open-source pour accéder à vos données Linky</p>
    </div>
    <ContentDoc :head="false" />
  </div>
</template>

<script setup lang="ts">
  useHead({
    title: 'Conso API - La passerelle open-source pour accéder à vos données Linky',
  });
</script>

<style scoped>
  .title {
    @apply inline-block bg-clip-text bg-gradient-to-r from-blue-500 to-cyan-500 text-7xl font-bold tracking-[-.075em] mb-4 text-transparent;
  }
</style>
