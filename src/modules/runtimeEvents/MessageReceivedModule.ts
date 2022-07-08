import { MailDVO, MessageReceivedEvent, RequestMessageDVO } from "@nmshd/runtime"
import { AppRuntimeError } from "../../AppRuntimeError"
import { MailReceivedEvent, RequestReceivedEvent } from "../../events"
import { AppRuntimeModule, AppRuntimeModuleConfiguration } from "../AppRuntimeModule"

export interface MessageReceivedModuleConfig extends AppRuntimeModuleConfiguration {}

export class MessageReceivedModuleError extends AppRuntimeError {}

export class MessageReceivedModule extends AppRuntimeModule<MessageReceivedModuleConfig> {
    public async init(): Promise<void> {
        // Nothing to do here
    }

    public start(): void {
        this.subscribeToEvent(MessageReceivedEvent, this.handleMessageReceived.bind(this))
    }

    private async handleMessageReceived(event: MessageReceivedEvent) {
        const message = event.data
        const session = this.runtime.findSessionByAddress(event.eventTargetAddress)
        if (!session) {
            this.logger.error(`No session found for address ${event.eventTargetAddress}`)
            return
        }
        const messageDVO = await session.expander.expandMessageDTO(message)

        switch (messageDVO.type) {
            case "RequestMessageDVO":
                const requestMessage = messageDVO as RequestMessageDVO
                this.runtime.eventBus.publish(
                    new RequestReceivedEvent(event.eventTargetAddress, requestMessage.request, requestMessage)
                )
                break
            case "MailDVO":
                const mail: MailDVO = messageDVO
                this.runtime.eventBus.publish(new MailReceivedEvent(event.eventTargetAddress, mail))
                break
            default:
                break
        }
    }

    public stop(): void {
        this.unsubscribeFromAllEvents()
    }
}
