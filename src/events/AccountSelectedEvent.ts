import { DataEvent } from "@nmshd/runtime"

export class AccountSelectedEvent extends DataEvent<{ localAccountId: string; address: string }> {
    public static readonly namespace = "runtime.accountSelected"

    /**
     * Create an AccountSelected Event
     * @param accountId The accountId of the selected account.
     */
    public constructor(address: string, accountId: string) {
        super(AccountSelectedEvent.namespace, address, { localAccountId: accountId, address: address })
    }
}
