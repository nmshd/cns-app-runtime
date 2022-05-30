import {
    INativePushNotification,
    RemoteNotificationEvent,
    RemoteNotificationRegistrationEvent
} from "@js-soft/native-abstractions"
import { Result } from "@js-soft/ts-utils"
import { AppRuntimeErrors } from "../../AppRuntimeErrors"
import { AccountSelectedEvent, DatawalletSynchronizedEvent, ExternalEventReceivedEvent } from "../../events"
import { AppRuntimeModule, AppRuntimeModuleConfiguration } from "../AppRuntimeModule"
import { BackboneEventName, IBackboneEventContent } from "./IBackboneEventContent"

export interface PushNotificationModuleConfig extends AppRuntimeModuleConfiguration {}

export class PushNotificationModule extends AppRuntimeModule<PushNotificationModuleConfig> {
    public async init(): Promise<void> {
        // Nothing to do here
    }

    private async handleRemoteNotification(event: RemoteNotificationEvent) {
        this.logger.trace("PushNotificationModule.handleRemoteNotification", event)
        const notification: INativePushNotification = event.notification
        const content: IBackboneEventContent = notification.content as IBackboneEventContent

        try {
            const account = await this.runtime.selectAccountByAddress(content.accRef, "")
            const session = this.runtime.findSession(account.id.toString())
            if (!session) {
                this.logger.error(`No session found for account ref ${content.accRef}`)
                return
            }

            switch (content.eventName) {
                case BackboneEventName.DatawalletModificationsCreated:
                    const walletResult = await session.transportServices.account.syncDatawallet()
                    if (walletResult.isError) {
                        this.logger.error(walletResult)
                        return
                    }
                    this.runtime.eventBus.publish(new DatawalletSynchronizedEvent(session.address))
                    break
                case BackboneEventName.ExternalEventCreated:
                    const syncResult = await session.transportServices.account.syncEverything()
                    if (syncResult.isError) {
                        this.logger.error(syncResult)
                        return
                    }

                    this.runtime.eventBus.publish(
                        new ExternalEventReceivedEvent(
                            session.address,
                            syncResult.value.messages,
                            syncResult.value.relationships
                        )
                    )

                    break
                default:
                    break
            }
        } catch (e) {
            this.logger.error(e)
        }
    }

    private async handleTokenRegistration(event: RemoteNotificationRegistrationEvent) {
        try {
            this.logger.trace("PushNotificationModule.handleTokenRegistration", event)

            for (const account of this.runtime.getSessions()) {
                await this.registerPushTokenForLocalAccount(account.id, event.token)
            }
        } catch (e) {
            this.logger.error(e)
        }
    }

    private async handleAccountSelected(event: AccountSelectedEvent) {
        try {
            this.logger.trace("PushNotificationModule.handleAccountSelected", event)
            const tokenResult = this.getNotificationTokenFromConfig()
            if (tokenResult.isSuccess) {
                await this.registerPushTokenForLocalAccount(event.data.localAccountId, tokenResult.value)
            } else {
                this.logger.error(tokenResult.error)
            }
        } catch (e) {
            this.logger.error(e)
        }
    }

    public async registerPushTokenForLocalAccount(id: string, token: string): Promise<void> {
        if (!token) {
            throw AppRuntimeErrors.modules.pushNotificationModule
                .tokenRegistrationNotPossible(
                    "The registered token was empty. This might be the case if you did not allow push notifications."
                )
                .logWith(this.logger)
        }

        const session = this.runtime.findSession(id)
        if (!session) {
            throw AppRuntimeErrors.modules.pushNotificationModule
                .tokenRegistrationNotPossible("No session for this account found")
                .logWith(this.logger)
        }
        const deviceResult = await session.transportServices.account.getDeviceInfo()
        if (deviceResult.isError) {
            throw AppRuntimeErrors.modules.pushNotificationModule
                .tokenRegistrationNotPossible("No device for this account found", deviceResult.error)
                .logWith(this.logger)
        }
        const device = deviceResult.value
        const platform = this.runtime.nativeEnvironment.deviceInfoAccess.deviceInfo.pushService
        const handle = token
        const installationId = device.id

        const result = await session.transportServices.account.registerPushNotificationToken({
            platform,
            handle,
            installationId
        })
        if (result.isError) {
            throw AppRuntimeErrors.modules.pushNotificationModule
                .tokenRegistrationNotPossible(result.error.message, result.error)
                .logWith(this.logger)
        } else {
            this.logger.trace(
                `PushNotificationModule.registerPushTokenForLocalAccount: Token ${handle} registered for account ${id} on platform ${platform} and installationId ${installationId}`
            )
        }
    }

    public getNotificationTokenFromConfig(): Result<string> {
        const pushTokenResult = this.runtime.nativeEnvironment.configAccess.get("pushToken")
        if (pushTokenResult.isError) {
            Result.fail(pushTokenResult.error)
        }
        return Result.ok(pushTokenResult.value)
    }

    private subscriptionIdTokenRegistration: number
    private subscriptionIdRemoteNotification: number

    public start(): void {
        const remoteNotificationResult = this.runtime.nativeEnvironment.eventBus.subscribe(
            RemoteNotificationEvent,
            this.handleRemoteNotification.bind(this)
        )
        if (remoteNotificationResult.isError) {
            throw AppRuntimeErrors.modules.pushNotificationModule
                .subscriptionNotPossible(remoteNotificationResult.error.message, remoteNotificationResult.error)
                .logWith(this.logger)
        }
        this.subscriptionIdRemoteNotification = remoteNotificationResult.value

        const tokenRegistrationResult = this.runtime.nativeEnvironment.eventBus.subscribe(
            RemoteNotificationRegistrationEvent,
            this.handleTokenRegistration.bind(this)
        )
        if (tokenRegistrationResult.isError) {
            throw AppRuntimeErrors.modules.pushNotificationModule
                .subscriptionNotPossible(tokenRegistrationResult.error.message, tokenRegistrationResult.error)
                .logWith(this.logger)
        }
        this.subscriptionIdTokenRegistration = tokenRegistrationResult.value

        this.subscribeToEvent(AccountSelectedEvent, this.handleAccountSelected.bind(this))
    }

    public stop(): void {
        if (!this.subscriptionIdRemoteNotification) {
            this.logger.warn("No RemoteNotificationEvent subscription available.")
        } else {
            const result = this.runtime.nativeEnvironment.eventBus.unsubscribe(
                RemoteNotificationEvent,
                this.subscriptionIdRemoteNotification
            )
            if (result.isError) {
                throw AppRuntimeErrors.modules.pushNotificationModule
                    .unsubscriptionNotPossible(result.error.message, result.error)
                    .logWith(this.logger)
            }
        }

        if (!this.subscriptionIdTokenRegistration) {
            this.logger.warn("No RemoteNotificationRegistrationEvent subscription available.")
        } else {
            const result = this.runtime.nativeEnvironment.eventBus.unsubscribe(
                RemoteNotificationRegistrationEvent,
                this.subscriptionIdTokenRegistration
            )
            if (result.isError) {
                throw AppRuntimeErrors.modules.pushNotificationModule
                    .unsubscriptionNotPossible(result.error.message, result.error)
                    .logWith(this.logger)
            }
        }

        this.unsubscribeFromAllEvents()
    }
}
