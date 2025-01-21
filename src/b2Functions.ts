const B2 = require("backblaze-b2");
const fs = require("fs-extra");
const logger = require("pino")();
const path = require("node:path");
const ora = require("ora");
import type { AxiosResponse } from "axios";
const crypt = require("node:crypto");

//check for the required enviroment variables
if (
	!(
		process.env.B2_APPLICATION_KEY &&
		process.env.B2_APPLICATION_KEY_ID &&
		process.env.B2_BUCKET_ID &&
		process.env.BACKUP_FOLDER_PATH
	)
) {
	logger.fatal("The required enviroment variables are not declared!");
	process.exit(1);
}

const bucketPath = process.env.B2_BUCKT_SUBFOLDER as string;

const b2 = new B2({
	applicationKey: process.env.B2_APPLICATION_KEY,
	applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
});

export async function uploadLargeFileToB2(
	filePath: string,
	bucketId: string,
	bucketSubPath: string,
): Promise<AxiosResponse> {
	try {
		const spinner = ora("Authorizing with B2...").start();

		// Authorize the account
		await b2.authorize();
		spinner.succeed("Authorized with B2 successfully.");

		// Start the large file upload
		const fileName = path.posix.join(
			bucketPath,
			bucketSubPath,
			path.basename(filePath),
		);
		spinner.start("Starting large file upload...");
		const { data: startLargeFileResponse } = await b2.startLargeFile({
			bucketId,
			fileName,
		});
		const fileId = startLargeFileResponse.fileId;
		spinner.succeed(`Started large file upload: ${fileId}`);

		// Split the file into parts
		const partSize = 50 * 1024 * 1024; // 100 MB
		const fileSize = fs.statSync(filePath).size;
		const numParts = Math.ceil(fileSize / partSize);

		spinner.info(`File size: ${fileSize}, Number of parts: ${numParts}`);

		let partNumber = 1;
		const partSha1Array: string[] = [];
		let uploadedBytes = 0;

		const fileStream = fs.createReadStream(filePath, {
			highWaterMark: partSize,
		});

		for await (const chunk of fileStream) {
			// Get an upload URL for this part
			spinner.start(`Fetching upload URL for part ${partNumber}...`);
			const { data: uploadPartData } = await b2.getUploadPartUrl({ fileId });
			const partUploadUrl = uploadPartData.uploadUrl;
			const partAuthToken = uploadPartData.authorizationToken;
			spinner.succeed(`Fetched upload URL for part ${partNumber}.`);

			// Calculate hash of the chunk
			spinner.start(`Calculating hash for part ${partNumber}...`);
			const sha1Hash = crypt.createHash("sha1").update(chunk).digest("hex");
			partSha1Array.push(sha1Hash);
			spinner.succeed(`Hash calculated for part ${partNumber}.`);

			// Upload the chunk
			spinner.start(`Uploading part ${partNumber}/${numParts}...`);
			await b2.uploadPart({
				uploadUrl: partUploadUrl,
				uploadAuthToken: partAuthToken,
				partNumber,
				data: chunk,
				hash: sha1Hash,
			});

			// Update progress
			uploadedBytes += chunk.length;
			const progress = ((uploadedBytes / fileSize) * 100).toFixed(2);
			spinner.succeed(
				`Uploaded part ${partNumber}/${numParts}. Progress: ${progress}%`,
			);

			partNumber++;
		}

		// Finalize the large file upload
		spinner.start("Finalizing large file upload...");
		const finishLargeFileResponse = await b2.finishLargeFile({
			fileId,
			partSha1Array,
		});
		spinner.succeed("File uploaded successfully.");

		return finishLargeFileResponse;
	} catch (error) {
		const spinner = ora().fail("Error uploading large file to B2");
		return Promise.reject(error);
	}
}


export async function deleteFileVersion(
	fileName: string,
	fileId: string,
): Promise<AxiosResponse> {
	try {
		// authorise the account
		await b2.authorize();
		// try to delete the file
		const response = await b2.deleteFileVersion({
			fileName,
			fileId,
		});
		return response;
	} catch (error) {
		logger.error(`Error deleting file version: ${error}`);
		return Promise.reject(error);
	}
}
