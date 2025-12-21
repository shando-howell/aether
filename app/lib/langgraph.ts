import { ChatAnthropic } from "@langchain/anthropic";
import { ChatPromptTemplate, MessagesPlaceholder } from "@langchain/core/prompts";
import wxflows from "@wxflows/sdk/langchain";
import {
    SystemMessage, BaseMessage, AIMessage, HumanMessage, trimMessages
} from "@langchain/core/messages";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import { 
    MessagesAnnotation, MemorySaver, START, END, StateGraph
} from "@langchain/langgraph";

// Implement the message trimmer object
const trimmer = trimMessages({
    maxTokens: 10,
    tokenCounter: (msgs) => msgs.length,
    strategy: "last",
    allowPartial: false,
    includeSystem: true,
    startOn: "human"
});

// Implement the wxflows tool client
const toolClient = new wxflows({
    endpoint: "",
    apikey: ""
});

// Retrieve the tools from the tool client
const tools = await toolClient.lcTools;
const toolNode = new ToolNode(tools);

// Initialize model
const initializeModel = () => {
    const model = new ChatAnthropic({
        modelName: "",
        anthropicApiKey: "",
        temperature: 0.7,
        maxTokens: 4096,
        streaming: true,

        // Enable prompt caching
        clientOptions: {
            defaultHeaders: {
                "anthropic-beta": "prompt-caching-2024"
            }
        }
    }).bindTools(tools);

    return model;
}

// Implement the conditional edge for the state graph
const shouldContinue = (state: typeof MessagesAnnotation) => {
   
}

// Implement the workflow
const createWorkflow = () => {
    // Initialize the LLM model
    const model = initializeModel();

    // Implement the state graph
    const stateGraph = new StateGraph(MessagesAnnotation).addNode(
        "agent", async (state) => {
            // Declare system message content
            const systemContent = new SystemMessage("SYSTEM_MESSAGE");

            // Implement prompt template with system content and messages placeholder
            const promptTemplate = ChatPromptTemplate.fromMessages([
                new SystemMessage(systemContent, {
                    cache_control: {type: "ephemeral"}
                }),
                new MessagesPlaceholder("messages")
            ])

            // Trim the messages
            const trimmedMessages = await trimmer.invoke(state.messages);

            // Format prompt for current messages

            // Get response from LLM

            return {}
        }
    )
    .addEdge(START, "agent")
    .addNode("tools", toolNode)
    // To add conditional edge as well as final node

    return stateGraph;
}

const addCacheHeaders = (messages: BaseMessage[]) => {
    // Steps to cache a turn by turn conversation
    // 1. Cache the first system message
    // 2. Cache the last message
    // 3. Cache the second to last human message

    // Check if there are messages 
    if (!messages.length) {
        return messages;
    }

    // Cache all messages to avoid mutating the original
    const cachedMessages = [...messages];

    // Add cache header helper function

    // Cache the last message

    // Cache the second to last human message

    return cachedMessages;
}

// Submit the query button
export const submitQuery = async (
    messages: BaseMessage[], chatId: string
) => {
    // Cache the message
    const cachedMessages = addCacheHeaders(messages);

    // Initialize workflow
    const workflow = createWorkflow();

    // Create a checkpointer to save conversation history
    const checkpointer = new MemorySaver();
    const app = workflow.compile({ checkpointer });

    // Run the graph and stream
    const stream = await app.streamEvents(
        {
            messages: cachedMessages,
        },
        {
            version: "v2",
            configurable: {
                thread_id: chatId,
            },
            streamMode: "messages",
            runId: chatId
        },
    );

    return stream;
}

