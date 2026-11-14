// §4.1: 10 on sunlit days, 7 on lunar-night days — which days are which comes from config.
export function getDayBudget(day, config) {
  return config.powerBudget.sunlitDays.includes(day)
    ? config.powerBudget.sunlit
    : config.powerBudget.night
}
