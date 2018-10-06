"use strict";
import appInsights = require("applicationinsights");
import { Utility } from "./utility";

export class AppInsightsClient {

    public static EnableTelemetry = Utility.getConfiguration().get<boolean>("enableTelemetry");

    public static sendEvent(eventName: string, properties?: { [key: string]: string; }, measurements?: { [key: string]: number; }): void {
        if (this.EnableTelemetry) {
            this._client.trackEvent({name: eventName, properties, measurements});
        }
    }

    private static _config = appInsights.setup("d4c27ff4-02a1-41ed-bb90-2816cd675ab8");
    private static _client = appInsights.defaultClient;
}
