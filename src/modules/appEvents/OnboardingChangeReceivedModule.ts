import { RelationshipChangeStatus } from "@nmshd/runtime"
import { AppRuntimeError } from "../../AppRuntimeError"
import { MailReceivedEvent, OnboardingChangeReceivedEvent } from "../../events"
import { AppRuntimeModule, AppRuntimeModuleConfiguration } from "../AppRuntimeModule"

export interface OnboardingChangeReceivedModuleConfig extends AppRuntimeModuleConfiguration {}

export class OnboardingChangeReceivedModuleError extends AppRuntimeError {}

export class OnboardingChangeReceivedModule extends AppRuntimeModule<OnboardingChangeReceivedModuleConfig> {
    public async init(): Promise<void> {
        // Nothing to do here
    }

    private async onboardingChangeReceivedHandler(event: OnboardingChangeReceivedEvent) {
        const change = event.data.change
        const identity = event.data.identity
        let title = ""
        let text = ""
        const session = this.runtime.findSessionByAddress(event.eventTargetAddress)
        if (!session) {
            this.logger.error(`No session found for address ${event.eventTargetAddress}`)
            return
        }
        switch (change.status) {
            case RelationshipChangeStatus.Accepted:
                title = "Kontaktanfrage genehmigt"
                text = `Du kannst nun mit ${identity.name} kommunizieren`
                break

            case RelationshipChangeStatus.Pending:
                title = "Kontaktanfrage erhalten"
                text = `Du hast eine Kontaktanfrage von ${identity.name} erhalten`
                break

            case RelationshipChangeStatus.Rejected:
                title = "Kontaktanfrage abgelehnt"
                text = `${identity.name} hat ihre Kontaktanfrage abgelehnt`
                break

            case RelationshipChangeStatus.Revoked:
                title = "Kontaktanfrage zurückgezogen"
                text = `${identity.name} hat die Kontaktanfrage zurückgezogen`
                break
        }
        await this.runtime.nativeEnvironment.notificationAccess.schedule(title, text, {
            callback: async () => {
                await (await this.runtime.uiBridge()).showRelationshipChange(session.account, identity, change)
            }
        })
    }

    private subscriptionId: number

    public start(): void {
        const subscriptionId = this.runtime.eventBus.subscribe(
            OnboardingChangeReceivedEvent,
            this.onboardingChangeReceivedHandler.bind(this)
        )
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
