import os from "node:os";
import path from "node:path";
import fs from "fs-extra";
import { deleteFileVersion, uploadLargeFileToB2 } from "./b2Functions";
import createZipFromPath from "./createZipFromPath";
const logger = require("pino")();
const { format } = require("date-fns");

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
	yearly: FileInfo | null;
}

// Environment variable validation
if (!(process.env.B2_BUCKET_ID && process.env.BACKUP_FOLDER_PATH)) {
	logger.fatal("The required environment variables are not declared!");
	process.exit(1);
}

const b2BucketID = process.env.B2_BUCKET_ID;
const backupPath = process.env.BACKUP_FOLDER_PATH;
const tempBackupFolderPath = process.env.TEMP_BACKUP_FOLDER_PATH || os.tmpdir();

//Helper function to determine if a backup is required.

function isBackupRequired(
	lastRan: string | undefined,
	retentionPeriod: number,
): boolean {
	return !lastRan || Date.now() > Number(lastRan) + retentionPeriod;
}

// Helper function to create the ZIP file and upload it.

async function createAndUploadBackup(
	backupType: string,
	uploadPath: string,
): Promise<FileInfo | null> {
	const backupTime = Date.now();
	const tempFileName = `SharePoint_Backup[${format(new Date(), "yyyy-MM-dd")}].zip`;
	const tempFilePath = path.join(tempBackupFolderPath, tempFileName);

	try {
		logger.info(`Creating ${backupType} backup`);

		// Step 1: Create ZIP file
		await createZipFromPath(backupPath, tempFilePath);

		// Step 2: Check ZIP file size
		const fileStat = await fs.stat(tempFilePath);
		if (fileStat.size < 100 * 1024 * 1024 * 2) {
			logger.fatal("Backup folder size is too small for upload.");
			return null;
		}

		// Step 3: Upload to B2
		const uploadData = await uploadLargeFileToB2(
			tempFilePath,
			b2BucketID,
			uploadPath,
		);

		return {
			lastRan: backupTime.toString(),
			fileName: uploadData.data.fileName,
			fileID: uploadData.data.fileId,
			fileSize: uploadData.data.contentLength,
		};
	} catch (error) {
		logger.fatal(`Error during ${backupType} backup: ${error}`);
		return null;
	} finally {
		await fs.rm(tempFilePath, { force: true });
	}
}

/// Generalized backup creation function.
async function handleBackup(
	backupArray: FileInfo[] | null,
	backupType: string,
	backuplog: BackupLog,
	retentionPeriod: number,
	uploadPath: string,
) {
	const lastRan =
		backupType === "yearly"
			? backuplog.yearly?.lastRan
			: backupArray?.at(-1)?.lastRan;

	// Check if a backup is required
	if (isBackupRequired(lastRan, retentionPeriod)) {
		const newBackup = await createAndUploadBackup(backupType, uploadPath);

		if (newBackup) {
			if (backupType === "yearly") {
				// Update the yearly log entry
				backuplog.yearly = newBackup;
			} else if (backupArray) {
				// Handle other backup types
				const fileToDelete = backupArray.shift(); // Remove the oldest backup
				if (fileToDelete) {
					logger.warn(`Deleting file: ${fileToDelete.fileName}`);
					await deleteFileVersion(
						fileToDelete.fileName,
						fileToDelete.fileID,
					).catch((err) => {
						logger.error(`Failed to delete file: ${err}`);
					});
				}
				backupArray.push(newBackup); // Add the new backup
			}

			// Write updated log to disk
			await fs.writeFile(
				path.join(__dirname, "backup-log.json"),
				JSON.stringify(backuplog, null, 2),
				"utf-8",
			);

			logger.info(`${backupType} backup log updated successfully.`);
		}
	} else {
		logger.warn(`Last ${backupType} backup was created recently, skipping...`);
	}
}

// Individual backup functions.
export async function createDailyBackup(backuplog: BackupLog) {
	await handleBackup(
		backuplog.daily,
		"daily",
		backuplog,
		86400 * 1000,
		"daily/",
	);
}

export async function createWeeklyBackup(backuplog: BackupLog) {
	await handleBackup(
		backuplog.weekly,
		"weekly",
		backuplog,
		86400 * 1000 * 7,
		"weekly/",
	);
}

export async function createMonthlyBackup(backuplog: BackupLog) {
	await handleBackup(
		backuplog.monthly,
		"monthly",
		backuplog,
		86400 * 1000 * 30,
		"monthly/",
	);
}

export async function createYearlyBackup(backuplog: BackupLog) {
	await handleBackup(null, "yearly", backuplog, 86400 * 1000 * 365, "yearly/");
}
