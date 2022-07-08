import { DataEvent, LocalRequestDVO, RequestMessageDVO } from "@nmshd/runtime"

export class RequestReceivedEvent extends DataEvent<{
    request: LocalRequestDVO
    message: RequestMessageDVO
}> {
    public static readonly namespace: string = "app.requestReceived"

    public constructor(address: string, request: LocalRequestDVO, message: RequestMessageDVO) {
        super(RequestReceivedEvent.namespace, address, {
            request,
            message
        })
    }
}
