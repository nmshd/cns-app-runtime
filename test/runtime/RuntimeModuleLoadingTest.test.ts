import { AppConfig, AppRuntime, AppRuntimeModule } from "@jssnmshd/app-runtime"
import { expect } from "chai"
import { AbstractTest } from "../lib"

export class RuntimeModuleLoadingTest extends AbstractTest {
    public constructor(appConfig: AppConfig) {
        super({
            ...appConfig,
            modules: {
                testModule: {
                    name: "testModule",
                    displayName: "A Test Module",
                    location: "./",
                    enabled: true
                }
            }
        })
    }

    public run(): void {
        const that = this
        describe("RuntimeModuleLoading", function () {
            let moduleInitialized = false
            let moduleStarted = false
            let moduleStopped = false

            before(async function () {
                await that.createRuntimeWithoutInit()
                class TestModule extends AppRuntimeModule {
                    public init(): void {
                        moduleInitialized = true
                    }

                    public start(): void {
                        moduleStarted = true
                    }

                    public stop(): void {
                        moduleStopped = true
                    }
                }

                AppRuntime.registerModule("testModule", TestModule)
            })

            it("should init the module", async function () {
                await that.runtime.init()
                expect(moduleInitialized).to.be.true
            })

            it("should start and stop the module", async function () {
                await that.runtime.start()
                expect(moduleStarted).to.be.true
            }).timeout(10000)

            it("should stop the module", async function () {
                await that.runtime.stop()
                expect(moduleStopped).to.be.true
            })
        })
    }
}
