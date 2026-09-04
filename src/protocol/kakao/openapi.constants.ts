export const OPENAPI = {
    guestIdpCode: "zd3",
    zatTtlMs: 43_200_000,
    zrtTtlMs: 2_592_000_000,
    deviceAccessTokenTtlMs: 4_600_000,

    // Captured compatibility value from the original Starpoint implementation.
    // Do not treat this as a real authentication secret.
    deviceAccessToken:
        "fwPla7fQ8ty9+DZT/lD//uWZD4uD6C4lD6gGIIZTLKRTQ52/SLCRmk/370jcWGs+e+1iSoZtL7lj8ov9B0/jHmijH4nsHPQT6pchaQM1M9mtwYNQq0BWhVr9hF0jjCK/a5LIVd1kBac/Gemv29WKEDKSrUS9HxxUigoPRwtOy8m+oDj9FmDJZ+rzqWCc0QjES4Ky0fTpXZ7ESoguDzNmRtW3FYr+OFexw8wBPlwiC4w=",

    capturedAgreementTimestamp: "1717623430484",
    capturedAgreementIdpId: "6076008646",
} as const;
