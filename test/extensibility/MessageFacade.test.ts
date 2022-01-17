import { Realm } from "@nmshd/transport"
import { expect } from "chai"
import { AbstractTest } from "../lib"

export class MessageFacadeTest extends AbstractTest {
    public run(): void {
        const that = this

        describe("Message", function () {
            this.timeout(20000)

            before(async function () {
                await that.createRuntime()
                await that.runtime.start()

                const localAccount = await that.runtime.accountServices.createAccount(Realm.Prod, "Profil 1")
                await that.runtime.selectAccount(localAccount.id, "test")
            })

            it("should return messages", async function () {
                const messages = await that.runtime.transportServices.messages.getMessages({ query: {} })
                expect(messages.isSuccess).to.be.true
                expect(messages.value).be.an("Array")
            }).timeout(10000)

            after(async function () {
                await that.runtime.stop()
            })
        })
    }
}
