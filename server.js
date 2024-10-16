const https = require('https');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env file
require('dotenv').config();

// Define the allowed origins from .env file
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(','); // Split by comma if multiple origins

// Port for the WebSocket server (HTTPS/WSS)
const port = process.env.PORT || 4000;

// Load SSL/TLS certificates
const serverOptions = {
  cert: fs.readFileSync(path.resolve(__dirname, './certificate.pem')), // Path to your SSL certificate
  key: fs.readFileSync(path.resolve(__dirname, './private-key.pem')), // Path to your private key
};

// Create an HTTPS server
const server = https.createServer(serverOptions);

// Attach WebSocket server to the HTTPS server
const wss = new WebSocket.Server({ server });

console.log(`WebSocket server is listening securely on wss://localhost:${port}`);

// Listen for connection events and get the `req` object as the second parameter
wss.on('connection', (ws, req) => {
  const origin = req.headers.origin; // Get the Origin header from the request

  // Check if the origin is allowed
  if (!allowedOrigins.includes(origin)) {
    console.log(`Connection from origin ${origin} is not allowed.`);
    ws.close(); // Close the WebSocket connection if the origin is not allowed
    return;
  }

  console.log(`Connection from origin ${origin} is allowed.`);

  // Send a welcome message to the client
  ws.send('Welcome to the WebSocket server!');

  // Listen for messages from the client
  ws.on('message', (message) => {
    console.log(`Received: ${message}`);
    // Echo the message back to the client
    ws.send(`Echo: ${message}`);
  });

  // Listen for the client disconnecting
  ws.on('close', () => {
    console.log('Client disconnected');
  });
});

// Start the HTTPS/WebSocket server
server.listen(port, () => {
  console.log(`HTTPS/WebSocket server running at wss://localhost:${port}`);
});
