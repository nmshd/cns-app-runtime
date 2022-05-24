import { RuntimeConfig } from "@nmshd/runtime"
import { IConfigOverwrite, Realm } from "@nmshd/transport"
import { defaultsDeep } from "lodash"

export interface AppConfig extends RuntimeConfig {
    logging: any
}

export interface AppConfigOverwrite {
    transportLibrary?: IConfigOverwrite
    logging?: any
}

export function createAppConfig(...configs: AppConfigOverwrite[]): AppConfig {
    const appConfig = {
        transportLibrary: {
            realm: Realm.Prod,
            datawalletEnabled: true
        },
        modules: {
            appLaunch: {
                name: "appLaunch",
                displayName: "App Launch Module",
                location: "appLaunch",
                enabled: true
            },
            pushNotification: {
                name: "pushNotification",
                displayName: "Push Notification Module",
                location: "pushNotification",
                enabled: true
            },
            mailReceived: {
                name: "mailReceived",
                displayName: "Mail Received Module",
                location: "mailReceived",
                enabled: true
            },
            onboardingChangeReceived: {
                name: "onboardingChangeReceived",
                displayName: "Onboarding Change Received Module",
                location: "onboardingChangeReceived",
                enabled: true
            },
            messageReceived: {
                name: "messageReceived",
                displayName: "Message Received Module",
                location: "messageReceived",
                enabled: true
            },
            relationshipChanged: {
                name: "relationshipChanged",
                displayName: "Relationship Changed Module",
                location: "relationshipChanged",
                enabled: true
            },
            decider: {
                displayName: "Decider Module",
                name: "DeciderModule",
                location: "@nmshd/runtime:DeciderModule",
                enabled: true
            },
            request: {
                displayName: "Request Module",
                name: "RequestModule",
                location: "@nmshd/runtime:RequestModule",
                enabled: true
            }
        }
    }

    const mergedConfig = defaultsDeep({}, ...configs, appConfig)

    return mergedConfig
}
