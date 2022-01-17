import { AppRuntime } from "../AppRuntime"
import { AppRelationshipFacade, AppStringProcessorFacade } from "./facades"

export class AppServices {
    public readonly relationships: AppRelationshipFacade
    public readonly stringProcessor: AppStringProcessorFacade

    public constructor(appRuntime: AppRuntime) {
        this.relationships = new AppRelationshipFacade(appRuntime)
        this.stringProcessor = new AppStringProcessorFacade(appRuntime)
    }
}
