import { AppConfig, AppRuntime } from "@jssnmshd/app-runtime"
import { NativeBootstrapperMock } from "../mocks/NativeBootstrapperMock"

export abstract class AbstractTest {
    protected runtime: AppRuntime

    public constructor(public readonly config: AppConfig) {}

    public abstract run(): void

    protected async createRuntime(): Promise<void> {
        const nativeBootstrapperMock = new NativeBootstrapperMock()
        await nativeBootstrapperMock.init()
        this.runtime = await AppRuntime.create(nativeBootstrapperMock, this.config)
    }

    protected async createRuntimeWithoutInit(): Promise<void> {
        const nativeBootstrapperMock = new NativeBootstrapperMock()
        await nativeBootstrapperMock.init()
        this.runtime = new AppRuntime(nativeBootstrapperMock, this.config)
    }
}
