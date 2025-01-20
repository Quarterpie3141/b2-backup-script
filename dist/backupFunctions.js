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
const fs_extra_1 = __importDefault(require("fs-extra"));
const b2Functions_1 = require("./b2Functions");
const createZipFromPath_1 = __importDefault(require("./createZipFromPath"));
const logger = require("pino")();
const { format } = require("date-fns");
const os = require("node:os");
const node_path_1 = __importDefault(require("node:path"));
//check for the required enviroment variables
if (!(process.env.B2_BUCKET_ID && process.env.BACKUP_FOLDER_PATH)) {
    logger.fatal("The required enviroment variables are not declared!");
    process.exit(1);
}
const b2BucketID = process.env.B2_BUCKET_ID;
const backupPath = process.env.BACKUP_FOLDER_PATH;
function createDailyBackup(backuplog) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const dailyBackupArray = backuplog.daily;
        // Check if the file was run more than a day ago
        if (dailyBackupArray.length > 0 &&
            Date.now() > Number((_a = dailyBackupArray.at(-1)) === null || _a === void 0 ? void 0 : _a.lastRan) + 86400 * 1000) {
            const backupTime = Date.now();
            logger.info("Creating a Daily backup");
            const tempFileName = `SharePoint_Backup[${format(new Date(), "yyyy-MM-dd")}].zip`;
            const tempFilePath = node_path_1.default.join(os.tmpdir(), tempFileName);
            try {
                // Step 1: Create the ZIP file
                yield (0, createZipFromPath_1.default)(backupPath, tempFilePath);
                // Step 2: Check the size of the ZIP file
                const fileStat = yield fs_extra_1.default.stat(tempFilePath);
                if (fileStat.size < 50 * 1024 * 1024) {
                    logger.fatal("Backup folder size is too small for upload.");
                    return;
                }
                // Step 3: Upload the file to B2
                const uploadData = yield (0, b2Functions_1.uploadLargeFileToB2)(tempFilePath, b2BucketID, "daily/");
                // Step 4: Update the backup log
                const uploadedFileLogEntry = {
                    lastRan: backupTime.toString(),
                    fileName: uploadData.data.fileName,
                    fileID: uploadData.data.fileId,
                    fileSize: uploadData.data.contentLength,
                };
                logger.info("Updating backup log.");
                const fileToDelete = dailyBackupArray.shift();
                dailyBackupArray.push(uploadedFileLogEntry);
                backuplog.daily = dailyBackupArray;
                // Step 5: Delete the oldest file from B2
                logger.warn(`Deleting file: ${fileToDelete.fileName}`);
                yield (0, b2Functions_1.deleteFileVersion)(fileToDelete.fileName, fileToDelete.fileID)
                    .then(() => {
                    logger.info(`Sucsessfully deleted file: ${fileToDelete.fileName}`);
                })
                    .catch((err) => {
                    logger.error(`Failed to delete file. ${err}`);
                });
                // Step 5: Write the updated log to disk
                yield fs_extra_1.default.writeFile(node_path_1.default.join(__dirname, "backup-log.json"), JSON.stringify(backuplog, null, 2), "utf-8");
                logger.info("Backup log updated successfully.");
            }
            catch (error) {
                logger.fatal(`Error during backup process: ${error}`);
            }
            finally {
                yield fs_extra_1.default.rm(tempFilePath, { force: true });
            }
        }
        else {
            logger.warn("Last backup was created less than a day ago, skipping...");
        }
    });
}
function createWeeklyBackup(backuplog) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const weeklyBackupArray = backuplog.weekly;
        // Check if the file was run more than a week(7 days) ago
        if (weeklyBackupArray.length > 0 &&
            Date.now() > Number((_a = weeklyBackupArray.at(-1)) === null || _a === void 0 ? void 0 : _a.lastRan) + 86400 * 1000 * 7) {
            const backupTime = Date.now();
            logger.info("Creating a Weekly backup");
            const tempFileName = `SharePoint_Backup[${format(new Date(), "yyyy-MM-dd")}].zip`;
            const tempFilePath = node_path_1.default.join(os.tmpdir(), tempFileName);
            try {
                // Step 1: Create the ZIP file
                yield (0, createZipFromPath_1.default)(backupPath, tempFilePath);
                // Step 2: Check the size of the ZIP file
                const fileStat = yield fs_extra_1.default.stat(tempFilePath);
                if (fileStat.size < 50 * 1024 * 1024) {
                    logger.fatal("Backup folder size is too small for upload.");
                    return;
                }
                // Step 3: Upload the file to B2
                const uploadData = yield (0, b2Functions_1.uploadLargeFileToB2)(tempFilePath, b2BucketID, "weekly/");
                // Step 4: Update the backup log
                const uploadedFileLogEntry = {
                    lastRan: backupTime.toString(),
                    fileName: uploadData.data.fileName,
                    fileID: uploadData.data.fileId,
                    fileSize: uploadData.data.contentLength,
                };
                logger.info("Updating backup log.");
                const fileToDelete = weeklyBackupArray.shift();
                weeklyBackupArray.push(uploadedFileLogEntry);
                backuplog.weekly = weeklyBackupArray;
                // Step 5: Delete the oldest file from B2
                logger.warn(`Deleting file: ${fileToDelete.fileName}`);
                yield (0, b2Functions_1.deleteFileVersion)(fileToDelete.fileName, fileToDelete.fileID)
                    .then(() => {
                    logger.info(`Sucsessfully deleted file: ${fileToDelete.fileName}`);
                })
                    .catch((err) => {
                    logger.error(`Failed to delete file. ${err}`);
                });
                // Step 5: Write the updated log to disk
                yield fs_extra_1.default.writeFile(node_path_1.default.join(__dirname, "backup-log.json"), JSON.stringify(backuplog, null, 2), "utf-8");
                logger.info("Backup log updated successfully.");
            }
            catch (error) {
                logger.fatal(`Error during backup process: ${error}`);
            }
            finally {
                yield fs_extra_1.default.rm(tempFilePath, { force: true });
            }
        }
        else {
            logger.warn("Last backup was created less than a week ago, skipping...");
        }
    });
}
function createMonthlyBackup(backuplog) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a;
        const monthlyBackupArray = backuplog.monthly;
        // Check if the file was run more than a month(30 days) ago
        if (monthlyBackupArray.length > 0 &&
            Date.now() > Number((_a = monthlyBackupArray.at(-1)) === null || _a === void 0 ? void 0 : _a.lastRan) + 86400 * 1000 * 30) {
            const backupTime = Date.now();
            logger.info("Creating a Monthly backup");
            const tempFileName = `SharePoint_Backup[${format(new Date(), "yyyy-MM-dd")}].zip`;
            const tempFilePath = node_path_1.default.join(os.tmpdir(), tempFileName);
            try {
                // Step 1: Create the ZIP file
                yield (0, createZipFromPath_1.default)(backupPath, tempFilePath);
                // Step 2: Check the size of the ZIP file
                const fileStat = yield fs_extra_1.default.stat(tempFilePath);
                if (fileStat.size < 50 * 1024 * 1024) {
                    logger.fatal("Backup folder size is too small for upload.");
                    return;
                }
                // Step 3: Upload the file to B2
                const uploadData = yield (0, b2Functions_1.uploadLargeFileToB2)(tempFilePath, b2BucketID, "monthly/");
                // Step 4: Update the backup log
                const uploadedFileLogEntry = {
                    lastRan: backupTime.toString(),
                    fileName: uploadData.data.fileName,
                    fileID: uploadData.data.fileId,
                    fileSize: uploadData.data.contentLength,
                };
                logger.info("Updating backup log.");
                const fileToDelete = monthlyBackupArray.shift();
                monthlyBackupArray.push(uploadedFileLogEntry);
                backuplog.monthly = monthlyBackupArray;
                // Step 5: Delete the oldest file from B2
                logger.warn(`Deleting file: ${fileToDelete.fileName}`);
                yield (0, b2Functions_1.deleteFileVersion)(fileToDelete.fileName, fileToDelete.fileID)
                    .then(() => {
                    logger.info(`Sucsessfully deleted file: ${fileToDelete.fileName}`);
                })
                    .catch((err) => {
                    logger.error(`Failed to delete file. ${err}`);
                });
                // Step 5: Write the updated log to disk
                yield fs_extra_1.default.writeFile(node_path_1.default.join(__dirname, "backup-log.json"), JSON.stringify(backuplog, null, 2), "utf-8");
                logger.info("Backup log updated successfully.");
            }
            catch (error) {
                logger.fatal(`Error during backup process: ${error}`);
            }
            finally {
                yield fs_extra_1.default.rm(tempFilePath, { force: true });
            }
        }
        else {
            logger.warn("Last backup was created less than a month ago, skipping...");
        }
    });
}
function createYearlyBackup(backuplog) {
    return __awaiter(this, void 0, void 0, function* () {
        let yearlyBackupEntry = backuplog.yearly;
        // Check if the file was run more than a year ago
        if (Date.now() > Number(yearlyBackupEntry.lastRan) + 86400 * 1000 * 365) {
            const backupTime = Date.now();
            logger.info("Creating a Yearly backup");
            const tempFileName = `SharePoint_Backup[${format(new Date(), "yyyy-MM-dd")}].zip`;
            const tempFilePath = node_path_1.default.join(os.tmpdir(), tempFileName);
            try {
                // Step 1: Create the ZIP file
                yield (0, createZipFromPath_1.default)(backupPath, tempFilePath);
                // Step 2: Check the size of the ZIP file
                const fileStat = yield fs_extra_1.default.stat(tempFilePath);
                if (fileStat.size < 50 * 1024 * 1024) {
                    logger.fatal("Backup folder size is too small for upload.");
                    return;
                }
                // Step 3: Upload the file to B2
                const uploadData = yield (0, b2Functions_1.uploadLargeFileToB2)(tempFilePath, b2BucketID, "yearly/");
                // Step 4: Update the yarly log entry
                const uploadedFileLogEntry = {
                    lastRan: backupTime.toString(),
                    fileName: uploadData.data.fileName,
                    fileID: uploadData.data.fileId,
                    fileSize: uploadData.data.contentLength,
                };
                yearlyBackupEntry = uploadedFileLogEntry;
                backuplog.yearly = yearlyBackupEntry;
                // Step 5: Write the updated log to disk
                yield fs_extra_1.default.writeFile(node_path_1.default.join(__dirname, "backup-log.json"), JSON.stringify(backuplog, null, 2), "utf-8");
                logger.info("Backup log updated successfully.");
            }
            catch (error) {
                logger.fatal(`Error during backup process: ${error}`);
            }
            finally {
                yield fs_extra_1.default.rm(tempFilePath, { force: true });
            }
        }
        else {
            logger.warn("Last backup was created less than a year ago, skipping...");
        }
    });
}
