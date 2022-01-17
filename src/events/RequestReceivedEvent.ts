import { DataEvent, MessageDVO, RequestDVO, RequestMailDVO } from "@nmshd/runtime"

export class RequestReceivedEvent extends DataEvent<{
    request: RequestDVO
    message: MessageDVO | RequestMailDVO
}> {
    public static readonly namespace: string = "app.requestReceived"

    public constructor(address: string, request: RequestDVO, message: MessageDVO | RequestMailDVO) {
        super(RequestReceivedEvent.namespace, address, {
            request,
            message
        })
    }
}
