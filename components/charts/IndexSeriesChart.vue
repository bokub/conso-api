<template>
  <div>
    <div class="font-medium mb-2">{{ label }}</div>
    <canvas ref="chartCanvas"></canvas>
  </div>
</template>

<script setup lang="ts">
  import { Chart, CategoryScale, LinearScale, LineController, LineElement, PointElement, Tooltip } from 'chart.js';
  import type { IndexValue } from '~/types/exampleApi';

  const props = defineProps<{
    label: string;
    unit: string;
    values: IndexValue[];
  }>();

  Chart.register(CategoryScale, LinearScale, LineController, LineElement, PointElement, Tooltip);

  const chartCanvas = ref<HTMLCanvasElement>();
  let chart: Chart | undefined;

  onMounted(plotGraph);
  onBeforeUnmount(() => chart?.destroy());
  watch(() => props.values, plotGraph, { flush: 'post' });

  function plotGraph() {
    chart?.destroy();
    chart = undefined;

    const canvas = chartCanvas.value;
    if (!canvas || !props.values.length) {
      return;
    }

    const values = props.values.map((point) => Number(point.v));
    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const padding = (maxValue - minValue) * 0.05 || Math.abs(minValue) * 0.01 || 1;
    const formatter = new Intl.NumberFormat('fr-FR');

    chart = new Chart(canvas, {
      type: 'line',
      data: {
        labels: props.values.map((point) => point.d.split(/[ T]/)[0]),
        datasets: [
          {
            label: props.label,
            data: values,
            tension: 0.2,
            pointRadius: 2,
          },
        ],
      },
      options: {
        responsive: true,
        scales: {
          y: {
            min: minValue - padding,
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) =>
                `${context.dataset.label ? `${context.dataset.label} : ` : ''}${formatter.format(
                  context.parsed.y ?? 0
                )} ${props.unit}`,
            },
          },
        },
      },
    });
  }
</script>
