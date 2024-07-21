import { Logger } from "winston";

export class ImageService {
    public constructor(private readonly logger: Logger) {}

    /** Update a user image, given the buffer. */
    public async updateUserImage(
        userId: string,
        buffer: Buffer,
    ): Promise<void> {}

    /** Get an image associated with the user, i.e. their avatar. */
    public async getUserImage(userId: string): Promise<string | undefined> {
        return;
    }
}
