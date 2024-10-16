const https = require("https");
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");
const { verboseLog } = require('./utils')

// Load environment variables from .env file
require("dotenv").config();

// Define the allowed origins from .env file
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(","); // Split by comma if multiple origins

// Your Telegram Bot Token and OpenAI API Key
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY; // Add OpenAI API key

// Port for the WebSocket server (HTTPS/WSS)
const port = process.env.PORT || 4000;

// Load SSL/TLS certificates from .env paths
const serverOptions = {
	cert: fs.readFileSync(path.resolve(__dirname, process.env.SSL_CERT_PATH)), // Path to your SSL certificate
	key: fs.readFileSync(path.resolve(__dirname, process.env.SSL_KEY_PATH)), // Path to your private key
};

// Create an HTTPS server
const server = https.createServer(serverOptions);

// Attach WebSocket server to the HTTPS server
const wss = new WebSocket.Server({ server });

console.log(
	`WebSocket server is listening securely on wss://localhost:${port}`
);

// Listen for connection events and get the `req` object as the second parameter
wss.on("connection", (ws, req) => {
	const origin = req.headers.origin; // Get the Origin header from the request

	// Check if the origin is allowed
	if (!allowedOrigins.includes(origin)) {
		verboseLog(`Connection from origin ${origin} is not allowed.`);
		ws.close(); // Close the WebSocket connection if the origin is not allowed
		return;
	}

	verboseLog(`Connection from origin ${origin} is allowed.`);

	// Send a welcome message to the client
	ws.send("Welcome to the WebSocket server!");

	// Listen for messages from the client
	ws.on("message", (message) => {
		verboseLog(`Received: ${message}`);
		// Echo the message back to the client
		ws.send(`Echo: ${message}`);
	});

	// Listen for the client disconnecting
	ws.on("close", () => {
		verboseLog("Client disconnected");
	});
});

// Start the HTTPS/WebSocket server
server.listen(port, () => {
	console.log(`HTTPS/WebSocket server running at wss://localhost:${port}`);
});


/**
 * Send a message to GPT via Telegram bot.
 *
 * @param {string} chatId - The ID of the chat to send the message to.
 * @param {string} text - The message content to send.
 * @returns {Promise<void>} - Resolves when the message has been successfully sent.
 * @throws {Error} - Throws an error if the request to the Telegram API fails.
 */
async function sendTelegramMessageToChat(chatId, text) {
    const encodedMessage = encodeURIComponent(text);
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage?chat_id=${chatId}&text=${encodedMessage}`;

    try {
        verboseLog(`Sending message to Telegram: ${telegramUrl}`);
        const response = await fetch(telegramUrl);

        if (!response.ok) {
            const responseBody = await response.text();
            throw new Error(`Failed to send Telegram message: ${response.statusText}. Response: ${responseBody}`);
        }

        verboseLog("Message sent successfully:", text);
    } catch (error) {
        console.error("Error sending message to chat:", error);
    }
}

/**
 * Get a response from OpenAI's GPT model.
 *
 * @param {string} prompt - The prompt to send to OpenAI.
 * @returns {Promise<string>} - The response text from OpenAI.
 * @throws {Error} - Throws an error if the request to OpenAI fails.
 */
async function getOpenAIResponse(prompt) {
    const openaiUrl = 'https://api.openai.com/v1/chat/completions';

    const requestBody = {
        model: "gpt-3.5-turbo", // or any other model you prefer
        messages: [{ role: "user", content: prompt }],
    };

    try {
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
            throw new Error(`Failed to get response from OpenAI: ${responseBody}`);
        }

        const data = await response.json();
        return data.choices[0].message.content; // Extract the response text
    } catch (error) {
        console.error("Error getting response from OpenAI:", error);
        throw error;
    }
}

let lastUpdateId = 0; // Store the last processed update ID

/**
 * Poll Telegram for updates and respond with OpenAI's answers.
 */
async function getTelegramUpdates() {
    const telegramUrl = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates?offset=${lastUpdateId + 1}`;

    try {
        const response = await fetch(telegramUrl);
        const data = await response.json();

        verboseLog("Received Telegram updates:", JSON.stringify(data, null, 2));

        // Loop through updates and respond to each message
        for (const update of data.result) {
            if (update.message) {
                const userMessage = update.message.text;
                const chatId = update.message.chat.id;

                verboseLog(`User message: "${userMessage}" from chat ${chatId}`);

                // Get response from OpenAI
                const aiResponse = await getOpenAIResponse(userMessage);

                // Send AI response back to the user via Telegram
                await sendTelegramMessageToChat(chatId, aiResponse);

                // Update the last processed update_id
                lastUpdateId = update.update_id;
            }
        }
    } catch (error) {
        console.error("Error getting Telegram updates:", error);
    }
}

// Poll for updates every 3 seconds
setInterval(getTelegramUpdates, 3000); // Polling every 3 seconds