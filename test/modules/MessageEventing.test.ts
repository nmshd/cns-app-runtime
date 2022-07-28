import { LocalAccountSession, MailReceivedEvent } from "@nmshd/app-runtime"
import { MessageReceivedEvent } from "@nmshd/runtime"
import { expect } from "chai"
import { AbstractTest, EventListener, TestUtil } from "../lib"

export class MessageEventingTest extends AbstractTest {
    public run(): void {
        const that = this

        describe("MessageEventingTest", function () {
            this.timeout(60000)

            let sessionA: LocalAccountSession
            let sessionB: LocalAccountSession

            before(async function () {
                await that.createRuntime()
                await that.runtime.start()

                const accounts = await TestUtil.provideAccounts(that.runtime, 2)
                sessionA = await that.runtime.selectAccount(accounts[0].id, "")
                sessionB = await that.runtime.selectAccount(accounts[1].id, "")

                await TestUtil.addRelationship(sessionA, sessionB)
            })

            it("should fire events when mail is received", async function () {
                const createdBy = (await sessionA.transportServices.account.getIdentityInfo()).value.address
                const recipient = (await sessionB.transportServices.account.getIdentityInfo()).value.address
                const mail = {
                    "@type": "Mail",
                    to: [recipient],
                    subject: "Hallo Horst",
                    body: "Hallo, hier ist eine Mail."
                }
                const message = await TestUtil.sendMessage(sessionA, sessionB, mail)
                const eventListener = new EventListener(that.runtime, [MailReceivedEvent, MessageReceivedEvent])
                eventListener.start()
                await eventListener.waitFor(MailReceivedEvent, () => TestUtil.syncUntilHasMessage(sessionB, message.id))
                eventListener.stop()
                const events = eventListener.getReceivedEvents()
                expect(events).to.be.of.length(2)
                const messageReceivedEvent = events[0].instance as MessageReceivedEvent
                expect(messageReceivedEvent).instanceOf(MessageReceivedEvent)
                expect(messageReceivedEvent.data).to.exist
                expect(messageReceivedEvent.data.id).to.eq(message.id)
                expect(messageReceivedEvent.data.createdBy).to.eq(createdBy)

                const mailReceivedEvent = events[1].instance as MailReceivedEvent
                expect(mailReceivedEvent).instanceOf(MailReceivedEvent)
                expect(mailReceivedEvent.data).to.exist
                expect(mailReceivedEvent.data.body).to.eq(mail.body)
                expect(mailReceivedEvent.data.name).to.eq(mail.subject)
                expect(mailReceivedEvent.data.id).to.eq(message.id)
                expect(mailReceivedEvent.data.date).to.eq(message.createdAt)
                expect(mailReceivedEvent.data.type).to.eq("MailDVO")
                expect(mailReceivedEvent.data.createdBy.type).to.eq("IdentityDVO")
                expect(mailReceivedEvent.data.createdBy.name).to.eq(createdBy.substring(3, 9))
            })

            after(async function () {
                await that.runtime.stop()
            })
        })
    }
}
