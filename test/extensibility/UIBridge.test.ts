import { ApplicationError, Result } from "@js-soft/ts-utils"
import { IUIBridge, LocalAccountDTO } from "@nmshd/app-runtime"
import { expect } from "chai"
import { AbstractTest } from "../lib"

export class FakeUIBridge implements IUIBridge {
    public showMessage(): Promise<Result<void, ApplicationError>> {
        throw new Error("Method not implemented.")
    }
    public showRelationship(): Promise<Result<void, ApplicationError>> {
        throw new Error("Method not implemented.")
    }
    public showRelationshipChange(): Promise<Result<void, ApplicationError>> {
        throw new Error("Method not implemented.")
    }
    public showRelationshipTemplate(): Promise<Result<void, ApplicationError>> {
        throw new Error("Method not implemented.")
    }
    public showDeviceOnboarding(): Promise<Result<void, ApplicationError>> {
        throw new Error("Method not implemented.")
    }
    public showRecovery(): Promise<Result<void, ApplicationError>> {
        throw new Error("Method not implemented.")
    }
    public showError(): Promise<Result<void, ApplicationError>> {
        throw new Error("Method not implemented.")
    }
    public requestAccountSelection(): Promise<Result<LocalAccountDTO, ApplicationError>> {
        throw new Error("Method not implemented.")
    }
}

export class UIBridgeTest extends AbstractTest {
    public run(): void {
        const that = this

        describe("UIBridge", function () {
            this.timeout(60000)

            before(async function () {
                await that.createRuntime()
                await that.runtime.start()
            })

            it("returns the same UIBridge for concurrent calls", async function () {
                const promises = [that.runtime.uiBridge(), that.runtime.uiBridge()]

                that.runtime.registerUIBridge(new FakeUIBridge())

                const results = await Promise.all(promises)
                for (const bridge of results) expect(bridge).to.be.instanceOf(FakeUIBridge)
            })

            it("returns a UIBridge for subsequent calls", async function () {
                const bridge = await that.runtime.uiBridge()
                expect(bridge).to.be.instanceOf(FakeUIBridge)
            })

            after(async function () {
                await that.runtime.stop()
            })
        })
    }
}
