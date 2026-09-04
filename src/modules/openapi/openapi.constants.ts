export const ZAT_TTL_MS = 12 * 60 * 60 * 1000
export const ZRT_TTL_MS = 30 * 24 * 60 * 60 * 1000

// Keep the original emulator behavior until we have a protocol capture proving
// that this value can be generated differently.
export const DEVICE_ACCESS_TOKEN_TTL_MS = 4_600_000
export const DEVICE_ACCESS_TOKEN =
    "fwPla7fQ8ty9+DZT/lD//uWZD4uD6C4lD6gGIIZTLKRTQ52/SLCRmk/370jcWGs+e+1iSoZtL7lj8ov9B0/jHmijH4nsHPQT6pchaQM1M9mtwYNQq0BWhVr9hF0jjCK/a5LIVd1kBac/Gemv29WKEDKSrUS9HxxUigoPRwtOy8m+oDj9FmDJZ+rzqWCc0QjES4Ky0fTpXZ7ESoguDzNmRtW3FYr+OFexw8wBPlwiC4w="

export const DEFAULT_IDP_CODE = "zd3"

export const AGREEMENT = {
    appName: "World Flipper (NA)",
    informationSecurityCountry: "kr",
    kakaoGameSdkVersion: "3.0",
    partnerId: 825,
    partnerName: "주식회사 카카오게임즈",
    policyApplyTime: 1_630_854_000_000,
    fallbackIdpId: "6076008646",
} as const
