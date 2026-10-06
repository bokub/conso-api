export const legacyDataURLs: { [key: string]: string } = {
  daily_consumption: 'metering_data_dc/v5/daily_consumption',
  consumption_load_curve: 'metering_data_clc/v5/consumption_load_curve',
  consumption_max_power: 'metering_data_dcmp/v5/daily_consumption_max_power',
  daily_production: 'metering_data_dp/v5/daily_production',
  production_load_curve: 'metering_data_plc/v5/production_load_curve',
} as const;

export const legacyDataPoints = Object.keys(legacyDataURLs) as [string, string, string, string, string];

export const synchronousDataURLs = {
  index_consommation: 'index_consommation',
  index_production: 'index_production',
  consommation_quotidienne: 'consommation_quotidienne',
  production_quotidienne: 'production_quotidienne',
  puissance_conso_max_quotidienne: 'puissance_conso_max_quotidienne',
  courbe_de_charge_consommation: 'courbe_de_charge_consommation',
  courbe_de_charge_production: 'courbe_de_charge_production',
} as const;

export const synchronousDataPoints = Object.keys(synchronousDataURLs) as [
  keyof typeof synchronousDataURLs,
  ...(keyof typeof synchronousDataURLs)[]
];
