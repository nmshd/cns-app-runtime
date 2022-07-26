import { IDatabaseConnection } from "@js-soft/docdb-access-abstractions"
import { LokiJsConnection } from "@js-soft/docdb-access-loki"
import { ILoggerFactory } from "@js-soft/logging-abstractions"
import { INativeBootstrapper, INativeEnvironment, INativeTranslationProvider } from "@js-soft/native-abstractions"
import { Result } from "@js-soft/ts-utils"
import { ConsumptionController } from "@nmshd/consumption"
import { ModuleConfiguration, Runtime, RuntimeHealth, RuntimeServices } from "@nmshd/runtime"
import { AccountController, CoreId, ICoreAddress } from "@nmshd/transport"
import { AppConfig, AppConfigOverwrite, createAppConfig } from "./AppConfig"
import { AppRuntimeErrors } from "./AppRuntimeErrors"
import { AccountSelectedEvent, RelationshipSelectedEvent } from "./events"
import { AppServices, IUIBridge } from "./extensibility"
import {
    AppLaunchModule,
    AppRuntimeModuleConfiguration,
    AppSyncModule,
    IAppRuntimeModuleConstructor,
    MailReceivedModule,
    MessageReceivedModule,
    OnboardingChangeReceivedModule,
    PushNotificationModule,
    RelationshipChangedModule
} from "./modules"
import { AccountServices, LocalAccountDTO, LocalAccountMapper, MultiAccountController } from "./multiAccount"
import { LocalAccountSession } from "./multiAccount/data/LocalAccountSession"
import { UserfriendlyResult } from "./UserfriendlyResult"

export interface AppRuntimeServices extends RuntimeServices {
    appServices: AppServices
}

export class AppRuntime extends Runtime<AppConfig> {
    public constructor(public readonly nativeBootstrapper: INativeBootstrapper, appConfig: AppConfig) {
        super(appConfig)
        if (!nativeBootstrapper.isInitialized) {
            throw AppRuntimeErrors.startup.bootstrapperNotInitialized()
        }
        this._nativeEnvironment = nativeBootstrapper.nativeEnvironment
    }

    private _uiBridge: IUIBridge | undefined
    private _uiBridgePromise: Promise<IUIBridge> | undefined
    private _uiBridgeResolveFunction: Function | undefined

    public uiBridge(): Promise<IUIBridge> {
        if (this._uiBridge) return Promise.resolve(this._uiBridge)
        if (this._uiBridgePromise) return this._uiBridgePromise
        this._uiBridgePromise = new Promise((resolve) => {
            this._uiBridgeResolveFunction = resolve
        })
        this._uiBridgePromise
            .then(() => {
                this._uiBridgePromise = undefined
                this._uiBridgeResolveFunction = undefined
            })
            .catch((e) => {
                this._uiBridgePromise = undefined
                this._uiBridgeResolveFunction = undefined
                this.logger.error(e)
            })

        return this._uiBridgePromise
    }

    public registerUIBridge(uiBridge: IUIBridge): UserfriendlyResult<void> {
        if (this._uiBridge) {
            return UserfriendlyResult.fail(AppRuntimeErrors.startup.uiBridgeAlreadyRegistered())
        }
        this._uiBridge = uiBridge
        if (this._uiBridgePromise && this._uiBridgeResolveFunction) {
            this._uiBridgeResolveFunction()
        }
        return UserfriendlyResult.ok(undefined)
    }

    private lokiConnection: LokiJsConnection
    private _multiAccountController: MultiAccountController
    public get multiAccountController(): MultiAccountController {
        return this._multiAccountController
    }

    private _accountServices: AccountServices
    public get accountServices(): AccountServices {
        return this._accountServices
    }

    private readonly _nativeEnvironment: INativeEnvironment
    public get nativeEnvironment(): INativeEnvironment {
        return this._nativeEnvironment
    }

    public get currentAccount(): LocalAccountDTO {
        if (!this._currentSession) {
            throw AppRuntimeErrors.general.currentSessionUnavailable()
        }
        return this._currentSession.account
    }

    protected async login(
        accountController: AccountController,
        consumptionController: ConsumptionController
    ): Promise<AppRuntimeServices> {
        const services = await super.login(accountController, consumptionController)

        const appServices = new AppServices(
            this,
            services.transportServices,
            services.consumptionServices,
            services.dataViewExpander
        )

        return { ...services, appServices }
    }

    private _currentSession?: LocalAccountSession
    public get currentSession(): LocalAccountSession {
        if (!this._currentSession) {
            throw AppRuntimeErrors.general.currentSessionUnavailable()
        }
        return this._currentSession
    }

    public getServices(address: string | ICoreAddress): AppRuntimeServices {
        const addressString = typeof address === "string" ? address : address.toString()

        const session = this._availableSessions.find((session) => session.address === addressString)
        if (!session) {
            throw new Error(`Account ${addressString} not logged in.`)
        }

        return {
            transportServices: session.transportServices,
            consumptionServices: session.consumptionServices,
            appServices: session.appServices,
            dataViewExpander: session.expander
        }
    }

    private readonly _availableSessions: LocalAccountSession[] = []

    public getSessions(): LocalAccountDTO[] {
        return this._availableSessions.map((session) => session.account)
    }

    private _accountIdToPromise?: string
    private _selectAccountPromise?: Promise<LocalAccountDTO>

    public getSession(accountId: string): LocalAccountDTO | undefined {
        const session = this.findSession(accountId)
        if (session) return session.account
        return undefined
    }

    public findSession(accountId: string): LocalAccountSession | undefined {
        return this._availableSessions.find((item) => item.account.id === accountId)
    }

    public findSessionByAddress(address: string): LocalAccountSession | undefined {
        return this._availableSessions.find((item) => item.address === address)
    }

    public async selectAccountByAddress(address: string, password: string): Promise<LocalAccountDTO> {
        if (this._currentSession && this._currentSession.address === address) {
            return this._currentSession.account
        }
        const availableSession = this.findSessionByAddress(address)

        let accountId = availableSession?.account.id
        if (!accountId) {
            accountId = (await this.multiAccountController.getAccountByAddress(address)).id.toString()
        }
        return await this.selectAccount(accountId, password)
    }

    public async selectAccount(accountId: string, password: string): Promise<LocalAccountDTO> {
        if (this._currentSession && this._currentSession.account.id === accountId) {
            return this._currentSession.account
        }
        const availableSession = this.findSession(accountId)

        // If there is any select promise, we have to await it, even before returning an available session
        if (this._accountIdToPromise && this._accountIdToPromise !== accountId) {
            if (!availableSession) {
                // Another account is currently logging in and we also need to log in -> error
                throw AppRuntimeErrors.multiAccount.concurrentLoginOfDifferentAccounts()
            } else {
                // Another account is currently logging in and we already have an open session -> await login of the other account but do not return
                await this._selectAccountPromise
            }
        } else if (this._selectAccountPromise) {
            // Same account is currently logging in -> await login and return
            return await this._selectAccountPromise
        }

        if (availableSession) {
            await this.login(availableSession.accountController, availableSession.consumptionController)
            this._currentSession = availableSession
            this.eventBus.publish(new AccountSelectedEvent(availableSession.address, availableSession.account.id))
            return availableSession.account
        }

        this._selectAccountPromise = this._selectAccount(accountId, password)

        try {
            return await this._selectAccountPromise
        } finally {
            this._selectAccountPromise = undefined
            this._accountIdToPromise = undefined
        }
    }

    private async _selectAccount(accountId: string, password: string): Promise<LocalAccountDTO> {
        this._accountIdToPromise = accountId
        const [localAccount, accountController] = await this._multiAccountController.selectAccount(
            CoreId.from(accountId),
            password
        )
        if (!localAccount.address) {
            throw AppRuntimeErrors.general.addressUnavailable().logWith(this.logger)
        }
        const consumptionController = await new ConsumptionController(this.transport, accountController).init()

        const services = await this.login(accountController, consumptionController)

        this.logger.debug(`Finished login to ${accountId}.`)
        const session = {
            address: localAccount.address.toString(),
            account: LocalAccountMapper.toLocalAccountDTO(localAccount),
            consumptionServices: services.consumptionServices,
            transportServices: services.transportServices,
            expander: services.dataViewExpander,
            appServices: services.appServices,
            accountController,
            consumptionController
        }
        this._availableSessions.push(session)
        this._currentSession = session

        this.eventBus.publish(new AccountSelectedEvent(session.address, session.account.id))

        return session.account
    }

    public async queryAccount(
        title = "i18n://uibridge.accountSelection.title",
        description = "i18n://uibridge.accountSelection.description"
    ): Promise<UserfriendlyResult<LocalAccountDTO>> {
        let selectedAccount
        const accounts = await this.accountServices.getAccounts()
        if (accounts.length > 1) {
            const bridge = await this.uiBridge()
            const accountSelectionResult = await bridge.requestAccountSelection(accounts, title, description)
            if (accountSelectionResult.isError) {
                return UserfriendlyResult.fail(
                    AppRuntimeErrors.general.noAccountAvailable(accountSelectionResult.error)
                )
            }
            selectedAccount = accountSelectionResult.value
        } else if (accounts.length === 1) {
            selectedAccount = accounts[0]
        } else {
            return UserfriendlyResult.fail(AppRuntimeErrors.general.noAccountAvailable())
        }
        return UserfriendlyResult.ok(selectedAccount)
    }

    public async selectRelationship(id?: string): Promise<void> {
        if (!this._currentSession) {
            throw AppRuntimeErrors.general.currentSessionUnavailable().logWith(this.logger)
        }

        if (!id) {
            this._currentSession.selectedRelationship = undefined
            return
        }

        const result = await this.currentSession.appServices.relationships.renderRelationship(id)
        if (result.isError) {
            throw result.error
        }

        const relationship = result.value
        this._currentSession.selectedRelationship = relationship
        this.eventBus.publish(new RelationshipSelectedEvent(this._currentSession.address, relationship))
    }

    public getHealth(): Promise<RuntimeHealth> {
        const health = {
            isHealthy: true,
            services: {}
        }
        return Promise.resolve(health)
    }

    protected async initAccount(): Promise<void> {
        this._multiAccountController = new MultiAccountController(this.transport)
        await this._multiAccountController.init()
        this._accountServices = new AccountServices(this._multiAccountController)
    }

    public static async create(
        nativeBootstrapper: INativeBootstrapper,
        appConfig?: AppConfigOverwrite
    ): Promise<AppRuntime> {
        // TODO: JSSNMSHDD-2524 (validate app config)

        if (!nativeBootstrapper.isInitialized) {
            const result = await nativeBootstrapper.init()
            if (!result.isSuccess) {
                throw AppRuntimeErrors.startup.bootstrapError(result.error)
            }
        }

        const transportConfig = nativeBootstrapper.nativeEnvironment.configAccess.get("transport").value
        const mergedConfig = appConfig
            ? createAppConfig(
                  {
                      transportLibrary: transportConfig
                  },
                  appConfig
              )
            : createAppConfig({
                  transportLibrary: transportConfig
              })

        const runtime = new AppRuntime(nativeBootstrapper, mergedConfig)
        await runtime.init()
        runtime.logger.trace("Runtime initialized")

        return runtime
    }

    public static async createAndStart(
        nativeBootstrapper: INativeBootstrapper,
        appConfig?: AppConfigOverwrite
    ): Promise<AppRuntime> {
        const runtime = await this.create(nativeBootstrapper, appConfig)
        await runtime.start()
        runtime.logger.trace("Runtime started")
        return runtime
    }

    protected createLoggerFactory(): ILoggerFactory {
        return this.nativeEnvironment.loggerFactory
    }

    protected createDatabaseConnection(): Promise<IDatabaseConnection> {
        this.logger.trace("Creating DatabaseConnection to LokiJS")
        this.lokiConnection = new LokiJsConnection("./data", this.nativeEnvironment.databaseFactory)
        this.logger.trace("Finished initialization of LokiJS connection.")

        return Promise.resolve(this.lokiConnection)
    }

    private static moduleRegistry: Record<string, IAppRuntimeModuleConstructor> = {
        appLaunch: AppLaunchModule,
        appSync: AppSyncModule,
        pushNotification: PushNotificationModule,
        mailReceived: MailReceivedModule,
        onboardingChangeReceived: OnboardingChangeReceivedModule,
        messageReceived: MessageReceivedModule,
        relationshipChanged: RelationshipChangedModule
    }

    public static registerModule(moduleName: string, ctor: IAppRuntimeModuleConstructor): void {
        this.moduleRegistry[moduleName] = ctor
    }

    protected loadModule(moduleConfiguration: ModuleConfiguration): Promise<void> {
        const moduleConstructor = AppRuntime.moduleRegistry[moduleConfiguration.name]
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
        if (!moduleConstructor) {
            const error = new Error(
                `Module '${this.getModuleName(
                    moduleConfiguration
                )}' could not be loaded, because it was not registered. Please register all modules before running init.`
            )
            this.logger.error(error)
            return Promise.reject(error)
        }

        const connectorModuleConfiguration = moduleConfiguration as AppRuntimeModuleConfiguration

        const module = new moduleConstructor(
            this,
            connectorModuleConfiguration,
            this.loggerFactory.getLogger(moduleConstructor)
        )

        this.modules.add(module)

        this.logger.info(`Module '${this.getModuleName(moduleConfiguration)}' was loaded successfully.`)
        return Promise.resolve()
    }

    public async stop(): Promise<void> {
        const logError = (e: any) => this.logger.error(e)

        await super.stop().catch(logError)
        await this.lokiConnection.close().catch(logError)
    }

    private translationProvider: INativeTranslationProvider = {
        translate: (key: string) => Promise.resolve(Result.ok(key))
    }
    public registerTranslationProvider(provider: INativeTranslationProvider): void {
        this.translationProvider = provider
    }

    public async translate(key: string, ...values: any[]): Promise<Result<string>> {
        return await this.translationProvider.translate(key, ...values)
    }
}
