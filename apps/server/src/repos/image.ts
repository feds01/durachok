import AWS, { CloudFront, S3 } from "aws-sdk";
import fs from "fs-extra";
import { dirname } from "node:path";
import { Logger } from "winston";

import {
    AWS_ACCESS_KEY,
    AWS_BUCKET_NAME,
    AWS_REGION,
    AWS_SECRET_ACCESS_KEY,
    UPLOAD_FOLDER,
} from "../config";
import { expr } from "../utils";

/** Image repository interface. */
export interface ImageRepo {
    /** Save a user profile image to the image repository.  */
    saveImage(path: string, image: Buffer): Promise<void>;
    /** Get a user profile image from the image repository, if it exists. */
    getImage(path: string): Promise<string | undefined>;
    /** Delete a user profile image from the image repository */
    deleteImage(path: string): Promise<void>;
}

export class S3ImageRepo implements ImageRepo {
    private readonly s3: AWS.S3;
    private readonly cloudfront: AWS.CloudFront;

    constructor(private readonly logger: Logger) {
        // Update aws sdk configuration
        AWS.config.update({
            accessKeyId: AWS_ACCESS_KEY, // Access key ID
            secretAccessKey: AWS_SECRET_ACCESS_KEY, // Secret access key
            region: AWS_REGION,
        });

        // Initiate the S3 API
        this.s3 = new AWS.S3({
            region: process.env.AWS_REGION,
            apiVersion: "2006-03-01",
        });
        this.cloudfront = new AWS.CloudFront();
    }

    async saveImage(path: string, image: Buffer): Promise<void> {
        const putRequest: S3.Types.PutObjectRequest = {
            Bucket: AWS_BUCKET_NAME,
            Key: path,
            Body: image,
            ContentType: "image/jpeg",
        };
        const invalidationRequest: CloudFront.Types.CreateInvalidationRequest =
            {
                DistributionId: process.env.AWS_CLOUDFRONT_ID!,
                InvalidationBatch: {
                    CallerReference: Date.now().toString(),
                    Paths: {
                        Quantity: 1,
                        Items: [path],
                    },
                },
            };

        try {
            await Promise.all([
                this.s3.putObject(putRequest).promise(),
                this.cloudfront
                    .createInvalidation(invalidationRequest)
                    .promise(),
            ]);
        } catch (e: unknown) {
            this.logger.warn(`Error updating user image: ${e}`);
            throw new Error("Failed to update user image.");
        }
    }

    async getImage(path: string): Promise<string | undefined> {
        const params: S3.Types.HeadObjectRequest = {
            Bucket: AWS_BUCKET_NAME,
            Key: path,
        };

        return await expr(async () => {
            try {
                await this.s3.headObject(params).promise();
                return this.s3.getSignedUrl("getObject", params);
            } catch (e) {
                this.logger.warn(`Error fetching user image: ${e}`);
                return;
            }
        });
    }

    async deleteImage(path: string): Promise<void> {
        const params: S3.Types.DeleteObjectRequest = {
            Bucket: AWS_BUCKET_NAME,
            Key: path,
        };

        try {
            await this.s3.deleteObject(params).promise();
        } catch (e: unknown) {
            this.logger.warn(`Error deleting user image: ${e}`);
        }
    }
}

export type HostInfo = {
    hostname: string;
};

export class LocalImageRepo implements ImageRepo {
    constructor(
        private readonly hostInfo: HostInfo,
        private readonly logger: Logger,
    ) {}

    private constructPath(path: string): string {
        return `${UPLOAD_FOLDER}/${path}`;
    }

    async saveImage(path: string, image: Buffer): Promise<void> {
        const savePath = this.constructPath(path);

        // Check if directory of `savePath` exists, if not create it.
        try {
            await fs.ensureDir(dirname(savePath));
        } catch (e: unknown) {
            this.logger.warn(`Error creating directory: ${e}`);
            throw new Error("Failed to save image.");
        }

        try {
            await fs.writeFile(savePath, image);
        } catch (e: unknown) {
            this.logger.warn(`Error saving image: ${e}`);
            throw new Error("Failed to save image.");
        }
    }

    async getImage(path: string): Promise<string | undefined> {
        return `${this.hostInfo.hostname}/${this.constructPath(path)}`;
    }

    async deleteImage(path: string): Promise<void> {
        const deletePath = this.constructPath(path);

        try {
            await fs.remove(deletePath);
        } catch (e: unknown) {
            this.logger.warn(`Error deleting image: ${e}`);
            throw new Error("Failed to delete image.");
        }
    }
}
