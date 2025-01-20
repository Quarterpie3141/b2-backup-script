const app = require("express")();
const logger = require("pino")();
import type { Request, Response } from "express";

// extremely minimal and simple health check to see if the node process is still running(used for email notifications)

export default function runHealthCheck() {
	app.get("/health", (req: Request, res: Response) => {
		logger.info("Recieved health check.");
		res.send("ok");
	});
	app.listen(3000);
}
