export default defineNuxtConfig({
  extends: ['@nuxt-themes/typography', '@nuxt-themes/elements', 'nuxt-umami'],
  modules: ['@nuxtjs/tailwindcss', '@nuxt/content'],
  colorMode: {
    preference: 'light',
  },
  content: {
    api: {
      baseURL: '/_content',
    },
    highlight: {
      theme: 'github-light',
      preload: ['git-commit', 'yaml', 'bash'],
    },
  },
  appConfig: {
    umami: {
      ignoreLocalhost: false,
      host: 'https://metrics.boris.sh',
      id: 'a6f6b02f-799d-4e48-9c45-85460818ddf6',
    },
  },
});
