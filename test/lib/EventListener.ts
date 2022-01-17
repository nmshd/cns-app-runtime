import { LocalAccountSession } from "@nmshd/app-runtime"
import { DataEvent, Event, Runtime } from "@nmshd/runtime"

export class EventWrapper {
    public namespace: string
    public instance: Event
}

export class EventListener {
    public constructor(
        public readonly runtime: Runtime,
        public readonly listeningTo: (string | Function)[],
        public readonly session?: LocalAccountSession
    ) {}

    private receivedEvents: EventWrapper[] = []
    private waitingForEvent: string
    private promiseCallbacks: any
    private subscriptions: Record<string, number> = {}

    public getReceivedEvents(): EventWrapper[] {
        return this.receivedEvents
    }

    private eventHandler(namespace: string, eventInstance: Event) {
        if (this.session && eventInstance instanceof DataEvent) {
            if (eventInstance.eventTargetAddress !== this.session.address) {
                // Ignore event, it is not for our session
                return
            }
        }
        this.receivedEvents.push({ namespace: namespace, instance: eventInstance })
        if (this.waitingForEvent && this.waitingForEvent === namespace) {
            if (this.promiseCallbacks) {
                this.promiseCallbacks.resolve()
            }
        }
    }

    public async waitFor(event: string | Function): Promise<any> {
        this.promiseCallbacks = undefined
        this.waitingForEvent = typeof event === "function" ? event.name : event
        const promise = new Promise((resolve, reject) => {
            this.promiseCallbacks = { resolve: resolve, reject: reject }
        })
        return await promise
    }

    public start(): void {
        this.stop()
        this.receivedEvents = []
        this.listeningTo.forEach((event) => {
            const namespace = typeof event === "function" ? event.name : event
            const subscriptionId = this.runtime.eventBus.subscribe(event, (e) => {
                this.eventHandler(namespace, e)
            })
            this.subscriptions[namespace] = subscriptionId
        })
    }

    public stop(): void {
        for (const namespace in this.subscriptions) {
            this.runtime.eventBus.unsubscribe(namespace, this.subscriptions[namespace])
        }
        this.subscriptions = {}
    }
}
