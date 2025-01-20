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
exports.createDailyBackup = createDailyBackup;
exports.createWeeklyBackup = createWeeklyBackup;
exports.createMonthlyBackup = createMonthlyBackup;
exports.createYearlyBackup = createYearlyBackup;
const node_os_1 = __importDefault(require("node:os"));
const node_path_1 = __importDefault(require("node:path"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const b2Functions_1 = require("./b2Functions");
const createZipFromPath_1 = __importDefault(require("./createZipFromPath"));
const logger = require("pino")();
const { format } = require("date-fns");
// Environment variable validation
if (!(process.env.B2_BUCKET_ID && process.env.BACKUP_FOLDER_PATH)) {
    logger.fatal("The required environment variables are not declared!");
    process.exit(1);
}
const b2BucketID = process.env.B2_BUCKET_ID;
const backupPath = process.env.BACKUP_FOLDER_PATH;
const tempBackupFolderPath = process.env.TEMP_BACKUP_FOLDER_PATH || node_os_1.default.tmpdir();
//Helper function to determine if a backup is required.
function isBackupRequired(lastRan, retentionPeriod) {
    return !lastRan || Date.now() > Number(lastRan) + retentionPeriod;
}
// Helper function to create the ZIP file and upload it.
function createAndUploadBackup(backupType, uploadPath) {
    return __awaiter(this, void 0, void 0, function* () {
        const backupTime = Date.now();
        const tempFileName = `SharePoint_Backup[${format(new Date(), "yyyy-MM-dd")}].zip`;
        const tempFilePath = node_path_1.default.join(tempBackupFolderPath, tempFileName);
        try {
            logger.info(`Creating ${backupType} backup`);
            // Step 1: Create ZIP file
            yield (0, createZipFromPath_1.default)(backupPath, tempFilePath);
            // Step 2: Check ZIP file size
            const fileStat = yield fs_extra_1.default.stat(tempFilePath);
            if (fileStat.size < 100 * 1024 * 1024 * 2) {
                logger.fatal("Backup folder size is too small for upload.");
                return null;
            }
            // Step 3: Upload to B2
            const uploadData = yield (0, b2Functions_1.uploadLargeFileToB2)(tempFilePath, b2BucketID, uploadPath);
            return {
                lastRan: backupTime.toString(),
                fileName: uploadData.data.fileName,
                fileID: uploadData.data.fileId,
                fileSize: uploadData.data.contentLength,
            };
        }
        catch (error) {
            logger.fatal(`Error during ${backupType} backup: ${error}`);
            return null;
        }
        finally {
            yield fs_extra_1.default.rm(tempFilePath, { force: true });
        }
    });
}
/// Generalized backup creation function.
function handleBackup(backupArray, backupType, backuplog, retentionPeriod, uploadPath) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, _b;
        const lastRan = backupType === "yearly"
            ? (_a = backuplog.yearly) === null || _a === void 0 ? void 0 : _a.lastRan
            : (_b = backupArray === null || backupArray === void 0 ? void 0 : backupArray.at(-1)) === null || _b === void 0 ? void 0 : _b.lastRan;
        // Check if a backup is required
        if (isBackupRequired(lastRan, retentionPeriod)) {
            const newBackup = yield createAndUploadBackup(backupType, uploadPath);
            if (newBackup) {
                if (backupType === "yearly") {
                    // Update the yearly log entry
                    backuplog.yearly = newBackup;
                }
                else if (backupArray) {
                    // Handle other backup types
                    const fileToDelete = backupArray.shift(); // Remove the oldest backup
                    if (fileToDelete) {
                        logger.warn(`Deleting file: ${fileToDelete.fileName}`);
                        yield (0, b2Functions_1.deleteFileVersion)(fileToDelete.fileName, fileToDelete.fileID).catch((err) => {
                            logger.error(`Failed to delete file: ${err}`);
                        });
                    }
                    backupArray.push(newBackup); // Add the new backup
                }
                // Write updated log to disk
                yield fs_extra_1.default.writeFile(node_path_1.default.join(__dirname, "backup-log.json"), JSON.stringify(backuplog, null, 2), "utf-8");
                logger.info(`${backupType} backup log updated successfully.`);
            }
        }
        else {
            logger.warn(`Last ${backupType} backup was created recently, skipping...`);
        }
    });
}
// Individual backup functions.
function createDailyBackup(backuplog) {
    return __awaiter(this, void 0, void 0, function* () {
        yield handleBackup(backuplog.daily, "daily", backuplog, 86400 * 1000, "daily/");
    });
}
function createWeeklyBackup(backuplog) {
    return __awaiter(this, void 0, void 0, function* () {
        yield handleBackup(backuplog.weekly, "weekly", backuplog, 86400 * 1000 * 7, "weekly/");
    });
}
function createMonthlyBackup(backuplog) {
    return __awaiter(this, void 0, void 0, function* () {
        yield handleBackup(backuplog.monthly, "monthly", backuplog, 86400 * 1000 * 30, "monthly/");
    });
}
function createYearlyBackup(backuplog) {
    return __awaiter(this, void 0, void 0, function* () {
        yield handleBackup(null, "yearly", backuplog, 86400 * 1000 * 365, "yearly/");
    });
}
