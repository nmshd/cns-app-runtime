import { INativeTranslationProvider } from "@js-soft/native-abstractions"
import { Result } from "@js-soft/ts-utils"
import { expect } from "chai"
import { AbstractTest } from "../lib"

export class TranslationProviderTest extends AbstractTest {
    public run(): void {
        const that = this

        describe("TranslationProvider", function () {
            const defaultErrorMessage = "This is a default error."
            const noTranslationAvailable = "No translation available."

            before(async function () {
                await that.createRuntime()

                class SpecificTranslationProvider implements INativeTranslationProvider {
                    public translate(key: string, ..._values: any[]): Promise<Result<string>> {
                        switch (key) {
                            case "error.default":
                                return Promise.resolve(Result.ok(defaultErrorMessage))
                            default:
                                return Promise.resolve(Result.ok(noTranslationAvailable))
                        }
                    }
                }

                that.runtime.registerTranslationProvider(new SpecificTranslationProvider())
            })

            it("should translate 'error.default'", async function () {
                const translation = await that.runtime.translate("error.default")
                expect(translation).to.be.instanceOf(Result)
                expect(translation.isSuccess).to.be.true
                expect(translation.value).to.equal(defaultErrorMessage)
            })

            it("should translate 'test' to the default message", async function () {
                const translation = await that.runtime.translate("test")
                expect(translation).to.be.instanceOf(Result)
                expect(translation.isSuccess).to.be.true
                expect(translation.value).to.equal(noTranslationAvailable)
            })
        })
    }
}
