"use strict";
import appInsights = require("applicationinsights");
import { Utility } from "./utility";

export class AppInsightsClient {

    public static EnableTelemetry = Utility.getConfiguration().get<boolean>("enableTelemetry");

    public static sendEvent(eventName: string, properties?: { [key: string]: string; }, measurments?: { [key: string]: number; }): void {
        if (this.EnableTelemetry) {
            this._client.trackEvent(eventName, properties, measurments);
        }
    }

    private static _client = appInsights.getClient("d4c27ff4-02a1-41ed-bb90-2816cd675ab8");
}
