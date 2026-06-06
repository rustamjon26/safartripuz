const { io } = require("socket.io-client");
const s = io("http://127.0.0.1:3000", { transports: ["websocket", "polling"] });
s.on("connect", () => {
  console.log("client-ok", s.id);
  s.disconnect();
  process.exit(0);
});
setTimeout(() => process.exit(1), 8000);
