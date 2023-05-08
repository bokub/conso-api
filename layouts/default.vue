<template>
  <div class="container mx-auto max-w-4xl sm:pt-6 sm:pb-10">
    <div class="flex justify-between wrapper px-4 py-4 sm:px-8 relative">
      <!-- Navigation -->
      <NuxtLink to="/">
        <div class="logo absolute bottom-[20px] flex flex-row gap-2">
          <img src="/zap.svg" width="20" alt="Conso API Logo" />
          <div>Conso API</div>
        </div>
      </NuxtLink>
      <div>
        <NuxtLink to="/" active-class="font-bold" class="mr-6">Accueil</NuxtLink>
        <NuxtLink to="/exemples" active-class="font-bold" class="mr-6">Exemples</NuxtLink>
        <NuxtLink to="/documentation" active-class="font-bold" class="mr-6">Documentation</NuxtLink>
      </div>
    </div>
    <main class="px-4 py-8 bg-white sm:px-8 sm:shadow ring-1 ring-gray-200 sm:rounded-lg">
      <slot />
    </main>
  </div>
</template>

<style scoped>
  .logo {
    @apply text-black font-bold text-3xl leading-none tracking-[-.075em];
  }
</style>
