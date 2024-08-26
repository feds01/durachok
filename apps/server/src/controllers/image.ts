import { Logger } from "pino";

import { ImageRepo } from "../repos/image";

const MAX_FILE_SIZE = 1048576; // 1 megabyte

export class ImageService {
    public constructor(
        private readonly logger: Logger,
        private readonly imageRepo: ImageRepo,
    ) {}

    /**
     * This function will simply convert a raw image which is base64 format into
     * a Buffer Image which can then be written to a file, re-sized, etc.
     *
     * @param rawImage - The raw image string
     * @param imageType - The mime type of image (jpeg or png)
     * @return The resulting buffer from the the raw image string.
     * */
    private decodeImage(buf: Buffer, imageType = "jpeg"): Buffer {
        if (buf.length < 3) {
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
    public async updateUserImage(userId: string, image: Buffer): Promise<void> {
        const decodedImage = this.decodeImage(image);
        const filename = this.getUserImageKey(userId);

        await this.imageRepo.saveImage(filename, decodedImage);
    }

    /** Get an image associated with the user, i.e. their avatar. */
    public async getUserImage(userId: string): Promise<string | undefined> {
        return this.imageRepo.getImage(this.getUserImageKey(userId));
    }

    /** Delete the image associated with the user. */
    public async deleteUserImage(userId: string): Promise<void> {
        await this.imageRepo.deleteImage(this.getUserImageKey(userId));
    }
}
