import { ILogger } from "@js-soft/logging-abstractions"
import { Event, EventHandler } from "@js-soft/ts-utils"
import { ModuleConfiguration, RuntimeModule } from "@nmshd/runtime"
import { AppRuntime } from "../AppRuntime"

export interface IAppRuntimeModuleConstructor {
    new (runtime: AppRuntime, configuration: any, logger: ILogger): AppRuntimeModule
}

export interface AppRuntimeModuleConfiguration extends ModuleConfiguration {}

export abstract class AppRuntimeModule<
    TConfig extends AppRuntimeModuleConfiguration = AppRuntimeModuleConfiguration
> extends RuntimeModule<TConfig, AppRuntime> {
    private readonly registeredNativeEventSubscriptions: { id: number; target: Event }[] = []

    protected subscribeToNativeEvent<TEvent>(event: Event, handler: EventHandler<TEvent>): void {
        const subscriptionResult = this.runtime.nativeEnvironment.eventBus.subscribe(event, handler)
        if (subscriptionResult.isError) {
            this.logger.error(subscriptionResult.error)
            throw subscriptionResult.error
        }

        this.registeredNativeEventSubscriptions.push({ id: subscriptionResult.value, target: event })
    }

    protected unsubscribeFromAllNativeEvents(): void {
        for (const subscription of this.registeredNativeEventSubscriptions) {
            this.runtime.nativeEnvironment.eventBus.unsubscribe(subscription.target, subscription.id)
        }

        this.registeredNativeEventSubscriptions.splice(0)
    }
}
