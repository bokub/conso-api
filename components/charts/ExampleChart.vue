<template>
  <div v-if="hasChartData">
    <div class="font-medium mb-2">Graphique</div>
    <div v-if="populatedIndexSeries.length" class="flex flex-col gap-6">
      <IndexSeriesChart
        v-for="series in populatedIndexSeries"
        :key="series.label"
        :label="series.label"
        :unit="series.unit"
        :values="series.values"
      />
    </div>
    <canvas v-else ref="chartCanvas"></canvas>
  </div>
</template>

<script setup lang="ts">
  import { Chart, Colors, BarController, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';
  import IndexSeriesChart from '~/components/charts/IndexSeriesChart.vue';
  import type { ExampleApiResult } from '~/types/exampleApi';

  const props = defineProps<{ result: ExampleApiResult }>();

  Chart.register(Colors, BarController, CategoryScale, LinearScale, BarElement, Tooltip);

  const chartCanvas = ref<HTMLCanvasElement>();
  const indexSeries = computed(() => {
    const grandeurs = props.result.contexte?.flatMap((contexte) => contexte.grandeur ?? []) ?? [];
    return grandeurs.flatMap((grandeur) => [
      ...(grandeur.calendrier ?? []).flatMap((calendrier) =>
        (calendrier.classeTemporelle ?? []).map((classe) => ({
          label: [calendrier.libelleCalendrier, classe.libelleClasseTemporelle ?? classe.idClasseTemporelle]
            .filter(Boolean)
            .join(' - '),
          unit: grandeur.unite ?? '',
          values: classe.valeur ?? [],
        }))
      ),
      ...(grandeur.cadranTotalisateur?.valeur?.length
        ? [
            {
              label: grandeur.cadranTotalisateur.codeCadran ?? 'Totalisateur',
              unit: grandeur.unite ?? '',
              values: grandeur.cadranTotalisateur.valeur,
            },
          ]
        : []),
    ]);
  });
  const populatedIndexSeries = computed(() => indexSeries.value.filter((series) => series.values.length > 0));
  const hasChartData = computed(
    () => !!props.result.grandeur?.some((grandeur) => grandeur.points?.length) || populatedIndexSeries.value.length > 0
  );
  let chart: Chart | undefined;

  onMounted(plotGraph);
  onBeforeUnmount(() => chart?.destroy());
  watch(() => props.result, plotGraph, { flush: 'post' });

  function plotGraph() {
    chart?.destroy();
    chart = undefined;

    if (populatedIndexSeries.value.length) {
      return;
    }

    const canvas = chartCanvas.value;
    if (!canvas) {
      return;
    }

    const formatter = new Intl.NumberFormat('fr-FR');
    const data = props.result.grandeur?.flatMap((grandeur) =>
      (grandeur.points ?? []).map((point) => ({
        date: point.d,
        value: Number(point.v),
        label: grandeur.grandeurMetier ?? '',
        unit: grandeur.unite ?? '',
      }))
    );
    if (!data?.length) {
      return;
    }

    chart = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: data.map((row) => row.date),
        datasets: [
          {
            label: data[0]?.label || '',
            data: data.map((row) => row.value),
          },
        ],
      },
      options: {
        elements: {
          bar: {
            backgroundColor: 'rgba(59, 130, 246, 0.5)',
            borderWidth: 1,
            borderColor: 'rgba(59, 130, 246, 1)',
          },
        },
        plugins: {
          tooltip: {
            callbacks: {
              label: (context) =>
                [
                  data[context.dataIndex]?.label ? `${data[context.dataIndex].label} : ` : '',
                  formatter.format(context.parsed.y || 0),
                  ' ',
                  data[context.dataIndex]?.unit,
                ].join(''),
            },
          },
        },
      },
    });
  }
</script>
