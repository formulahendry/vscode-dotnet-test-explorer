"use strict";
import appInsights = require("applicationinsights");
import { Utility } from "./utility";

export class AppInsightsClient {
    public static sendEvent(eventName: string, properties?: { [key: string]: string; }): void {
        if (this._enableTelemetry) {
            this._client.trackEvent(eventName, properties);
        }
    }

    private static _client = appInsights.getClient("d4c27ff4-02a1-41ed-bb90-2816cd675ab8");
    private static _enableTelemetry = Utility.getConfiguration().get<boolean>("enableTelemetry");
}
