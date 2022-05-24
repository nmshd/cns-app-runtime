import { ConsumptionServices, DataViewExpander, TransportServices } from "@nmshd/runtime"
import { AppRuntime } from "../AppRuntime"
import { AppRelationshipFacade, AppStringProcessorFacade } from "./facades"

export class AppServices {
    public readonly relationships: AppRelationshipFacade
    public readonly stringProcessor: AppStringProcessorFacade

    public constructor(
        appRuntime: AppRuntime,
        transportServices: TransportServices,
        consumptionServices: ConsumptionServices,
        expander: DataViewExpander
    ) {
        this.relationships = new AppRelationshipFacade(appRuntime, transportServices, consumptionServices, expander)
        this.stringProcessor = new AppStringProcessorFacade(
            appRuntime,
            transportServices,
            consumptionServices,
            expander
        )
    }
}
