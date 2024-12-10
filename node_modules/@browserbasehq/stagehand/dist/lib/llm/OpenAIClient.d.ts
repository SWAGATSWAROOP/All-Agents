import { ClientOptions } from "openai";
import { ChatCompletion } from "openai/resources/chat";
import { LogLine } from "../../types/log";
import { AvailableModel } from "../../types/model";
import { LLMCache } from "../cache/LLMCache";
import { ChatCompletionOptions, LLMClient } from "./LLMClient";
export declare class OpenAIClient extends LLMClient {
    type: "openai";
    private client;
    private cache;
    logger: (message: LogLine) => void;
    private enableCaching;
    clientOptions: ClientOptions;
    constructor(logger: (message: LogLine) => void, enableCaching: boolean, cache: LLMCache | undefined, modelName: AvailableModel, clientOptions?: ClientOptions);
    createChatCompletion<T = ChatCompletion>(optionsInitial: ChatCompletionOptions, retries?: number): Promise<T>;
}
