import { LocalAccountDTO } from "@nmshd/app-runtime"
import { Realm } from "@nmshd/transport"
import { expect } from "chai"
import { AbstractTest } from "../lib"

export class MessageFacadeTest extends AbstractTest {
    public run(): void {
        const that = this

        describe("Message", function () {
            this.timeout(60000)

            let localAccount: LocalAccountDTO

            before(async function () {
                await that.createRuntime()
                await that.runtime.start()

                localAccount = await that.runtime.accountServices.createAccount(Realm.Prod, "Profil 1")
                await that.runtime.selectAccount(localAccount.id, "test")
            })

            it("should return messages", async function () {
                const services = await that.runtime.getServices(localAccount.address!)
                const messages = await services.transportServices.messages.getMessages({ query: {} })
                expect(messages.isSuccess).to.be.true
                expect(messages.value).be.an("Array")
            })

            after(async function () {
                await that.runtime.stop()
            })
        })
    }
}
