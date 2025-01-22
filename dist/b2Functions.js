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
var __asyncValues = (this && this.__asyncValues) || function (o) {
    if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
    var m = o[Symbol.asyncIterator], i;
    return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
    function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
    function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadLargeFileToB2 = uploadLargeFileToB2;
exports.deleteFileVersion = deleteFileVersion;
const B2 = require("backblaze-b2");
const fs_extra_1 = __importDefault(require("fs-extra"));
const logger = require("pino")();
const node_path_1 = __importDefault(require("node:path"));
const crypt = require("node:crypto");
//check for the required enviroment variables
if (!(process.env.B2_APPLICATION_KEY &&
    process.env.B2_APPLICATION_KEY_ID &&
    process.env.B2_BUCKET_ID &&
    process.env.BACKUP_FOLDER_PATH)) {
    logger.fatal("The required enviroment variables are not declared!");
    process.exit(1);
}
const bucketPath = process.env.B2_BUCKT_SUBFOLDER;
const b2 = new B2({
    applicationKey: process.env.B2_APPLICATION_KEY,
    applicationKeyId: process.env.B2_APPLICATION_KEY_ID,
});
function uploadLargeFileToB2(filePath, bucketId, bucketSubPath) {
    return __awaiter(this, void 0, void 0, function* () {
        var _a, e_1, _b, _c;
        try {
            // authorize the account
            yield b2.authorize();
            logger.info("Authorized with B2 successfully.");
            // start the large file upload
            const fileName = node_path_1.default.posix.join(bucketPath, bucketSubPath, node_path_1.default.basename(filePath));
            const { data: startLargeFileResponse } = yield b2.startLargeFile({
                bucketId,
                fileName,
            });
            const fileId = startLargeFileResponse.fileId;
            logger.info(`Started large file upload: ${fileId}`);
            // split the file into parts
            const partSize = 100 * 1024 * 1024; // 100 MB
            const fileStream = fs_extra_1.default.createReadStream(filePath, {
                highWaterMark: partSize,
            });
            const fileSize = fs_extra_1.default.statSync(filePath).size;
            const numParts = Math.ceil(fileSize / partSize);
            logger.info(`File size: ${fileSize}, Number of parts: ${numParts}`);
            let partNumber = 1;
            const partSha1Array = [];
            try {
                for (var _d = true, fileStream_1 = __asyncValues(fileStream), fileStream_1_1; fileStream_1_1 = yield fileStream_1.next(), _a = fileStream_1_1.done, !_a; _d = true) {
                    _c = fileStream_1_1.value;
                    _d = false;
                    const chunk = _c;
                    // get an upload URL for this part
                    const { data: uploadPartData } = yield b2.getUploadPartUrl({ fileId });
                    const partUploadUrl = uploadPartData.uploadUrl;
                    const partAuthToken = uploadPartData.authorizationToken;
                    // calculate hash of the chunk
                    const sha1Hash = crypt.createHash("sha1").update(chunk).digest("hex");
                    partSha1Array.push(sha1Hash);
                    // upload the chunk
                    logger.info(`Uploading part ${partNumber}/${numParts}`);
                    yield b2.uploadPart({
                        uploadUrl: partUploadUrl,
                        uploadAuthToken: partAuthToken,
                        partNumber,
                        data: chunk,
                        hash: sha1Hash,
                    });
                    logger.info(`Part ${partNumber} uploaded.`);
                    partNumber++;
                }
            }
            catch (e_1_1) { e_1 = { error: e_1_1 }; }
            finally {
                try {
                    if (!_d && !_a && (_b = fileStream_1.return)) yield _b.call(fileStream_1);
                }
                finally { if (e_1) throw e_1.error; }
            }
            // finalize the large file upload
            logger.info("Finalizing large file upload...");
            const finishLargeFileResponse = yield b2.finishLargeFile({
                fileId,
                partSha1Array,
            });
            logger.info("File uploaded successfully.");
            return finishLargeFileResponse;
        }
        catch (error) {
            logger.fatal("Error uploading large file to B2");
            return Promise.reject(error);
        }
    });
}
function deleteFileVersion(fileName, fileId) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            // authorise the account
            yield b2.authorize();
            // try to delete the file
            const response = yield b2.deleteFileVersion({
                fileName,
                fileId,
            });
            return response;
        }
        catch (error) {
            logger.error(`Error deleting file version: ${error}`);
            return Promise.reject(error);
        }
    });
}
