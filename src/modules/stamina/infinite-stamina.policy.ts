export const MAX_STAMINA = 120;
export const FULL_STAMINA_HEAL_TIME = new Date(0);

/**
 * Batch 5C.2 deliberately disables the stamina economy while accelerated
 * content progression is enabled. Keep this rule server-side and centralized
 * so every response reports the same value.
 */
export function resolvePlayerStamina(): number {
    return MAX_STAMINA;
}

/**
 * A full stamina bar is not waiting for another recovery tick. Returning an
 * epoch sentinel also prevents the frozen compatibility clock from seeing a
 * runtime-year heal timestamp in the future and rendering the bar as empty.
 */
export function resolveStaminaHealTime(): Date {
    return new Date(FULL_STAMINA_HEAL_TIME);
}
