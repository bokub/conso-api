<template>
  <ContentDoc :head="false" />

  <div class="flex flex-col gap-6">
    <ClientOnly>
      <div v-if="!hadToken">
        <div class="mb-4">
          Vous n'avez pas de token ? Obtenez-en un en acceptant de partager vos données depuis votre espace Enedis
        </div>
        <AuthButton class="mt-6"></AuthButton>
      </div>
    </ClientOnly>

    <div>
      <label for="token" class="form-label">Votre token</label>
      <textarea v-model="token" id="token" rows="2" class="form-input" placeholder="xxx.yyy.zzz"></textarea>
    </div>

    <div class="flex flex-col gap-6 md:flex-row">
      <div class="w-full">
        <label for="data" class="form-label">Type de donnée</label>
        <select v-model="dataType" id="data" class="form-input">
          <option value="daily_consumption">Consommation quotidienne</option>
          <option value="consumption_load_curve">Courbe de charge de consommation</option>
          <option value="consumption_max_power">Puissance maximale de consommation</option>
          <option value="daily_production">Production quotidienne</option>
          <option value="production_load_curve">Courbe de charge de production</option>
        </select>
      </div>

      <div class="w-full">
        <label for="prm" class="form-label">PRM</label>
        <select v-if="prmListFromToken.length > 0" v-model="prm" id="prm" class="form-input">
          <option v-for="p in prmListFromToken" :key="p" :value="p">{{ p }}</option>
        </select>
        <input v-else v-model="prm" id="prm" type="text" class="form-input" />
      </div>
    </div>

    <div class="flex flex-col gap-6 md:flex-row">
      <div class="w-full">
        <label for="start" class="form-label">Date de début</label>
        <input v-model="start" id="start" type="date" class="form-input" />
      </div>

      <div class="w-full">
        <label for="end" class="form-label">Date de fin</label>
        <input v-model="end" id="end" type="date" class="form-input" />
      </div>
    </div>

    <prose-hr></prose-hr>
    <div>
      <div class="font-medium">URL de l'API</div>
      <CodeBlock class="!mt-2 !mb-0" :code="endpointURL" v-if="endpointURL" lang="yaml"></CodeBlock>
      <ProseCode class="!mt-2 !mb-0" v-else>
        <div class="p-4">Remplissez les champs ci-dessus pour voir l'exemple</div>
      </ProseCode>
    </div>

    <div>
      <div class="font-medium">Commande cURL</div>
      <CodeBlock class="!mt-2 !mb-0" :code="cURLCommand" v-if="cURLCommand" lang="bash"></CodeBlock>
      <ProseCode class="!mt-2 !mb-0" v-else>
        <div class="p-4">Remplissez les champs ci-dessus pour voir l'exemple</div>
      </ProseCode>
    </div>

    <div>
      <div class="font-medium">
        Commande
        <ProseA href="https://github.com/bokub/linky#readme"><ProseCodeInline>@bokub/linky</ProseCodeInline></ProseA>
      </div>
      <CodeBlock class="!mt-2 !mb-0" :code="cliCommand" v-if="cliCommand" lang="bash"></CodeBlock>
      <ProseCode class="!mt-2 !mb-0" v-else>
        <div class="p-4">Remplissez les champs ci-dessus pour voir l'exemple</div>
      </ProseCode>
    </div>

    <div class="text-center">
      <button
        type="button"
        class="text-white !bg-gradient-to-r from-blue-500 to-cyan-500 font-medium rounded-lg px-5 py-2.5 text-center"
        :class="
          cURLCommand && !isLoading
            ? 'hover:!bg-gradient-to-bl focus:ring focus:outline-none focus:ring-blue-300'
            : 'opacity-60 !cursor-not-allowed'
        "
        :disabled="!cURLCommand || isLoading"
        @click="testAPI"
      >
        Tester
      </button>
    </div>

    <template v-if="testResult !== null">
      <prose-hr></prose-hr>
      <prose-h3 id="resultats" class="!my-0">Résultats</prose-h3>

      <div v-if="testResult['interval_reading']">
        <div class="font-medium mb-2">Graphique</div>
        <canvas id="chart"></canvas>
      </div>

      <div>
        <div class="font-medium">Résultat brut</div>
        <CodeBlock class="!mt-2 !mb-0" :code="jsonTestResult" lang="json"></CodeBlock>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
  import { useToken } from '~/components/composables/useToken';
  import axios from 'axios';
  import { Chart, Colors, BarController, CategoryScale, LinearScale, BarElement, Tooltip } from 'chart.js';

  type APIResult = {
    interval_reading: Array<{ date: string; value: number }>;
    reading_type: { unit: string; measurement_kind: string };
  };

  Chart.register(Colors, BarController, CategoryScale, LinearScale, BarElement, Tooltip);

  useHead({
    title: "Conso API - Exemples d'utilisation",
  });

  const token = ref('');
  const hadToken = ref(true);

  onMounted(() => {
    token.value = useToken();
    hadToken.value = !!token.value;
  });

  const dataType = ref('daily_consumption');
  const prm = ref('');

  const date = new Date();
  const end = ref(date.toISOString().slice(0, 10));
  date.setDate(date.getDate() - 3);
  const start = ref(date.toISOString().slice(0, 10));

  const isLoading: Ref<boolean> = ref(false);
  const testResult: Ref<null | APIResult> = ref(null);
  const jsonTestResult: ComputedRef<string> = computed(() => JSON.stringify(testResult.value, null, 2));

  const prmListFromToken = computed(() => {
    try {
      return JSON.parse(atob(token.value.split('.')[1])).sub;
    } catch (e) {
      return [];
    }
  });

  watchEffect(() => {
    if (prmListFromToken.value.length > 0) {
      prm.value = prmListFromToken.value[0];
    }
  });

  const endpointURL = computed(() =>
    prm.value && start.value && end.value
      ? `${window.location.protocol}//${window.location.host}/api/${dataType.value}?prm=${prm.value}&start=${start.value}&end=${end.value}`
      : ''
  );

  const cURLCommand = computed(() =>
    endpointURL.value && token.value
      ? `curl -X GET \\
    '${endpointURL.value}' \\
    -H 'Authorization: Bearer ${token.value}'`
      : ''
  );

  const dataTypeToCommand: { [key: string]: string } = {
    daily_consumption: 'daily',
    consumption_load_curve: 'loadcurve',
    consumption_max_power: 'maxpower',
    daily_production: 'dailyprod',
    production_load_curve: 'loadcurveprod',
  };

  const cliCommand = computed(() =>
    start.value && end.value ? `linky ${dataTypeToCommand[dataType.value]} -s ${start.value} -e ${end.value}` : ''
  );

  function testAPI() {
    testResult.value = null;
    isLoading.value = true;
    axios
      .get(endpointURL.value, {
        headers: {
          Authorization: `Bearer ${token.value}`,
        },
      })
      .then((response) => {
        testResult.value = response.data;
      })
      .catch((error) => {
        testResult.value = error.response.data;
      })
      .finally(() => {
        isLoading.value = false;
        location.hash = '';
        nextTick(() => {
          location.hash = '#resultats';
          plotGraph();
        });
      });
  }

  function plotGraph() {
    const chartElement: any | null = document.getElementById('chart');
    const data = testResult.value?.interval_reading;
    if (!chartElement) {
      console.error('Cannot find chart canvas');
      return;
    }
    if (!data) {
      console.error('Nothing to plot');
      return;
    }

    const unit = testResult.value?.reading_type?.unit;
    const kind = testResult.value?.reading_type?.measurement_kind;
    const formatter = new Intl.NumberFormat('fr-FR');

    new Chart(chartElement, {
      type: 'bar',
      data: {
        labels: data.map((row) => row.date),
        datasets: [
          {
            label: testResult.value?.reading_type?.measurement_kind || '',
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
              label: function (context) {
                return [
                  kind ? kind.charAt(0).toUpperCase() + kind.slice(1) + ' : ' : '',
                  formatter.format(context.parsed.y || 0),
                  ' ',
                  unit,
                ].join('');
              },
            },
          },
        },
      },
    });
  }
</script>

<style scoped>
  .form-label {
    @apply block mb-2 font-medium;
  }
  .form-input {
    @apply block w-full p-2.5 bg-gray-50 border border-gray-300 text-sm rounded-lg;
  }
  .form-input:focus {
    @apply border-blue-300 ring ring-blue-200 ring-opacity-50 outline-none;
  }
</style>
