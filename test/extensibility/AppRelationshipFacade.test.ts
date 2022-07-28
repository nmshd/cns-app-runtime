import { sleep } from "@js-soft/ts-utils"
import { LocalAccountSession } from "@nmshd/app-runtime"
import { BackboneIds, Realm } from "@nmshd/transport"
import { expect } from "chai"
import { AbstractTest, TestUtil } from "../lib"

export class AppRelationshipFacadeTest extends AbstractTest {
    private async createSession() {
        const localAccount1 = await this.runtime.accountServices.createAccount(Realm.Prod, "Profil 1")
        return await this.runtime.selectAccount(localAccount1.id, "test")
    }

    public run(): void {
        const that = this

        let session1: LocalAccountSession
        let session2: LocalAccountSession
        let session3: LocalAccountSession

        let relationshipId: string

        describe("AppRelationshipFacade", function () {
            this.timeout(120000)

            before(async function () {
                await that.createRuntime()
                await that.runtime.start()

                session1 = await that.createSession()
                session2 = await that.createSession()
                session3 = await that.createSession()

                const relationships = await TestUtil.addRelationship(session1, session2)

                await TestUtil.addRejectedRelationship(session3, session2)

                relationshipId = relationships.from.id.toString()

                await TestUtil.sendMessage(session1, session2)
                await TestUtil.sendMessage(session1, session2)
                await TestUtil.sendMessage(session1, session2)
                await sleep(300)
                await session2.transportServices.account.syncEverything()
            })

            after(async function () {
                await that.runtime.stop()
            })

            it("should have created two different sessions", function () {
                expect(session1).to.exist
                expect(session2).to.exist
                expect(session3).to.exist

                const session1Address = session1.accountController.identity.identity.address.toString()
                const session2Address = session2.accountController.identity.identity.address.toString()
                const session3Address = session3.accountController.identity.identity.address.toString()
                expect(session1Address).to.not.equal(session2Address)
                expect(session1Address).to.not.equal(session3Address)
            })

            it("should have created a relationship", function () {
                expect(relationshipId).to.exist
                expect(BackboneIds.relationship.validate(relationshipId)).to.equal(true)
            })

            describe("Render Relationships", function () {
                it("should render all relationships", async function () {
                    const result = await session2.appServices.relationships.renderAllRelationships()
                    TestUtil.expectSuccess(result)

                    expect(result.value).to.have.lengthOf(2)
                })

                it("should render active relationships", async function () {
                    const result = await session2.appServices.relationships.renderActiveRelationships()
                    TestUtil.expectSuccess(result)
                    expect(result.value).to.have.lengthOf(1)
                })
            })

            it("should render relationshipItems", async function () {
                const result = await session2.appServices.relationships.renderRelationshipItems(relationshipId, 2)
                TestUtil.expectSuccess(result)

                const items = result.value

                expect(items).to.have.lengthOf(2)
                expect(new Date(items[0].date!)).to.be.greaterThan(new Date(items[1].date!))
            })
        })
    }
}
