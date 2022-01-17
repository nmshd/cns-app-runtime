import { ModuleConfiguration, RuntimeModule } from "@nmshd/runtime"
import { AppRuntime } from "../AppRuntime"

export interface IAppRuntimeModuleConstructor {
    new (): AppRuntimeModule
}

export interface AppRuntimeModuleConfiguration extends ModuleConfiguration {}

export abstract class AppRuntimeModule<
    TConfig extends AppRuntimeModuleConfiguration = AppRuntimeModuleConfiguration
> extends RuntimeModule<TConfig, AppRuntime> {}
