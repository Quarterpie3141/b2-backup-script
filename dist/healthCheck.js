"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = runHealthCheck;
const app = require("express")();
const logger = require("pino")();
// extremely minimal and simple health check to see if the node process is still running(used for email notifications)
function runHealthCheck() {
    app.get("/health", (req, res) => {
        logger.info("Recieved health check.");
        res.send("ok");
    });
    app.listen(3000);
}
