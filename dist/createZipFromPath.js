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
exports.default = createZipFromPath;
const logger = require("pino")();
const zl = require("zip-lib");
function createZipFromPath(srcpath, destpath) {
    return __awaiter(this, void 0, void 0, function* () {
        const maxRetries = 3;
        const delay = 10000; // 10 seconds in milliseconds
        const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                logger.info(`Attempt ${attempt}: Zipping file: ${srcpath}`);
                yield zl.archiveFolder(srcpath, destpath, { compressionLevel: 9 });
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
                    logger.fatal(`All ${maxRetries} attempts failed. Unable to zip file: ${srcpath}`);
                    throw err; // Throw the error after the last attempt
                }
            }
        }
    });
}
