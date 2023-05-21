export default defineNuxtConfig({
  extends: ['@nuxt-themes/typography', '@nuxt-themes/elements'],
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
      preload: [
          'git-commit', 'yaml', 'bash'
      ],
    },
  },
});
