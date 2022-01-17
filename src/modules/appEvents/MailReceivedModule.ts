import { AppRuntimeError } from "../../AppRuntimeError"
import { MailReceivedEvent } from "../../events"
import { AppRuntimeModule, AppRuntimeModuleConfiguration } from "../AppRuntimeModule"

export interface MailReceivedModuleConfig extends AppRuntimeModuleConfiguration {}

export class MailReceivedModuleError extends AppRuntimeError {}

export class MailReceivedModule extends AppRuntimeModule<MailReceivedModuleConfig> {
    public async init(): Promise<void> {
        // Nothing to do here
    }

    private async mailReceivedListener(event: MailReceivedEvent) {
        const mail = event.data
        const session = this.runtime.findSessionByAddress(event.eventTargetAddress)
        if (!session) {
            this.logger.error(`No session found for address ${event.eventTargetAddress}`)
            return
        }
        const sender = mail.createdBy

        await this.runtime.nativeEnvironment.notificationAccess.schedule(mail.name, mail.createdBy.name, {
            callback: async () => {
                await (await this.runtime.uiBridge()).showMessage(session.account, sender, mail)
            }
        })
    }

    private subscriptionId: number

    public start(): void {
        const subscriptionId = this.runtime.eventBus.subscribe(MailReceivedEvent, this.mailReceivedListener.bind(this))
        this.subscriptionId = subscriptionId
    }

    public stop(): void {
        if (!this.subscriptionId) {
            this.logger.warn("No Subscription available.")
            return
        }

        this.runtime.eventBus.unsubscribe(MailReceivedEvent, this.subscriptionId)
    }
}
