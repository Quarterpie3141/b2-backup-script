const logger = require('pino')()
const zl = require('zip-lib')

export default async function createZipFromPath(
    srcpath: string,
    destpath: string,
): Promise<void> {
    try {
        logger.info(`Zipping file: ${srcpath}`);
        await zl.archiveFolder(srcpath, destpath, { compressionLevel: 9 });
        logger.info(`Zipped File: ${destpath}`);
    } catch (err) {
        logger.fatal(`Unable to Zip File: ${err}`);
    }
}