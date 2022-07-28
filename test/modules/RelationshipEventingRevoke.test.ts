import { LocalAccountSession, OnboardingChangeReceivedEvent } from "@nmshd/app-runtime"
import { RelationshipChangedEvent, RelationshipChangeStatus, RelationshipStatus } from "@nmshd/runtime"
import { expect } from "chai"
import { AbstractTest, EventListener, TestUtil } from "../lib"

export class RelationshipEventingRevokeTest extends AbstractTest {
    public run(): void {
        const that = this

        describe("RelationshipEventingRevokeTest", function () {
            this.timeout(60000)

            let sessionA: LocalAccountSession
            let sessionB: LocalAccountSession
            let relationshipId: string

            before(async function () {
                await that.createRuntime()
                await that.runtime.start()

                const accounts = await TestUtil.provideAccounts(that.runtime, 2)
                sessionA = await that.runtime.selectAccount(accounts[0].id, "")
                await that.runtime.selectAccount(accounts[1].id, "")
                sessionB = await that.runtime.getOrCreateSession(accounts[1].id)
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
                await eventListener.waitFor(OnboardingChangeReceivedEvent, () =>
                    TestUtil.syncUntilHasRelationship(sessionA, requestTo.id)
                )
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

                expect(onboardingChangeReceivedEvent.data.identity.name).to.eq(
                    sessionB.accountController.identity.address.toString().substring(3, 9)
                )
                expect(onboardingChangeReceivedEvent.data.identity.id).to.eq(
                    sessionB.accountController.identity.address.toString()
                )

                expect(onboardingChangeReceivedEvent.data.identity.hasRelationship).to.eq(true)
                expect(onboardingChangeReceivedEvent.data.identity.relationship?.id).to.eq(
                    relationshipChangedEvent.data.id
                )
                expect(onboardingChangeReceivedEvent.data.relationship).to.eq(relationshipChangedEvent.data)
            })

            it("should fire events on the requestor when relationship request was revoked (by requestor itself)", async function () {
                const eventListenerFrom = new EventListener(that.runtime, [RelationshipChangedEvent], sessionB)
                eventListenerFrom.start()
                await TestUtil.revokeRelationship(sessionB, relationshipId)
                eventListenerFrom.stop()

                const eventsFrom = eventListenerFrom.getReceivedEvents()
                expect(eventsFrom).to.be.of.length(1)
                const relationshipChangedEvent = eventsFrom[0].instance as RelationshipChangedEvent
                expect(relationshipChangedEvent).instanceOf(RelationshipChangedEvent)
                expect(relationshipChangedEvent.data).to.exist
                expect(relationshipChangedEvent.data.status).to.eq(RelationshipStatus.Revoked)
            })

            it("should fire events on the templator when relationship request was revoked", async function () {
                const eventListenerTo = new EventListener(
                    that.runtime,
                    [RelationshipChangedEvent, OnboardingChangeReceivedEvent],
                    sessionA
                )
                eventListenerTo.start()
                await eventListenerTo.waitFor(OnboardingChangeReceivedEvent, () =>
                    TestUtil.syncUntilHasRelationship(sessionA, relationshipId)
                )
                eventListenerTo.stop()

                const events = eventListenerTo.getReceivedEvents()
                expect(events).to.be.of.length(2)
                const relationshipChangedEvent = events[0].instance as RelationshipChangedEvent
                expect(relationshipChangedEvent).instanceOf(RelationshipChangedEvent)
                expect(relationshipChangedEvent.data).to.exist
                expect(relationshipChangedEvent.data.id).to.eq(relationshipId)
                expect(relationshipChangedEvent.data.status).to.eq(RelationshipStatus.Revoked)

                const onboardingChangeReceivedEvent = events[1].instance as OnboardingChangeReceivedEvent
                expect(onboardingChangeReceivedEvent).instanceOf(OnboardingChangeReceivedEvent)
                expect(onboardingChangeReceivedEvent.data).to.exist
                expect(onboardingChangeReceivedEvent.data.change.status).to.eq(RelationshipChangeStatus.Revoked)
                expect(onboardingChangeReceivedEvent.data.change).to.eq(relationshipChangedEvent.data.changes[0])
                expect(onboardingChangeReceivedEvent.data.identity).to.exist

                expect(onboardingChangeReceivedEvent.data.identity.name).to.eq(
                    sessionB.accountController.identity.address.toString().substring(3, 9)
                )
                expect(onboardingChangeReceivedEvent.data.identity.id).to.eq(
                    sessionB.accountController.identity.address.toString()
                )
                expect(onboardingChangeReceivedEvent.data.identity.hasRelationship).to.eq(true)
                expect(onboardingChangeReceivedEvent.data.identity.relationship?.id).to.eq(
                    relationshipChangedEvent.data.id
                )

                expect(onboardingChangeReceivedEvent.data.relationship).to.eq(relationshipChangedEvent.data)
            })

            after(async function () {
                await that.runtime.stop()
            })
        })
    }
}
