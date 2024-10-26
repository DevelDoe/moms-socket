import https from "https";
import { WebSocketServer } from "ws";
import fs from "fs";
import path from "path";
import fetch from "node-fetch"; // Use import syntax for fetch
import { config } from "dotenv";

const verbose = process.argv.includes("-v"); // Check for verbose flag (-v)

config(); // Load environment variables from .env

// Define the allowed origins from .env file
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(","); // Split by comma if multiple origins

// Your OpenAI API Key
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Add OpenAI API key

// Port for the WebSocket server (HTTPS/WSS)
const port = process.env.PORT || 4000;

// Load SSL/TLS certificates from .env paths
const serverOptions = {
    cert: fs.readFileSync(path.resolve(process.cwd(), process.env.SSL_CERT_PATH)), // Path to your SSL certificate
    key: fs.readFileSync(path.resolve(process.cwd(), process.env.SSL_KEY_PATH)), // Path to your private key
};

// Verbose logging function
function verboseLog(message, ...optionalParams) {
    if (verbose) {
        console.log(message, ...optionalParams);
    }
}

// Create an HTTPS server
const server = https.createServer(serverOptions);

// Attach WebSocket server to the HTTPS server
const wss = new WebSocketServer({ server });

console.log(`WebSocket server is listening securely on wss://localhost:${port}`);

async function getOpenAIResponse(prompt) {
    const openaiUrl = 'https://api.openai.com/v1/chat/completions';

    verboseLog('Sending prompt to OpenAI:', prompt);

    // Ensure the prompt is a string
    const requestBody = {
        model: "gpt-3.5-turbo", // or any other model you prefer
        messages: [{ role: "user", content: String(`
            This data represents a traders trades.
            summary is from todays trades and so is todayTrades. 
            the historicalTrades is a randome subset from the last week.
            could you please give some feed back on todays trading and progresss 
            start with a important constructive feedback but keept it positive towards the end, that lifts the mood up, feeling down is never helpfull :)
            Respond in the same language as you would find in the world of trading journalism.  
            : ${prompt}
            `) }], // Convert prompt to string
    };

    try {
        verboseLog('Sending request to OpenAI with request body:', requestBody);
        const response = await fetch(openaiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${OPENAI_API_KEY}`,
            },
            body: JSON.stringify(requestBody),
        });

        if (!response.ok) {
            const responseBody = await response.text();
            verboseLog('OpenAI response failed:', responseBody);
            throw new Error(`Failed to get response from OpenAI: ${responseBody}`);
        }

        const data = await response.json();
        verboseLog('Received response from OpenAI:', data);
        return data.choices[0].message.content; // Extract the response text
    } catch (error) {
        console.error("Error getting response from OpenAI:", error);
        throw error;
    }
}

// Listen for WebSocket connection events
wss.on("connection", (ws, req) => {
    const origin = req.headers.origin; // Get the Origin header from the request

    // Check if the origin is allowed
    if (!allowedOrigins.includes(origin)) {
        console.log(`Connection from origin ${origin} is not allowed.`);
        ws.close(); // Close the WebSocket connection if the origin is not allowed
        return;
    }

    verboseLog(`Connection from origin ${origin} is allowed.`);

    // Send a welcome message to the WebSocket client
    ws.send("Analyzing your trading data...");

    // Listen for messages from the client
    ws.on("message", async (message) => {
        verboseLog('Received message from client:', message);

        try {
            // Get response from OpenAI's GPT
            const aiResponse = await getOpenAIResponse(message);
            verboseLog('AI response:', aiResponse);

            // Send the AI response back to the WebSocket client
            ws.send(`${aiResponse}`);
        } catch (error) {
            console.error("Error processing AI response:", error);
            ws.send("Error processing your request. Please try again later.");
        }
    });

    // Listen for the client disconnecting
    ws.on("close", () => {
        verboseLog("Client disconnected");
    });
});

// Start the HTTPS/WebSocket server
server.listen(port, () => {
    verboseLog(`HTTPS/WebSocket server running at wss://localhost:${port}`);
});
