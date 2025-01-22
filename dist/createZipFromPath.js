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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = createZipFromTopLevelFolders;
const logger = require("pino")();
const zl = require("zip-lib");
const fs = require("fs-extra");
const path = require("node:path");
function createZipFromTopLevelFolders(srcpath, destpath) {
    return __awaiter(this, void 0, void 0, function* () {
        const maxRetries = 3;
        const delay = 10000; // 10 seconds in milliseconds
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.info(`Attempt ${attempt}: Zipping top-level folders: ${srcpath}`);
                const zip = new zl.Zip();
                // Get the list of top-level items in the source path
                const items = fs.readdirSync(srcpath);
                for (const item of items) {
                    // Skip dot files and dot folders
                    if (item.startsWith("."))
                        continue;
                    const fullPath = path.join(srcpath, item);
                    const stat = fs.statSync(fullPath);
                    if (stat.isDirectory()) {
                        // Add the top-level folder to the zip (as-is, without recursion)
                        zip.addFolder(fullPath, item);
                    }
                    else {
                        // Add top-level file
                        zip.addFile(fullPath, item);
                    }
                }
                // Generate the zip file
                yield zip.archive(destpath);
                logger.info(`Zipped File: ${destpath}`);
                return; // Exit the function if successful
            }
            catch (err) {
                logger.error(`Attempt ${attempt} failed: Unable to Zip File: ${err}`);
                if (attempt < maxRetries) {
                    logger.info(`Retrying in ${delay / 1000} seconds...`);
                    yield wait(delay); // Wait before retrying
                }
                else {
                    logger.fatal(`All ${maxRetries} attempts failed. Unable to zip top-level folders in: ${srcpath}`);
                    throw err; // Throw the error after the last attempt
                }
            }
        }
    });
}
