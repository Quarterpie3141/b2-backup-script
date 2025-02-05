const dotenv = require("dotenv").config("../.env");

import {
	type BackupLog,
	createDailyBackup,
	createMonthlyBackup,
	createWeeklyBackup,
	createYearlyBackup,
} from "./backupFunctions";
import runHealthCheck from "./healthCheck";

const cron = require("node-cron");
const fs = require("fs-extra");
const logger = require("pino")();
const path = require("node:path");

runHealthCheck();

async function main() {
	// read the backup log into memory
	const backupLog: BackupLog = JSON.parse(
		fs.readFileSync(path.join(__dirname, "backup-log.json"), "utf-8"),
	);

	//attempt to run backups when started
	logger.info("Running bulk backup job...");
	await createDailyBackup(backupLog);
	await createWeeklyBackup(backupLog);
	await createMonthlyBackup(backupLog);
	await createYearlyBackup(backupLog);
	logger.info("Finished bulk backup job.");

	//attempt to run them every 12 hours
	cron.schedule("0 0 12 * * *", async () => {
		logger.info("Running bulk backup job...");
		await createDailyBackup(backupLog);
		await createWeeklyBackup(backupLog);
		await createMonthlyBackup(backupLog);
		await createYearlyBackup(backupLog);
	});
}

main();
