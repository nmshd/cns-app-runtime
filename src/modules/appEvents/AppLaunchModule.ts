import { UrlOpenEvent } from "@js-soft/native-abstractions"
import { AppRuntimeError } from "../../AppRuntimeError"
import { AppRuntimeModule, AppRuntimeModuleConfiguration } from "../AppRuntimeModule"

export interface AppLaunchModuleConfig extends AppRuntimeModuleConfiguration {}

export class AppLaunchModuleError extends AppRuntimeError {}

export class AppLaunchModule extends AppRuntimeModule<AppLaunchModuleConfig> {
    public async init(): Promise<void> {
        // Nothing to do here
    }

    private async urlOpenEventListener(event: UrlOpenEvent) {
        await this.runtime.appServices.stringProcessor.processURL(event.url)
    }

    private urlOpenSubscriptionId: number

    public start(): void {
        const subscriptionResult = this.runtime.nativeEnvironment.eventBus.subscribe(
            UrlOpenEvent,
            this.urlOpenEventListener.bind(this)
        )
        if (subscriptionResult.isError) {
            this.logger.error(subscriptionResult.error)
        } else {
            this.urlOpenSubscriptionId = subscriptionResult.value
        }
    }

    public stop(): void {
        if (this.urlOpenSubscriptionId) {
            this.runtime.nativeEnvironment.eventBus.unsubscribe(UrlOpenEvent, this.urlOpenSubscriptionId)
        }
    }
}
