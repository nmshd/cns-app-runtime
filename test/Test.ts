import { NativePlatform } from "@js-soft/native-abstractions"
import { AppConfig, createAppConfig } from "@nmshd/app-runtime"
import { IConfigOverwrite } from "@nmshd/transport"
import { AppRelationshipFacadeTest, MessageFacadeTest } from "./extensibility"
import { MessageEventingTest, RelationshipEventingAcceptTest, RelationshipEventingRejectTest } from "./modules"
import { RelationshipEventingRevokeTest } from "./modules/RelationshipEventingRevoke.test"
import { AccountNameTest, RuntimeModuleLoadingTest, StartupTest, TranslationProviderTest } from "./runtime"

export enum BackboneEnvironment {
    Local = "http://enmeshed.local",
    Dev = "http://dev.enmeshed.eu", // !!leave http here!!
    Stage = "https://stage.enmeshed.eu",
    Prod = "https://prod.enmeshed.eu"
}

export class Test {
    public static readonly currentEnvironment = BackboneEnvironment.Stage
    public static currentPlatform: NativePlatform

    public static getConfig(): AppConfig {
        const transportOverride: IConfigOverwrite = {
            baseUrl: Test.currentEnvironment,
            debug: true,
            platformClientId: "test",
            platformClientSecret: "a6owPRo8c98Ue8Z6mHoNgg5viF5teD"
        }

        if (typeof (globalThis as any).window !== "undefined" && !(globalThis as any).isCordovaApp) {
            Test.currentPlatform = NativePlatform.Web
            switch (transportOverride.baseUrl) {
                case BackboneEnvironment.Local:
                    transportOverride.baseUrl = "/svc-local"
                    break
                case BackboneEnvironment.Dev:
                    transportOverride.baseUrl = "/svc-dev"
                    break
                case BackboneEnvironment.Stage:
                    transportOverride.baseUrl = "/svc-stage"
                    break
                case BackboneEnvironment.Prod:
                    transportOverride.baseUrl = "/svc-prod"
                    break
                default:
                    throw new Error(`${transportOverride.baseUrl} is not a valid value for 'config.baseUrl'`)
            }
        } else {
            Test.currentPlatform = NativePlatform.Node
        }

        return createAppConfig({
            transportLibrary: transportOverride,
            logging: {}
        })
    }

    public static runIntegrationTests(): void {
        const config = this.getConfig()

        new MessageEventingTest(config).run()
        new RelationshipEventingAcceptTest(config).run()
        new RelationshipEventingRejectTest(config).run()
        new RelationshipEventingRevokeTest(config).run()
        new StartupTest(config).run()

        new MessageFacadeTest(config).run()
        new AppRelationshipFacadeTest(config).run()
        new AccountNameTest(config).run()
        new RuntimeModuleLoadingTest(config).run()
        new TranslationProviderTest(config).run()
    }
}
