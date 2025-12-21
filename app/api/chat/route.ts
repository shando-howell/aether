import { ChatRequestBody } from "@/app/lib/types";
import { getConvexClient } from "@/app/lib/convex";
import { 
    AIMessage, HumanMessage, ToolMessage 
} from "@langchain/core/messages";
import { auth } from "@clerk/nextjs/server";
import { api } from "@/convex/_generated/api";
import {
    SSE_DATA_PREFIX, SSE_LINE_DELIMITER, StreamMessageType
} from "@/app/lib/types";
import { Stream } from "stream";
import { submitQuery } from "@/app/lib/langgraph";
import { NextResponse } from "next/server";

// Send SSE Message
function sendSSEMessage(
    writer: WritableStreamDefaultWriter<Uint8Array>,
    data: StreamMessage
) {
    const encoder = new TextEncoder();
    return writer.write(
        encoder.encode(
            `${SSE_DATA_PREFIX}${JSON.stringify(data)}${SSE_LINE_DELIMITER}`
        )
    )
}

// POST Route
export async function POST(req: Request) {
    try {
        // Verify auth 
        const { userId } = auth();
        if (!userId) {
            return new Response("Unauthorized", {status: 401})
        }

        // Retrieve the data from the request body
        const data = (await req.json()) as ChatRequestBody;
        const { messages, newMessage, chatId } = data;

        // Initialize convex client
        const convex = getConvexClient();

        // Implement stream with performance optimization (larger queue stratgy)
        const stream = new TransformStream({}, {highWaterMark: 1024});
        const writer = stream.writable.getWriter();

        // Modify response headers for SSE
        const response = new Response(stream.readable, {
            headers: {
                "Content-Type": "text/events-stream",
                Connection: "keep-alive",
                "X-Accel-Buffering": "no"
            }
        })

        const startStream = async () => {
            try {
                // Begin stream implementation
                // Send initial SSE connection message
                // await sendSSEMessage(writer, {type: StreamMessageType.Connected})

                // Store the message in DB
                // await convex.mutation(api.messages.send, {
                //     chatId,
                //     content: newMessage
                // })

                // Format messages for langchain
                // const langChainMessage = [
                //     ...messages.map((msg) => {
                //         msg.role === "user"
                //             ? new HumanMessage(msg.content)
                //             : new AIMessage(msg.content)
                //     }),
                //     new HumanMessage(newMessage),
                // ];

                try {
                    // Create the event stream
                    // const eventStream = await submitQuery(langChainMessage, chatId);

                    // Process the events
                    for await (const event of eventStream) {
                        if (event.event === "on_chat_model_stream") {
                            const token = event.data.chunk;
                            if (token) {
                                // Access the text property from the AIMessageChunk
                                const text = token.content.at(0)?.["text"];

                                if (text) {
                                    await sendSSEMessage(writer, {
                                        type: StreamMessageType.Token,
                                        token: text,
                                    });
                                }
                            }
                        } else if (event.event === "on_tool_start") {
                            await sendSSEMessage(writer, {
                                type: StreamMessageType.ToolStart,
                                tool: event.name || "unknown",
                                input: event.data.input,
                            });
                        } else if (event.event === "on_tool_end") {
                            const toolMessage = new ToolMessage(event.data.output);

                            await sendSSEMessage(writer, {
                                type: StreamMessageType.ToolEnd,
                                tool: toolMessage.lc_kwargs.name || "unknown",
                                output: event.data.output
                            });
                        }
                    }
                    
                    // Send the completion message without storing the response
                    await sendSSEMessage(writer, {type: StreamMessageType.Done})
                } catch (streamError) {
                    console.log("Error in event stream: ", streamError);
                    await sendSSEMessage(writer, {
                        type: StreamMessageType.Error,
                        error: streamError instanceof Error
                            ? streamError.message
                            : "Stream processing failed"
                    });
                }
            } catch (error) {
                console.error("Error in stream", error);
                await sendSSEMessage(writer, {
                    type: StreamMessageType.Error,
                    error: error instanceof Error ? error.message : "Unknown error"
                });
            } finally {
                try {
                    writer.close()
                } catch (closeError) {
                    console.error("Error closing writer:", closeError)
                }
            }
        };

        startStream();
        return response;
    } catch (error) {
        console.error("An error occured in the Chat API:", error);
        return NextResponse.json(
            {error: "Failed to process chat request"} as const,
            {status: 500}
        );
    }
}