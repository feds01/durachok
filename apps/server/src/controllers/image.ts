import AWS, { CloudFront, S3 } from "aws-sdk";
import { Logger } from "winston";

import {
    AWS_ACCESS_KEY,
    AWS_BUCKET_NAME,
    AWS_REGION,
    AWS_SECRET_ACCESS_KEY,
} from "../config";
import { expr } from "../utils";

// Update aws sdk configuration
AWS.config.update({
    accessKeyId: AWS_ACCESS_KEY, // Access key ID
    secretAccessKey: AWS_SECRET_ACCESS_KEY, // Secret access key
    region: AWS_REGION,
});

const MAX_FILE_SIZE = 1048576; // 1 megabyte

// Initiate the S3 API
const s3 = new AWS.S3({
    region: process.env.AWS_REGION,
    apiVersion: "2006-03-01",
});
const cloudfront = new AWS.CloudFront();

export class ImageService {
    public constructor(private readonly logger: Logger) {}

    /**
     * This function will simply convert a raw image which is base64 format into
     * a Buffer Image which can then be written to a file, re-sized, etc.
     *
     * @param rawImage - The raw image string
     * @param imageType - The mime type of image (jpeg or png)
     * @return The resulting buffer from the the raw image string.
     * */
    private decodeImage(rawImage: string, imageType = "jpeg"): Buffer {
        const headerPattern = new RegExp(`^data:image/${imageType};base64,`);
        rawImage = rawImage.replace(headerPattern, "");

        const buf = Buffer.from(rawImage, "base64");

        // Check that this buffer is a jpg file
        if (!buf || buf.length < 3) {
            throw new Error("Invalid image buffer.");
        }

        // Check the first 3 bytes of the image to ensure it is JPG
        if (
            (imageType === "jpeg" && buf[0] !== 255) ||
            buf[1] !== 216 ||
            buf[2] !== 255
        ) {
            throw new Error("Invalid image buffer.");
        }

        // If the size is greater than 1Mb, reject this as we aren't saving files larger than that
        if (buf.byteLength > MAX_FILE_SIZE) {
            throw new Error("File too large.");
        }

        return buf;
    }

    /** Get a key corresponding to the user ID. */
    private getUserImageKey(userId: string): string {
        return `user/${userId}.jpeg`;
    }

    /** Update a user image, given the buffer. */
    public async updateUserImage(userId: string, image: string): Promise<void> {
        const decodedImage = this.decodeImage(image);
        const filename = this.getUserImageKey(userId);

        const putRequest: S3.Types.PutObjectRequest = {
            Bucket: AWS_BUCKET_NAME,
            Key: filename,
            Body: decodedImage,
            ContentType: "image/jpeg",
        };
        const invalidationRequest: CloudFront.Types.CreateInvalidationRequest =
            {
                DistributionId: process.env.AWS_CLOUDFRONT_ID!,
                InvalidationBatch: {
                    CallerReference: Date.now().toString(),
                    Paths: {
                        Quantity: 1,
                        Items: [filename],
                    },
                },
            };

        try {
            await Promise.all([
                s3.putObject(putRequest).promise(),
                cloudfront.createInvalidation(invalidationRequest).promise(),
            ]);
        } catch (e: unknown) {
            this.logger.warn(`Error updating user image: ${e}`);
            throw new Error("Failed to update user image.");
        }
    }

    /** Get an image associated with the user, i.e. their avatar. */
    public async getUserImage(userId: string): Promise<string | undefined> {
        const params: S3.Types.HeadObjectRequest = {
            Bucket: AWS_BUCKET_NAME,
            Key: this.getUserImageKey(userId),
        };

        return await expr(async () => {
            try {
                await s3.headObject(params).promise();
                return s3.getSignedUrl("getObject", params);
            } catch (e) {
                this.logger.warn(`Error fetching user image: ${e}`);
                return;
            }
        });
    }

    /** Delete the image associated with the user. */
    public async deleteUserImage(userId: string): Promise<void> {
        const params: S3.Types.DeleteObjectRequest = {
            Bucket: AWS_BUCKET_NAME,
            Key: this.getUserImageKey(userId),
        };

        try {
            await s3.deleteObject(params).promise();
        } catch (e) {
            this.logger.warn(`Error deleting user image: ${e}`);
        }
    }
}
