<template>
  <div>
    <CodeBlock :code="token" lang="yaml"></CodeBlock>

    <ProseP v-if="prmList.length">
      Si vous utilisez l'outil en ligne de commande &nbsp;
      <ProseA href="https://github.com/bokub/linky#readme"><ProseCodeInline>@bokub/linky</ProseCodeInline></ProseA>
      , vous pouvez vous authentifier avec la commande suivante:
    </ProseP>

    <CodeBlock v-if="token" :code="`linky auth -t ${token}`" lang="bash"></CodeBlock>

    <ProseP v-if="prmList.length">
      Votre token vous permet d'accéder pendant 3 ans aux données des PRMs suivants:
    </ProseP>
    <ProseUl v-if="prmList.length">
      <ProseLi v-for="prm in prmList" :key="prm">
        <ProseCodeInline>{{ prm }}</ProseCodeInline>
      </ProseLi>
    </ProseUl>
  </div>
</template>

<script setup lang="ts">
  import { useToken } from '../composables/useToken';

  const token = useToken();

  let prmList = [];
  try {
    prmList = JSON.parse(atob(token.split('.')[1])).sub;
  } catch (e) {}
</script>
