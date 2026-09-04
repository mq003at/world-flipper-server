export interface ZatLoginBody {
    adid: string
    appId: string
    appSecret: string
    appVer: string
    clientTime: number
    country: string
    deviceId: string
    deviceModel: string
    fields: string[]
    gsiToken: boolean
    lang: string
    loginType: string
    market: string
    network: string
    os: string
    playerId: string
    resume: boolean
    retryNo: number
    sdkVer: string
    telecom: string
    timezoneOffset: number
    usimCountry: string
    whiteKey: string
    zat: string
}

export interface LoginAgreementBody {
    appId: string
    country: string
    deviceId: string
    idpCode: string
    idpId: string
    lang: string
    os: string
    serialNo: string
}

export interface AuthLoginDeviceBody {
    accessToken: string
    adid: string
    appId: string
    appSecret: string
    appVer: string
    clientTime: number
    country: string
    deviceAppKey: string
    deviceId: string
    deviceModel: string
    fields: string[]
    gsiToken: boolean
    idpId: string
    lang: string
    loginType: string
    market: string
    network: string
    os: string
    osVer: string
    referrer: string
    resume: boolean
    retryNo: string
    sdkVer: string
    serialNo: string
    telecom: string
    timezoneOffset: number
    usimCountry: string
    whiteKey: string
}
