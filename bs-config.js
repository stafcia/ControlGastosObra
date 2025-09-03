module.exports = {
  proxy: "localhost:3005",
  files: ["src/**/*", "server/**/*", "views/**/*"],
  port: 3004,
  ui: {
    port: 3006
  },
  // Important: Configure WebSocket proxying for Socket.IO
  ws: true,
  middleware: [],
  // Disable the BrowserSync overlay for Socket.IO
  ghostMode: false,
  // Configure the proxy to handle WebSocket connections
  proxyWs: true
};