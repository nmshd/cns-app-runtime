import { RelationshipChangedEvent } from "@nmshd/runtime"
import { AppRuntimeError } from "../../AppRuntimeError"
import { OnboardingChangeReceivedEvent } from "../../events"
import { AppRuntimeModule, AppRuntimeModuleConfiguration } from "../AppRuntimeModule"

export interface RelationshipChangedModuleConfig extends AppRuntimeModuleConfiguration {}

export class RelationshipChangedModuleError extends AppRuntimeError {}

export class RelationshipChangedModule extends AppRuntimeModule<RelationshipChangedModuleConfig> {
    public async init(): Promise<void> {
        // Nothing to do here
    }

    public start(): void {
        this.subscribeToEvent(RelationshipChangedEvent, this.handleRelationshipChanged.bind(this))
    }

    private async handleRelationshipChanged(event: RelationshipChangedEvent) {
        const relationship = event.data
        const session = this.runtime.findSessionByAddress(event.eventTargetAddress)
        if (!session) {
            this.logger.error(`No session found for address ${event.eventTargetAddress}`)
            return
        }

        // The very first change is the onboarding change
        if (relationship.changes.length === 1) {
            const change = relationship.changes[0]
            // Only fire received events if the current session did not create it
            if (
                (!change.response && change.request.createdBy !== session.address) ||
                (change.response && change.response.createdBy !== session.address)
            ) {
                const relationshipDVO = await session.expander.expandRelationshipDTO(relationship)
                this.runtime.eventBus.publish(
                    new OnboardingChangeReceivedEvent(
                        session.address,
                        relationship.changes[0],
                        relationship,
                        relationshipDVO
                    )
                )
            }
        }
    }

    public stop(): void {
        this.unsubscribeFromAllEvents()
    }
}
