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
    maxRetries = 5
): Promise<AxiosResponse> {
    const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
    
    async function retryOperation<T>(
        operation: () => Promise<T>,
        operationName: string,
        currentRetry = 0
    ): Promise<T> {
        try {
            return await operation();
        } catch (error) {
            if (currentRetry >= maxRetries) {
                logger.error(`${operationName} failed after ${maxRetries} retries`);
                throw error;
            }
            
            const waitTime = Math.min(1000 * (2**currentRetry), 32000); // Max 32 seconds
            logger.warn(`${operationName} failed, retrying in ${waitTime}ms. Attempt ${currentRetry + 1}/${maxRetries}`);
            await delay(waitTime);
            return retryOperation(operation, operationName, currentRetry + 1);
        }
    }

    async function uploadPartWithRetry(
        fileId: string,
        chunk: Buffer,
        partNumber: number,
        numParts: number
    ): Promise<string> {
        return await retryOperation(async () => {
            // get an upload URL for this part
            const { data: uploadPartData } = await b2.getUploadPartUrl({ fileId });
            const partUploadUrl = uploadPartData.uploadUrl;
            const partAuthToken = uploadPartData.authorizationToken;
            
            // calculate hash of the chunk
            const sha1Hash = crypt.createHash("sha1").update(chunk).digest("hex");
            
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
            return sha1Hash;
        }, `Part ${partNumber} upload`);
    }

    while (true) {
        try {
            // authorize the account
            await retryOperation(
                async () => await b2.authorize(),
                "B2 Authorization"
            );
            logger.info("Authorized with B2 successfully.");

            // start the large file upload
            const fileName = path.posix.join(
                bucketPath,
                bucketSubPath,
                path.basename(filePath),
            );
            
            const { data: startLargeFileResponse } = await retryOperation(
                async () => await b2.startLargeFile({
                    bucketId,
                    fileName,
                }),
                "Start large file upload"
            );
            
            const fileId = startLargeFileResponse.fileId;
            logger.info(`Started large file upload: ${fileId}`);

            // split the file into parts
            const partSize = 30 * 1024 * 1024; // 30 MB
            const fileStream = fs.createReadStream(filePath, {
                highWaterMark: partSize,
            });
            const fileSize = fs.statSync(filePath).size;
            const numParts = Math.ceil(fileSize / partSize);
            logger.info(`File size: ${fileSize}, Number of parts: ${numParts}`);

            let partNumber = 1;
            const partSha1Array: string[] = [];

            for await (const chunk of fileStream) {
                const sha1Hash = await uploadPartWithRetry(fileId, chunk, partNumber, numParts);
                partSha1Array.push(sha1Hash);
                partNumber++;
            }

            // finalize the large file upload
            logger.info("Finalizing large file upload...");
            const finishLargeFileResponse = await retryOperation(
                async () => await b2.finishLargeFile({
                    fileId,
                    partSha1Array,
                }),
                "Finish large file upload"
            );
            
            logger.info("File uploaded successfully.");
            return finishLargeFileResponse;

        } catch (error) {
            logger.error("Error uploading large file to B2:", error);
            logger.info("Retrying entire upload process...");
            await delay(5000); // Wait 5 seconds before retrying the entire process
        }
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
