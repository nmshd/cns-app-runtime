import { DataEvent, MailDVO, RequestMailDVO } from "@nmshd/runtime"

export class MailReceivedEvent extends DataEvent<MailDVO | RequestMailDVO> {
    public static readonly namespace: string = "app.mailReceived"

    public constructor(address: string, message: MailDVO | RequestMailDVO) {
        super(MailReceivedEvent.namespace, address, message)
    }
}
