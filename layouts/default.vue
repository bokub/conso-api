<template>
  <div class="container mx-auto max-w-4xl sm:pb-10">
    <div class="flex flex-col sm:flex-row justify-between px-4 py-4 gap-y-3 relative sm:items-end">
      <!-- Logo-->
      <NuxtLink to="/">
        <div class="logo flex flex-row gap-2">
          <img src="/zap.svg" width="20" alt="Conso API Logo" />
          <div>Conso API</div>
        </div>
      </NuxtLink>
      <!-- Navigation -->
      <div>
        <NuxtLink to="/" active-class="font-bold" class="mr-6">Accueil</NuxtLink>
        <NuxtLink to="/exemples" active-class="font-bold" class="mr-6">Exemples</NuxtLink>
        <NuxtLink to="/documentation" active-class="font-bold" class="mr-6">Documentation</NuxtLink>
        <a href="https://github.com/bokub/conso-api#readme" title="GitHub" target="_blank">
          <Icon name="fa-brands:github" class="w-5 h-5" />
        </a>
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
