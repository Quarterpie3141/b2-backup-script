import createZipFromPath from "./createZipFromPath";
import { uploadLargeFileToB2, deleteFileVersion } from "./b2Functions";
import fs from "fs-extra";
const logger = require("pino")();
const { format } = require("date-fns");
const os = require("node:os");
import path from "node:path";

interface FileInfo {
	lastRan: string;
	fileName: string;
	fileID: string;
	fileSize: string;
}

export interface BackupLog {
	daily: FileInfo[];
	weekly: FileInfo[];
	monthly: FileInfo[];
	yearly: FileInfo;
}

//check for the required enviroment variables
if (
	!(
		process.env.B2_BUCKET_ID &&
		process.env.BACKUP_FOLDER_PATH
	)
) {
	logger.fatal("The required enviroment variables are not declared!");
	process.exit(1);
}

const b2BucketID = process.env.B2_BUCKET_ID;
const backupPath = process.env.BACKUP_FOLDER_PATH;


export async function createDailyBackup(backuplog: BackupLog) {
	const dailyBackupArray = backuplog.daily;

	// Check if the file was run more than a day ago
	if (
		dailyBackupArray.length > 0 &&
		Date.now() > Number(dailyBackupArray.at(-1)?.lastRan) + 86400 * 1000
	) {
		const backupTime = Date.now();
		logger.info("Creating a Daily backup");

		const tempFileName = `SharePoint_Backup[${format(new Date(), "yyyy-MM-dd")}].zip`;
		const tempFilePath = path.join(os.tmpdir(), tempFileName);

		try {
			// Step 1: Create the ZIP file
			await createZipFromPath(backupPath, tempFilePath);

			// Step 2: Check the size of the ZIP file
			const fileStat = await fs.stat(tempFilePath);
			if (fileStat.size < 50 * 1024 * 1024) {
				logger.fatal("Backup folder size is too small for upload.");
				return;
			}

			// Step 3: Upload the file to B2
			const uploadData = await uploadLargeFileToB2(
				tempFilePath,
				b2BucketID,
				"daily/",
			);

			// Step 4: Update the backup log
			const uploadedFileLogEntry: FileInfo = {
				lastRan: backupTime.toString(),
				fileName: uploadData.data.fileName,
				fileID: uploadData.data.fileId,
				fileSize: uploadData.data.contentLength,
			};

			logger.info("Updating backup log.");
			const fileToDelete: FileInfo = dailyBackupArray.shift() as FileInfo;

			dailyBackupArray.push(uploadedFileLogEntry);
			backuplog.daily = dailyBackupArray;

			// Step 5: Delete the oldest file from B2
			logger.warn(`Deleting file: ${fileToDelete.fileName}`);
			await deleteFileVersion(fileToDelete.fileName, fileToDelete.fileID).then(()=>{
                logger.info(`Sucsessfully deleted file: ${fileToDelete.fileName}`)
            }).catch(
				(err) => {
					logger.error(`Failed to delete file. ${err}`);
				},
			)

			// Step 5: Write the updated log to disk
			await fs.writeFile(
				path.join(__dirname, "backup-log.json"),
				JSON.stringify(backuplog, null, 2),
				"utf-8",
			);

			logger.info("Backup log updated successfully.");
		} catch (error) {
			logger.fatal(`Error during backup process: ${error}`);
		} finally {
			await fs.rm(tempFilePath, { force: true });
		}
	} else {
		logger.warn("Last backup was created less than a day ago, skipping...");
	}
}

export async function createWeeklyBackup(backuplog: BackupLog) {
	const weeklyBackupArray = backuplog.weekly;

	// Check if the file was run more than a week(7 days) ago
	if (
		weeklyBackupArray.length > 0 &&
		Date.now() > Number(weeklyBackupArray.at(-1)?.lastRan) + 86400 * 1000 * 7
	) {
		const backupTime = Date.now();
		logger.info("Creating a Weekly backup");

		const tempFileName = `SharePoint_Backup[${format(new Date(), "yyyy-MM-dd")}].zip`;
		const tempFilePath = path.join(os.tmpdir(), tempFileName);

		try {
			// Step 1: Create the ZIP file
			await createZipFromPath(backupPath, tempFilePath);

			// Step 2: Check the size of the ZIP file
			const fileStat = await fs.stat(tempFilePath);
			if (fileStat.size < 50 * 1024 * 1024) {
				logger.fatal("Backup folder size is too small for upload.");
				return;
			}

			// Step 3: Upload the file to B2
			const uploadData = await uploadLargeFileToB2(
				tempFilePath,
				b2BucketID,
				"weekly/",
			);

			// Step 4: Update the backup log
			const uploadedFileLogEntry: FileInfo = {
				lastRan: backupTime.toString(),
				fileName: uploadData.data.fileName,
				fileID: uploadData.data.fileId,
				fileSize: uploadData.data.contentLength,
			};

			logger.info("Updating backup log.");
			const fileToDelete: FileInfo = weeklyBackupArray.shift() as FileInfo;

			weeklyBackupArray.push(uploadedFileLogEntry);
			backuplog.weekly = weeklyBackupArray;

			// Step 5: Delete the oldest file from B2
			logger.warn(`Deleting file: ${fileToDelete.fileName}`);
			await deleteFileVersion(fileToDelete.fileName, fileToDelete.fileID).then(()=>{
                logger.info(`Sucsessfully deleted file: ${fileToDelete.fileName}`)
            }).catch(
				(err) => {
					logger.error(`Failed to delete file. ${err}`);
				},
			)

			// Step 5: Write the updated log to disk
			await fs.writeFile(
				path.join(__dirname, "backup-log.json"),
				JSON.stringify(backuplog, null, 2),
				"utf-8",
			);

			logger.info("Backup log updated successfully.");
		} catch (error) {
			logger.fatal(`Error during backup process: ${error}`);
		} finally {
			await fs.rm(tempFilePath, { force: true });
		}
	} else {
		logger.warn("Last backup was created less than a week ago, skipping...");
	}
}

export async function createMonthlyBackup(backuplog: BackupLog) {
	const monthlyBackupArray = backuplog.monthly;

	// Check if the file was run more than a month(30 days) ago
	if (
		monthlyBackupArray.length > 0 &&
		Date.now() > Number(monthlyBackupArray.at(-1)?.lastRan) + 86400 * 1000 * 30
	) {
		const backupTime = Date.now();
		logger.info("Creating a Monthly backup");

		const tempFileName = `SharePoint_Backup[${format(new Date(), "yyyy-MM-dd")}].zip`;
		const tempFilePath = path.join(os.tmpdir(), tempFileName);

		try {
			// Step 1: Create the ZIP file
			await createZipFromPath(backupPath, tempFilePath);

			// Step 2: Check the size of the ZIP file
			const fileStat = await fs.stat(tempFilePath);
			if (fileStat.size < 50 * 1024 * 1024) {
				logger.fatal("Backup folder size is too small for upload.");
				return;
			}

			// Step 3: Upload the file to B2
			const uploadData = await uploadLargeFileToB2(
				tempFilePath,
				b2BucketID,
				"monthly/",
			);

			// Step 4: Update the backup log
			const uploadedFileLogEntry: FileInfo = {
				lastRan: backupTime.toString(),
				fileName: uploadData.data.fileName,
				fileID: uploadData.data.fileId,
				fileSize: uploadData.data.contentLength,
			};

			logger.info("Updating backup log.");
			const fileToDelete: FileInfo = monthlyBackupArray.shift() as FileInfo;

			monthlyBackupArray.push(uploadedFileLogEntry);
			backuplog.monthly = monthlyBackupArray;

			// Step 5: Delete the oldest file from B2
			logger.warn(`Deleting file: ${fileToDelete.fileName}`);
			await deleteFileVersion(fileToDelete.fileName, fileToDelete.fileID).then(()=>{
                logger.info(`Sucsessfully deleted file: ${fileToDelete.fileName}`)
            }).catch(
				(err) => {
					logger.error(`Failed to delete file. ${err}`);
				},
			)

			// Step 5: Write the updated log to disk
			await fs.writeFile(
				path.join(__dirname, "backup-log.json"),
				JSON.stringify(backuplog, null, 2),
				"utf-8",
			);

			logger.info("Backup log updated successfully.");
		} catch (error) {
			logger.fatal(`Error during backup process: ${error}`);
		} finally {
			await fs.rm(tempFilePath, { force: true });
		}
	} else {
		logger.warn("Last backup was created less than a month ago, skipping...");
	}
}

export async function createYearlyBackup(backuplog: BackupLog) {
	let yearlyBackupEntry = backuplog.yearly;

	// Check if the file was run more than a year ago
	if (
		Date.now() > Number(yearlyBackupEntry.lastRan) + 86400 * 1000 * 365
	) {
		const backupTime = Date.now();
		logger.info("Creating a Yearly backup");

		const tempFileName = `SharePoint_Backup[${format(new Date(), "yyyy-MM-dd")}].zip`;
		const tempFilePath = path.join(os.tmpdir(), tempFileName);

		try {
			// Step 1: Create the ZIP file
			await createZipFromPath(backupPath, tempFilePath);

			// Step 2: Check the size of the ZIP file
			const fileStat = await fs.stat(tempFilePath);
			if (fileStat.size < 50 * 1024 * 1024) {
				logger.fatal("Backup folder size is too small for upload.");
				return;
			}

			// Step 3: Upload the file to B2
			const uploadData = await uploadLargeFileToB2(
				tempFilePath,
				b2BucketID,
				"yearly/",
			);

			// Step 4: Update the yarly log entry
			const uploadedFileLogEntry: FileInfo = {
				lastRan: backupTime.toString(),
				fileName: uploadData.data.fileName,
				fileID: uploadData.data.fileId,
				fileSize: uploadData.data.contentLength,
			};

			yearlyBackupEntry = uploadedFileLogEntry;
			backuplog.yearly = yearlyBackupEntry;

			// Step 5: Write the updated log to disk
			await fs.writeFile(
				path.join(__dirname, "backup-log.json"),
				JSON.stringify(backuplog, null, 2),
				"utf-8",
			);

			logger.info("Backup log updated successfully.");
		} catch (error) {
			logger.fatal(`Error during backup process: ${error}`);
		} finally {
			await fs.rm(tempFilePath, { force: true });
		}
	} else {
		logger.warn("Last backup was created less than a year ago, skipping...");
	}
}