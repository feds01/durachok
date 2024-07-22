/** Image repository interface. */
export interface ImageRepo {
    /** Save a user profile image to the image repository.  */
    saveImage(path: string, image: Buffer): Promise<void>;
    /** Get a user profile image from the image repository, if it exists. */
    getImage(path: string): Promise<string | undefined>;
    /** Delete a user profile image from the image repository */
    deleteImage(path: string): Promise<void>;
}
