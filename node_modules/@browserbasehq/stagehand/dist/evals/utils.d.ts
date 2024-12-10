import { AvailableModel, Stagehand } from "../lib";
import { LogLine } from "../types/log";
export declare const env: "BROWSERBASE" | "LOCAL";
export declare const initStagehand: ({ modelName, domSettleTimeoutMs, logger, }: {
    modelName: AvailableModel;
    domSettleTimeoutMs?: number;
    logger: EvalLogger;
}) => Promise<{
    stagehand: Stagehand;
    logger: EvalLogger;
    initResponse: import("../lib").InitResult;
}>;
type LogLineEval = LogLine & {
    parsedAuxiliary?: string | object;
};
export declare class EvalLogger {
    logs: LogLineEval[];
    stagehand?: Stagehand;
    constructor();
    init(stagehand: Stagehand): void;
    log(logLine: LogLine): void;
    error(logLine: LogLine): void;
    warn(logLine: LogLine): void;
    getLogs(): LogLineEval[];
}
export declare function normalizeString(str: string): string;
export {};
