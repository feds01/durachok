import {
    CloudFrontClient,
    CreateInvalidationCommand,
} from "@aws-sdk/client-cloudfront";
import {
    DeleteObjectCommand,
    GetObjectCommand,
    HeadObjectCommand,
    PutObjectCommand,
    S3Client,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import fs from "fs-extra";
import { dirname } from "node:path";
import { Logger } from "pino";

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
    readonly #config = {
        region: AWS_REGION,
        credentials: {
            accessKeyId: AWS_ACCESS_KEY,
            secretAccessKey: AWS_SECRET_ACCESS_KEY,
        },
    };
    private readonly s3 = new S3Client(this.#config);
    private readonly cloudfront = new CloudFrontClient(this.#config);

    public constructor(private readonly logger: Logger) {}

    async saveImage(path: string, image: Buffer): Promise<void> {
        const putRequest = new PutObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key: path,
            Body: image,
            ContentType: "image/jpeg",
        });
        const invalidationRequest = new CreateInvalidationCommand({
            DistributionId: process.env.AWS_CLOUDFRONT_ID!,
            InvalidationBatch: {
                CallerReference: Date.now().toString(),
                Paths: {
                    Quantity: 1,
                    Items: [path],
                },
            },
        });

        try {
            await Promise.all([
                this.s3.send(putRequest),
                this.cloudfront.send(invalidationRequest),
            ]);
        } catch (e: unknown) {
            this.logger.warn(`Error updating user image: ${e}`);
            throw new Error("Failed to update user image.");
        }
    }

    async getImage(path: string): Promise<string | undefined> {
        const params = {
            Bucket: AWS_BUCKET_NAME,
            Key: path,
        };

        return await expr(async () => {
            try {
                await this.s3.send(new HeadObjectCommand(params));
                return await getSignedUrl(
                    this.s3,
                    new GetObjectCommand(params),
                );
            } catch (e) {
                this.logger.warn(`Error fetching user image: ${e}`);
                return;
            }
        });
    }

    async deleteImage(path: string): Promise<void> {
        const params = new DeleteObjectCommand({
            Bucket: AWS_BUCKET_NAME,
            Key: path,
        });

        try {
            await this.s3.send(params);
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
