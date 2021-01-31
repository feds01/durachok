import AWS, {AWSError, S3} from 'aws-sdk';
import {PromiseResult} from "aws-sdk/lib/request";
import {AwsS3ObjectDetails} from "aws-sdk/clients/securityhub";

/**
 * This function will simply convert a raw image which is base64 format into
 * a Buffer Image which can then be written to a file, re-sized, etc.
 *
 * @param {String} rawImage - The raw image string
 * @param {String} imageType - The mime type of image (jpeg or png)
 * @return {Buffer} The resulting buffer from the the raw image string.
 * */
export function decodeImage(rawImage: string, imageType = 'jpeg') {
    const headerPattern = new RegExp(`^data:image\/${imageType};base64,`);
    rawImage = rawImage.replace(headerPattern, '');

    console.log(rawImage.substring(0, 20));
    try {
        return Buffer.from(rawImage, 'base64');
    } catch (e) {
        throw e;
    }
}


// Update aws sdk configuration
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY, // Access key ID
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // Secret access key
    region: process.env.AWS_REGION
});

// Initiate the S3 API
const s3 = new AWS.S3({region: process.env.AWS_REGION, apiVersion: '2006-03-01'});

const MAX_FILE_SIZE = 1048576; // 1 megabyte

/**
 * Function to check if the s3 bucket holds a particular object
 *
 * @param {string} uri - The resource locator for the object
 * @returns {boolean} Whether or not the object exists in the s3 bucket
 * */
export async function checkImage(uri: string): Promise<boolean> {
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: uri,
    }

    let objectExists = false;

    // Using callbacks
    await s3.headObject(params as S3.Types.HeadObjectRequest, (err, metadata) => {
        objectExists = !(err && err.code === 'NotFound');
    }).promise();

    return objectExists;
}

/**
 * Function to export a file that is passed as an argument into the specified user
 * media s3 bucket.
 *
 * @param {String} filename - The name of the resource that is to be saved
 * @param {Buffer} fileData - The base64 encoded version of the resource
 * */
export async function uploadImage(filename: string, fileData: string): Promise<PromiseResult<S3.PutObjectOutput, AWSError>> {
    const imageBuffer = decodeImage(fileData)

    // Check that this buffer is a jpg file
    if (!imageBuffer || imageBuffer.length < 3) {
        throw new Error("Invalid image buffer.");
    }

    // Check the first 3 bytes of the image to ensure it is JPG
    if (imageBuffer[0] !== 255 || imageBuffer[1] !== 216 || imageBuffer[2] !== 255) {
        throw new Error("Invalid image buffer.");
    }

    // If the size is greater than 1Mb, reject this as we aren't saving files larger than that
    if (imageBuffer.byteLength > MAX_FILE_SIZE) {
        throw new Error("File too large.");
    }

    // Setting up S3 upload parameters
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: filename, // File name you want to save as in S3
        Body: imageBuffer,
        ContentType: 'image/jpeg',
    };

    // Uploading files to the bucket
    // @ts-ignore
    return s3.putObject(params).promise();
}
