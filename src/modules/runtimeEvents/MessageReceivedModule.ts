import { MailDVO, MessageReceivedEvent, RequestMailDVO } from "@nmshd/runtime"
import { AppRuntimeError } from "../../AppRuntimeError"
import { MailReceivedEvent, RequestReceivedEvent } from "../../events"
import { AppRuntimeModule, AppRuntimeModuleConfiguration } from "../AppRuntimeModule"

export interface MessageReceivedModuleConfig extends AppRuntimeModuleConfiguration {}

export class MessageReceivedModuleError extends AppRuntimeError {}

export class MessageReceivedModule extends AppRuntimeModule<MessageReceivedModuleConfig> {
    public async init(): Promise<void> {
        // Nothing to do here
    }

    private async messageReceivedEventListener(event: MessageReceivedEvent) {
        const message = event.data
        const session = this.runtime.findSessionByAddress(event.eventTargetAddress)
        if (!session) {
            this.logger.error(`No session found for address ${event.eventTargetAddress}`)
            return
        }
        const messageDVO = await session.expander.expandMessageDTO(message)

        switch (messageDVO.type) {
            case "RequestMailDVO":
                const requestMail: RequestMailDVO = messageDVO
                this.runtime.eventBus.publish(new MailReceivedEvent(event.eventTargetAddress, requestMail))
                for (const requestDVO of requestMail.requests) {
                    this.runtime.eventBus.publish(
                        new RequestReceivedEvent(event.eventTargetAddress, requestDVO, messageDVO)
                    )
                }
                break
            case "MailDVO":
                const mail: MailDVO = messageDVO
                this.runtime.eventBus.publish(new MailReceivedEvent(event.eventTargetAddress, mail))
                break
            default:
                break
        }
    }

    private subscriptionId: number

    public start(): void {
        const subscriptionId = this.runtime.eventBus.subscribe(
            MessageReceivedEvent,
            this.messageReceivedEventListener.bind(this)
        )
        this.subscriptionId = subscriptionId
    }

    public stop(): void {
        if (!this.subscriptionId) {
            this.logger.warn("No Subscription available.")
            return
        }

        this.runtime.eventBus.unsubscribe(MessageReceivedEvent, this.subscriptionId)
    }
}
