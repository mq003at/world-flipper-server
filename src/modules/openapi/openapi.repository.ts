import { SessionType } from "../../data/types"
import {
    deleteAccountSessionsOfType,
    deleteSession,
    getAccount,
    getAccountFromIdpIdSync,
    getSession,
    insertAccount,
    insertSession,
    updateAccount,
} from "../../data/wdfpData"

export type OpenApiAccount = NonNullable<Awaited<ReturnType<typeof getAccount>>>
export type OpenApiSession = NonNullable<Awaited<ReturnType<typeof getSession>>>

export const openApiRepository = {
    getSession,
    deleteSession,
    getAccount,
    getAccountFromIdpId: getAccountFromIdpIdSync,
    insertAccount,
    updateAccount,
    insertSession,
    deleteAccountSessionsOfType,
    sessionType: SessionType,
}
