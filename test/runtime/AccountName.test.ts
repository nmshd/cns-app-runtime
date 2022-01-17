import { LocalAccountDTO } from "@nmshd/app-runtime"
import { expect } from "chai"
import { AbstractTest, TestUtil } from "../lib"

export class AccountNameTest extends AbstractTest {
    public run(): void {
        const that = this

        describe("Test setting the account name", function () {
            let localAccount: LocalAccountDTO
            this.timeout(60000)

            before(async function () {
                await that.createRuntime()
                await that.runtime.accountServices.clearAccounts()
                const accounts: LocalAccountDTO[] = await TestUtil.provideAccounts(that.runtime, 1)
                localAccount = accounts[0]
            })

            it("should set the account name", async function () {
                const accountName = "test"

                expect(localAccount).to.exist

                await that.runtime.accountServices.renameAccount(localAccount.id, accountName)

                const accounts = await that.runtime.accountServices.getAccounts()
                const account = accounts.find((acc) => acc.id.toString() === localAccount.id.toString())!

                expect(account.name).to.equal(accountName)
            })

            after(async function () {
                await that.runtime.stop()
            })
        })
    }
}
