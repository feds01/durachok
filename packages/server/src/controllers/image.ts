import { Logger } from "winston";

export class ImageService {
    public constructor(private readonly logger: Logger) {}

    /** Get an image associated with the user, i.e. their avatar. */
    public async getUserImage(userId: string): Promise<string | undefined> {
        return;
    }
}
