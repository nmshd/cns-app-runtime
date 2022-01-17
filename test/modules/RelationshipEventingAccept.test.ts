import { LocalAccountSession, OnboardingChangeReceivedEvent } from "@jssnmshd/app-runtime"
import { RelationshipChangedEvent, RelationshipChangeStatus, RelationshipStatus } from "@nmshd/runtime"
import { expect } from "chai"
import { AbstractTest, EventListener, TestUtil } from "../lib"

export class RelationshipEventingAcceptTest extends AbstractTest {
    public run(): void {
        const that = this

        describe("RelationshipEventingAcceptTest", function () {
            this.timeout(20000)

            let sessionA: LocalAccountSession
            let sessionB: LocalAccountSession
            let relationshipId: string

            before(async function () {
                await that.createRuntime()
                await that.runtime.start()

                const accounts = await TestUtil.provideAccounts(that.runtime, 2)
                await that.runtime.selectAccount(accounts[0].id, "")
                sessionA = that.runtime.findSession(accounts[0].id)!
                await that.runtime.selectAccount(accounts[1].id, "")
                sessionB = that.runtime.findSession(accounts[1].id)!
            })

            it("should fire events when relationship request is received", async function () {
                const templateTo = await TestUtil.createAndLoadPeerTemplate(sessionA, sessionB)
                const requestTo = await TestUtil.requestRelationshipForTemplate(sessionB, templateTo.id)
                relationshipId = requestTo.id

                const eventListener = new EventListener(
                    that.runtime,
                    [RelationshipChangedEvent, OnboardingChangeReceivedEvent],
                    sessionA
                )
                eventListener.start()
                await TestUtil.syncUntilHasRelationship(sessionA, requestTo.id)
                await eventListener.waitFor(OnboardingChangeReceivedEvent)
                eventListener.stop()
                const events = eventListener.getReceivedEvents()
                expect(events).to.be.of.length(2)
                const relationshipChangedEvent = events[0].instance as RelationshipChangedEvent
                expect(relationshipChangedEvent).instanceOf(RelationshipChangedEvent)
                expect(relationshipChangedEvent.data).to.exist
                expect(relationshipChangedEvent.data.id).to.eq(relationshipId)
                expect(relationshipChangedEvent.data.status).to.eq(RelationshipStatus.Pending)

                const onboardingChangeReceivedEvent = events[1].instance as OnboardingChangeReceivedEvent
                expect(onboardingChangeReceivedEvent).instanceOf(OnboardingChangeReceivedEvent)
                expect(onboardingChangeReceivedEvent.data).to.exist
                expect(onboardingChangeReceivedEvent.data.change.status).to.eq(RelationshipChangeStatus.Pending)
                expect(onboardingChangeReceivedEvent.data.change).to.eq(relationshipChangedEvent.data.changes[0])
                expect(onboardingChangeReceivedEvent.data.identity).to.exist
                expect(onboardingChangeReceivedEvent.data.identity.id).to.eq(sessionB.address.toString())
                expect(onboardingChangeReceivedEvent.data.identity.name).to.eq(
                    sessionB.address.toString().substring(3, 9)
                )
                expect(onboardingChangeReceivedEvent.data.identity.hasRelationship).to.eq(true)
                expect(onboardingChangeReceivedEvent.data.identity.relationship?.id).to.eq(
                    relationshipChangedEvent.data.id
                )
                expect(onboardingChangeReceivedEvent.data.relationship).to.eq(relationshipChangedEvent.data)
            }).timeout(10000)

            it("should fire events on the templator when relationship request was accepted (by templator itself)", async function () {
                const eventListenerFrom = new EventListener(that.runtime, [RelationshipChangedEvent], sessionA)
                eventListenerFrom.start()
                await TestUtil.acceptRelationship(sessionA, relationshipId)
                eventListenerFrom.stop()

                const eventsFrom = eventListenerFrom.getReceivedEvents()
                expect(eventsFrom).to.be.of.length(1)

                const relationshipChangedEvent = eventsFrom[0].instance as RelationshipChangedEvent
                expect(relationshipChangedEvent).instanceOf(RelationshipChangedEvent)
                expect(relationshipChangedEvent.data).to.exist
                expect(relationshipChangedEvent.data.id).to.eq(relationshipId)
                expect(relationshipChangedEvent.data.status).to.eq(RelationshipStatus.Active)
            })

            it("should fire events on the requestor when relationship request was accepted", async function () {
                const eventListenerTo = new EventListener(
                    that.runtime,
                    [RelationshipChangedEvent, OnboardingChangeReceivedEvent],
                    sessionB
                )
                eventListenerTo.start()
                await TestUtil.syncUntilHasRelationship(sessionB, relationshipId)
                await eventListenerTo.waitFor(OnboardingChangeReceivedEvent)
                eventListenerTo.stop()

                const events = eventListenerTo.getReceivedEvents()
                expect(events).to.be.of.length(2)
                const relationshipChangedEvent = events[0].instance as RelationshipChangedEvent
                expect(relationshipChangedEvent).instanceOf(RelationshipChangedEvent)
                expect(relationshipChangedEvent.data).to.exist
                expect(relationshipChangedEvent.data.id).to.eq(relationshipId)
                expect(relationshipChangedEvent.data.status).to.eq(RelationshipStatus.Active)

                const onboardingChangeReceivedEvent = events[1].instance as OnboardingChangeReceivedEvent
                expect(onboardingChangeReceivedEvent).instanceOf(OnboardingChangeReceivedEvent)
                expect(onboardingChangeReceivedEvent.data).to.exist
                expect(onboardingChangeReceivedEvent.data.change.status).to.eq(RelationshipChangeStatus.Accepted)
                expect(onboardingChangeReceivedEvent.data.change).to.eq(relationshipChangedEvent.data.changes[0])
                expect(onboardingChangeReceivedEvent.data.identity).to.exist
                expect(onboardingChangeReceivedEvent.data.identity.name).to.eq(
                    sessionA.accountController.identity.address.toString().substring(3, 9)
                )
                expect(onboardingChangeReceivedEvent.data.identity.id).to.eq(
                    sessionA.accountController.identity.address.toString()
                )
                expect(onboardingChangeReceivedEvent.data.identity.hasRelationship).to.eq(true)
                expect(onboardingChangeReceivedEvent.data.identity.relationship?.id).to.eq(
                    relationshipChangedEvent.data.id
                )

                expect(onboardingChangeReceivedEvent.data.relationship).to.eq(relationshipChangedEvent.data)
            }).timeout(10000)

            after(async function () {
                await that.runtime.stop()
            })
        })
    }
}
