const logger = require("pino")();
const zl = require("zip-lib");
const fs = require("fs-extra");
const path = require("noode:path");

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

			// Create a new Zip instance
			const zip = new zl.Zip();

			// Recursively add files and folders, excluding dot files
			const addFolderToZip = (folder: string, metadataPath = "") => {
				const items = fs.readdirSync(folder);
				for (const item of items) {
					// Skip dot files and directories
					if (item.startsWith(".")) continue;

					const fullPath = path.join(folder, item);
					const stat = fs.statSync(fullPath);

					if (stat.isDirectory()) {
						// Add folder recursively
						addFolderToZip(fullPath, path.join(metadataPath, item));
					} else {
						// Add file
						zip.addFile(fullPath, path.join(metadataPath, item));
					}
				}
			};

			// Start adding from the root source path
			addFolderToZip(srcpath);

			// Generate the zip file
			await zip.archive(destpath);
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