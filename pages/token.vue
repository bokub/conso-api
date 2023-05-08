<template>
  <ContentDoc :head="false" />
</template>

<script setup lang="ts">
  import confetti from 'canvas-confetti';
  import { useToken } from '~/components/composables/useToken';

  const token = useToken();
  if (!token && !process.server) {
    await navigateTo('/', { replace: true });
  }

  useHead({
    title: 'Conso API - Votre token',
  });

  onMounted(() => {
    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });
    fire(0.2, {
      spread: 60,
    });
    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });
    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  });

  function fire(particleRatio: number, opts: confetti.Options) {
    const count = 200;
    const defaults = {
      origin: { y: 0.7 },
    };

    confetti(
      Object.assign({}, defaults, opts, {
        particleCount: Math.floor(count * particleRatio),
      })
    );
  }
</script>
