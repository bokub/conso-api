export const dataURLs: { [key: string]: string } = {
  daily_consumption: 'metering_data_dc/v5/daily_consumption',
  consumption_load_curve: 'metering_data_clc/v5/consumption_load_curve',
  consumption_max_power: 'metering_data_dcmp/v5/daily_consumption_max_power',
  daily_production: 'metering_data_dp/v5/daily_production',
  production_load_curve: 'metering_data_plc/v5/production_load_curve',
} as const;

export const dataPoints = Object.keys(dataURLs) as [string, string, string, string, string];
