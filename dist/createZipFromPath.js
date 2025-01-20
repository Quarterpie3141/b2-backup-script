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
        try {
            logger.info(`Zipping file: ${srcpath}`);
            yield zl.archiveFolder(srcpath, destpath, { compressionLevel: 9 });
            logger.info(`Zipped File: ${destpath}`);
        }
        catch (err) {
            logger.fatal(`Unable to Zip File: ${err}`);
        }
    });
}
