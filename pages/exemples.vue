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
          <option value="consommation_quotidienne">Consommation quotidienne</option>
          <option value="production_quotidienne">Production quotidienne</option>
          <option value="puissance_conso_max_quotidienne">Puissance maximale de consommation</option>
          <option value="courbe_de_charge_consommation">Courbe de charge de consommation</option>
          <option value="courbe_de_charge_production">Courbe de charge de production</option>
          <option value="index_consommation">Index de consommation</option>
          <option value="index_production">Index de production</option>
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

    <div v-if="dataType === 'puissance_conso_max_quotidienne'" class="flex flex-col gap-6 md:flex-row">
      <div class="w-full">
        <label for="mesuresPas" class="form-label">Pas de mesure</label>
        <select v-model="mesuresPas" id="mesuresPas" class="form-input">
          <option value="P1D">Quotidien (P1D)</option>
          <option value="P1M">Mensuel (P1M)</option>
        </select>
      </div>

      <div class="w-full">
        <label for="grandeurPhysique" class="form-label">Grandeur physique</label>
        <select v-model="grandeurPhysique" id="grandeurPhysique" class="form-input">
          <option value="PMA">Puissance maximale équivalente monophasée (PMA)</option>
          <option value="TOUT">Toutes les phases (TOUT)</option>
        </select>
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

      <div v-if="hasChartData">
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
    grandeur?: Array<{
      grandeurMetier?: string;
      unite?: string;
      points?: Array<{ d: string; v: string }>;
    }>;
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

  const dataType = ref('consommation_quotidienne');
  const prm = ref('');
  const mesuresPas = ref('P1D');
  const grandeurPhysique = ref('PMA');

  const date = new Date();
  const end = ref(date.toISOString().slice(0, 10));
  date.setDate(date.getDate() - 3);
  const start = ref(date.toISOString().slice(0, 10));

  const isLoading: Ref<boolean> = ref(false);
  const testResult: Ref<null | APIResult> = ref(null);
  const jsonTestResult: ComputedRef<string> = computed(() => JSON.stringify(testResult.value, null, 2));
  const hasChartData = computed(() => testResult.value?.grandeur?.some((grandeur) => grandeur.points?.length));

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

  const endpointURL = computed(() => {
    if (!prm.value || !start.value || !end.value) {
      return '';
    }

    const query = new URLSearchParams({
      pointId: prm.value,
      dateDebut: start.value,
      dateFin: end.value,
    });
    if (dataType.value === 'puissance_conso_max_quotidienne') {
      query.set('mesuresPas', mesuresPas.value);
      query.set('grandeurPhysique', grandeurPhysique.value);
    }

    return `${window.location.protocol}//${window.location.host}/api/${dataType.value}?${query}`;
  });

  const cURLCommand = computed(() =>
    endpointURL.value && token.value
      ? `curl -X GET \\
    '${endpointURL.value}' \\
    -H 'Authorization: Bearer ${token.value}'`
      : ''
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
    const data = testResult.value?.grandeur?.flatMap((grandeur) =>
      (grandeur.points ?? []).map((point) => ({
        date: point.d,
        value: Number(point.v),
        label: grandeur.grandeurMetier ?? '',
        unit: grandeur.unite ?? '',
      }))
    );
    if (!chartElement) {
      console.error('Cannot find chart canvas');
      return;
    }
    if (!data) {
      console.error('Nothing to plot');
      return;
    }

    const formatter = new Intl.NumberFormat('fr-FR');

    new Chart(chartElement, {
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
              label: function (context) {
                return [
                  data[context.dataIndex]?.label ? `${data[context.dataIndex].label} : ` : '',
                  formatter.format(context.parsed.y || 0),
                  ' ',
                  data[context.dataIndex]?.unit,
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
