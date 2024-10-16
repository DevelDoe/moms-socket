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
