"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv").config("../.env");
const healthCheck_1 = __importDefault(require("./healthCheck"));
const backupFunctions_1 = require("./backupFunctions");
const cron = require('node-cron');
const fs = require("fs-extra");
const logger = require("pino")();
const path = require("node:path");
(0, healthCheck_1.default)();
// read the backup log into memory
const backupLog = JSON.parse(fs.readFileSync(path.join(__dirname, "backup-log.json"), "utf-8"));
//attempt to run backups when started
(0, backupFunctions_1.createDailyBackup)(backupLog);
(0, backupFunctions_1.createWeeklyBackup)(backupLog);
(0, backupFunctions_1.createMonthlyBackup)(backupLog);
(0, backupFunctions_1.createYearlyBackup)(backupLog);
//attempt to run them every 12 hours
cron.schedule('* * 12 * * *', () => {
    logger.info('Running bulk backup job...');
    (0, backupFunctions_1.createDailyBackup)(backupLog);
    (0, backupFunctions_1.createWeeklyBackup)(backupLog);
    (0, backupFunctions_1.createMonthlyBackup)(backupLog);
    (0, backupFunctions_1.createYearlyBackup)(backupLog);
    logger.info('Finished bulk backup job.');
});
