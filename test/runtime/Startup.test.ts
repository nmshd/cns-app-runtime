import { LocalAccountDTO } from "@nmshd/app-runtime"
import { Realm } from "@nmshd/transport"
import { expect } from "chai"
import { AbstractTest, EventListener } from "../lib"

export class StartupTest extends AbstractTest {
    public run(): void {
        const that = this

        describe("Runtime Startup", function () {
            let eventListener: EventListener
            let events: any[]
            let i = 0
            let localAccount: LocalAccountDTO
            this.timeout(200000)

            before("", async function () {
                await that.createRuntimeWithoutInit()

                eventListener = new EventListener(that.runtime, [
                    "runtime.initializing",
                    "transport.initializing",
                    "transport.initialized",
                    "runtime.modulesLoaded",
                    "runtime.modulesInitialized",
                    "runtime.modulesStarted",
                    "runtime.initialized"
                ])
                eventListener.start()
                await that.runtime.init()
                await that.runtime.start()
                eventListener.stop()
                events = eventListener.getReceivedEvents()
            })

            it("should fire event when initializing runtime", function () {
                expect(events[i++].namespace).to.equal("runtime.initializing")
            })

            it("should fire event when loading modules", function () {
                expect(events[i++].namespace).to.equal("runtime.modulesLoaded")
            })

            it("should fire event after loading modules", function () {
                expect(events[i++].namespace).to.equal("runtime.modulesInitialized")
            })

            it("should fire event after initializing runtime", function () {
                expect(events[i++].namespace).to.equal("runtime.initialized")
            })

            it("should fire event after starting modules", function () {
                expect(events[i++].namespace).to.equal("runtime.modulesStarted")
            })

            it("should create an account", async function () {
                localAccount = await that.runtime.accountServices.createAccount(Realm.Prod, "Profil 1")

                expect(localAccount).to.exist
            })

            it("should login to created account", async function () {
                const selectedAccount = await that.runtime.selectAccount(localAccount.id, "test")
                expect(selectedAccount).to.exist
                expect(selectedAccount.account.id.toString()).to.equal(localAccount.id.toString())
            })

            after(async function () {
                await that.runtime.stop()
            })
        })
    }
}
