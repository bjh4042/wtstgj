/** Structure only. Species/weather balance values await user approval.
 * Sparse canonical-ID keys: multipliers[speciesId][CLEAR|CLOUDY|RAIN|HEAVY_RAIN].
 * Missing entries always mean 1. This is independent of encounter trigger modifiers.
 */
export const SPECIES_WEATHER_CONFIG=Object.freeze({
 version:'species-weather-weights-v1',enabled:false,defaultMultiplier:1,
 multipliers:Object.freeze({}),
});
