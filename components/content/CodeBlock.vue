<template>
  <ProseCode :language="lang" :code="code">
    <component is="style" v-html="highlightedCode.styles"></component>
    <code v-if="code" class="p-4 whitespace-pre-wrap" v-html="highlightedCode.code"></code>
  </ProseCode>
</template>

<script setup lang="ts">
  import { useShikiHighlighter } from '@nuxt/content/transformers/shiki/highlighter';
  import { computedAsync } from '@vueuse/core';
  const highlighter = useShikiHighlighter();

  const props = defineProps({
    code: {
      type: String,
      required: true,
    },
    lang: {
      type: String,
      required: true,
    },
  });

  const highlightedCode = computedAsync(
    () => {
      return highlighter.getHighlightedCode(props.code, props.lang, 'github-light');
    },
    {
      code: props.code,
      styles: '',
    }
  );
</script>

<style scoped>
  code :deep(.line) {
    word-break: break-word;
  }
</style>
