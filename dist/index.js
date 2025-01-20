"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = require("dotenv").config("../.env");
const backupFunctions_1 = require("./backupFunctions");
const healthCheck_1 = __importDefault(require("./healthCheck"));
const cron = require("node-cron");
const fs = require("fs-extra");
const logger = require("pino")();
const path = require("node:path");
(0, healthCheck_1.default)();
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // read the backup log into memory
        const backupLog = JSON.parse(fs.readFileSync(path.join(__dirname, "backup-log.json"), "utf-8"));
        //attempt to run backups when started
        logger.info("Running bulk backup job...");
        yield (0, backupFunctions_1.createDailyBackup)(backupLog);
        yield (0, backupFunctions_1.createWeeklyBackup)(backupLog);
        yield (0, backupFunctions_1.createMonthlyBackup)(backupLog);
        yield (0, backupFunctions_1.createYearlyBackup)(backupLog);
        logger.info("Finished bulk backup job.");
        //attempt to run them every 12 hours
        cron.schedule("* * 12 * * *", () => {
            logger.info("Running bulk backup job...");
            (0, backupFunctions_1.createDailyBackup)(backupLog);
            (0, backupFunctions_1.createWeeklyBackup)(backupLog);
            (0, backupFunctions_1.createMonthlyBackup)(backupLog);
            (0, backupFunctions_1.createYearlyBackup)(backupLog);
        });
    });
}
main();
