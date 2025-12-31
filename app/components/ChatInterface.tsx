"use client";

import { Id, Doc } from "@/convex/_generated/dataModel";
import { useState, useEffect, useRef } from "react";
import { ChatRequestBody, StreamMessageType } from "../lib/types";
import { createSSEParser } from "../lib/createSSEParser";
import { api } from "@/convex/_generated/api";

interface ChatInterfaceProps {
    chatId: Id<"chats">,
    initialMessages: [] // To change
};

const ChatInterface = ({ chatId, initialMessages }: ChatInterfaceProps) => {
    // Implement component state
    const [messages, setMessages] = useState(initialMessages); // To change
    const [input, setInput] = useState("");
    const [isLoading, setIsLoading] = useState(false);
    const [streamedResponse, setStreamedResponse] = useState("");
    const [currentTool, setCurrentTool] = useState<{tool: string, input: unknown}| null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Format tool output
    const formatToolOutput = (output: string) => {
        if (typeof output === "string") {
            return output;
        }
        return JSON.stringify(output, null, 2);
    }

    // Format terminal message
    const formatTerminalMessage = (
        tool: string,
        input: "unknown",
        output: "unknown"
    ) => {
        const terminalHTML = `
            <div>${tool}</div>
            <pre>${formatToolOutput(input)}</pre>
            <pre>${formatToolOutput(output)}</pre>
        `;
        return `${terminalHTML}`
    }

    // Process stream helper function
    const processStream = async (
        reader: ReadableStreamDefaultReader<Uint8Array>,
        onChunk: (chunk: string) => Promise<void>
    ) => {
        try {
            while (true) {
                const {done, value} = await reader.read();
                if (done) break;
                await onChunk(new TextDecoder().decode(value));
            }
        } finally {
            reader.releaseLock();
        }
    }

    // Handle side-effect of DOM reference
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({behavior: "smooth"});
    }, [messages, streamedResponse]);

    // Handle form submit function
    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
    }

    return (
        <>
            <form>
                <input type="text" />
                <button>Send Message</button>
            </form>
        </>
    )
}

export default ChatInterface;
