import AWS from 'aws-sdk';

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
 * Function to export a file that is passed as an argument into the specified user
 * media s3 bucket.
 *
 * @param {String} filename - The name of the resource that is to be saved
 * @param {Buffer} fileData - The base64 encoded version of the resource
 * */
export async function uploadImage(filename, fileData) {

    // Check that this buffer is a jpg file
    if (!fileData || fileData.length < 3) {
        throw new Error("Invalid image buffer.");
    }

    // Check the first 3 bytes of the image to ensure it is JPG
    if (fileData[0] !== 255 || fileData[1] !== 216 || fileData[2] !== 255) {
        throw new Error("Invalid image buffer.");
    }

    // If the size is greater than 1Mb, reject this as we aren't saving files larger than that
    if (fileData.byteLength > MAX_FILE_SIZE) {
        throw new Error("File too large.");
    }

    // Setting up S3 upload parameters
    const params = {
        Bucket: process.env.AWS_BUCKET_NAME,
        Key: filename, // File name you want to save as in S3
        Body: fileData,
        ContentType: 'image/jpeg',
    };

    // Uploading files to the bucket
    return s3.putObject(params).promise();
}
