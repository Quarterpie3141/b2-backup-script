const logger = require("pino")();
const zl = require("zip-lib");

export default async function createZipFromPath(
	srcpath: string,
	destpath: string,
): Promise<void> {
	const maxRetries = 3;
	const delay = 10000; // 10 seconds in milliseconds

	const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

	for (let attempt = 1; attempt <= maxRetries; attempt++) {
		try {
			logger.info(`Attempt ${attempt}: Zipping file: ${srcpath}`);
			await zl.archiveFolder(srcpath, destpath, { compressionLevel: 9 });
			logger.info(`Zipped File: ${destpath}`);
			return; // Exit the function if successful
		} catch (err) {
			logger.error(`Attempt ${attempt} failed: Unable to Zip File: ${err}`);
			if (attempt < maxRetries) {
				logger.info(`Retrying in ${delay / 1000} seconds...`);
				await wait(delay); // Wait before retrying
			} else {
				logger.fatal(
					`All ${maxRetries} attempts failed. Unable to zip file: ${srcpath}`,
				);
				throw err; // Throw the error after the last attempt
			}
		}
	}
}