import { UrlOpenEvent } from "@js-soft/native-abstractions"
import { AppRuntimeError } from "../../AppRuntimeError"
import { AppRuntimeModule, AppRuntimeModuleConfiguration } from "../AppRuntimeModule"

export interface AppLaunchModuleConfig extends AppRuntimeModuleConfiguration {}

export class AppLaunchModuleError extends AppRuntimeError {}

export class AppLaunchModule extends AppRuntimeModule<AppLaunchModuleConfig> {
    public async init(): Promise<void> {
        // Nothing to do here
    }

    public start(): void {
        this.subscribeToNativeEvent(UrlOpenEvent, this.handleUrlOpen.bind(this))
    }

    private async handleUrlOpen(event: UrlOpenEvent) {
        await this.runtime.currentSession.appServices.stringProcessor.processURL(event.url)
    }

    public stop(): void {
        this.unsubscribeFromAllNativeEvents()
    }
}
