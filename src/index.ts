const dotenv = require("dotenv").config("../.env")

import runHealthCheck from "./healthCheck";
import { createDailyBackup, createWeeklyBackup, createMonthlyBackup, createYearlyBackup, type BackupLog} from "./backupFunctions";

const cron = require('node-cron')
const fs = require("fs-extra");
const logger = require("pino")();
const path = require("node:path");

runHealthCheck()

// read the backup log into memory
const backupLog: BackupLog = JSON.parse(
	fs.readFileSync(path.join(__dirname, "backup-log.json"), "utf-8"),
);

//attempt to run backups when started
createDailyBackup(backupLog)
createWeeklyBackup(backupLog)
createMonthlyBackup(backupLog)
createYearlyBackup(backupLog)

//attempt to run them every 12 hours
cron.schedule('* * 12 * * *', ()=>{
    logger.info('Running bulk backup job...')
    createDailyBackup(backupLog)
    createWeeklyBackup(backupLog)
    createMonthlyBackup(backupLog)
    createYearlyBackup(backupLog)
    logger.info('Finished bulk backup job.')
})



