export const MAX_STAMINA = 120;

/**
 * Batch 5C.2 deliberately disables the stamina economy while accelerated
 * content progression is enabled. Keep this rule server-side and centralized
 * so every response reports the same value.
 */
export function resolvePlayerStamina(): number {
    return MAX_STAMINA;
}
