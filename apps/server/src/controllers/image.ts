import { TRPCError } from "@trpc/server";
import { Logger } from "pino";
import sharp from "sharp";

import { ImageRepo } from "../repos/image";

/** The largest file that a user may upload for their avatar. */
const MAX_FILE_SIZE = 1024 * 1024;

/** The most pixels that an upload may have, so that a small file can't decode into a huge image. */
const MAX_INPUT_PIXELS = 4096 * 4096;

/** The kinds of image that an avatar can be made from, which leaves out SVG, which would run on the server. */
const UPLOAD_FORMATS = new Set(["jpeg", "png", "webp"]);

/** How wide and tall an avatar is, in pixels. */
const AVATAR_SIZE = 256;

/** The error for an upload that can't be made into an avatar. */
function unusableImage(message = "That isn't an image that can be an avatar"): TRPCError {
    return new TRPCError({ code: "BAD_REQUEST", message });
}

export class ImageService {
    public constructor(
        private readonly logger: Logger,
        private readonly imageRepo: ImageRepo,
    ) {}

    /**
     * Make an upload into an avatar: decode it, and encode a new JPEG of it at a fixed size, so
     * that players are sent only the picture. None of the upload's metadata, such as where it was
     * taken, nor anything hidden in its bytes, is kept, and no image is so large that it stalls
     * the browsers that show it.
     */
    private async toAvatar(upload: Buffer): Promise<Buffer> {
        if (upload.byteLength > MAX_FILE_SIZE) {
            throw unusableImage("An avatar can be at most 1 MB");
        }

        const options = { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" } as const;
        const metadata = await sharp(upload, options)
            .metadata()
            .catch(() => undefined);
        if (!metadata?.format || !UPLOAD_FORMATS.has(metadata.format)) {
            throw unusableImage();
        }

        try {
            return await sharp(upload, options)
                // Turn the picture as its metadata says, before the metadata goes.
                .rotate()
                .resize(AVATAR_SIZE, AVATAR_SIZE, { fit: "cover" })
                .flatten({ background: "#ffffff" })
                .jpeg({ quality: 85 })
                .toBuffer();
        } catch (e: unknown) {
            this.logger.warn({ err: e }, "couldn't make an upload into an avatar");
            throw unusableImage();
        }
    }

    /** Get a key corresponding to the user ID. */
    private getUserImageKey(userId: string): string {
        return `user/${userId}.jpeg`;
    }

    /** Update a user image, given the buffer. */
    public async updateUserImage(userId: string, image: Buffer): Promise<void> {
        await this.imageRepo.saveImage(this.getUserImageKey(userId), await this.toAvatar(image));
    }

    /** Get an image associated with the user, i.e. their avatar. */
    public getUserImage(userId: string): Promise<string | undefined> {
        return this.imageRepo.getImage(this.getUserImageKey(userId));
    }

    /** Delete the image associated with the user. */
    public async deleteUserImage(userId: string): Promise<void> {
        await this.imageRepo.deleteImage(this.getUserImageKey(userId));
    }
}
