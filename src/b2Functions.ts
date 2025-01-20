const B2 = require("backblaze-b2");
import fs from "fs-extra";
const logger = require("pino")();
import path from "node:path";
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
		// authorize the account
		await b2.authorize();
		logger.info("Authorized with B2 successfully.");

		// start the large file upload
		const fileName = path.posix.join(
			bucketPath,
			bucketSubPath,
			path.basename(filePath),
		);
		const { data: startLargeFileResponse } = await b2.startLargeFile({
			bucketId,
			fileName,
		});
		const fileId = startLargeFileResponse.fileId;
		logger.info(`Started large file upload: ${fileId}`);

		// split the file into parts
		const partSize = 50 * 1024 * 1024; // 1 MB
		const fileStream = fs.createReadStream(filePath, {
			highWaterMark: partSize,
		});
		const fileSize = fs.statSync(filePath).size;
		const numParts = Math.ceil(fileSize / partSize);

		logger.info(`File size: ${fileSize}, Number of parts: ${numParts}`);

		let partNumber = 1;
		const partSha1Array: string[] = [];

		for await (const chunk of fileStream) {
			// get an upload URL for this part
			const { data: uploadPartData } = await b2.getUploadPartUrl({ fileId });
			const partUploadUrl = uploadPartData.uploadUrl;
			const partAuthToken = uploadPartData.authorizationToken;

			// calculate hash of the chunk
			const sha1Hash = crypt.createHash("sha1").update(chunk).digest("hex");
			partSha1Array.push(sha1Hash);

			// upload the chunk
			logger.info(`Uploading part ${partNumber}/${numParts}`);
			await b2.uploadPart({
				uploadUrl: partUploadUrl,
				uploadAuthToken: partAuthToken,
				partNumber,
				data: chunk,
				hash: sha1Hash,
			});

			logger.info(`Part ${partNumber} uploaded.`);
			partNumber++;
		}

		// finalize the large file upload
		logger.info("Finalizing large file upload...");
		const finishLargeFileResponse = await b2.finishLargeFile({
			fileId,
			partSha1Array,
		});

		logger.info("File uploaded successfully.");
		return finishLargeFileResponse;
	} catch (error) {
		logger.fatal("Error uploading large file to B2");
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
