// Import necessary modules
const https = require("https");
const WebSocket = require("ws");
const fs = require("fs");
const path = require("path");

// Port for the WebSocket server (HTTPS/WSS)
const port = 4000;

// Load SSL/TLS certificates
const serverOptions = {
	cert: fs.readFileSync(
		path.resolve(__dirname, "./certificate.pem")
	), // Path to your SSL certificate
	key: fs.readFileSync(
		path.resolve(__dirname, "./private-key.pem")
	), // Path to your private key
};

// Create an HTTPS server
const server = https.createServer(serverOptions);

// Attach WebSocket server to the HTTPS server
const wss = new WebSocket.Server({ server });

console.log(`Websocket server is listening on ws://localhost:${port}`);

// Listen for connection events
wss.on("connection", (ws) => {
	console.log("New client connected");

	// Send a welcome message to the client
	ws.send("Welcome to the WebSocket server!");

	// Listen for messages from the client
	ws.on("message", (message) => {
		console.log(`Received: ${message}`);
		// Echo the message back to the client
		ws.send(`Echo: ${message}`);
	});

	// Listen for the client disconnecting
	ws.on("close", () => {
		console.log("Client disconnected");
	});
});
