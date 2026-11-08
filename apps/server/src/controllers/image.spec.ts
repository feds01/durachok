import { describe, expect, test } from "bun:test";
import pino from "pino";
import sharp from "sharp";

import { ImageRepo } from "../repos/image";
import { ImageService } from "./image";

/** An image service that keeps what it saves in memory. */
function service() {
    const saved = new Map<string, Buffer>();
    const repo: ImageRepo = {
        saveImage: async (path, image) => void saved.set(path, image),
        getImage: async () => undefined,
        deleteImage: async () => undefined,
    };
    return { saved, images: new ImageService(pino({ level: "silent" }), repo) };
}

/** A picture of one colour, as a file of a format. */
function picture(width: number, height: number, format: "jpeg" | "png" = "jpeg") {
    return sharp({ create: { width, height, channels: 3, background: "teal" } })
        .withMetadata({ exif: { IFD0: { Copyright: "secret" } } })
        .toFormat(format)
        .toBuffer();
}

describe("An avatar", () => {
    test("is a new JPEG of the upload, at a fixed size, without the upload's metadata", async () => {
        const { saved, images } = service();
        await images.updateUserImage("user", await picture(1024, 768, "png"));

        const avatar = saved.get("user/user.jpeg")!;
        const { format, width, height, exif } = await sharp(avatar).metadata();
        expect({ format, width, height, exif }).toEqual({ format: "jpeg", width: 256, height: 256, exif: undefined });
    });

    test("isn't made from a file that decodes into a huge image", async () => {
        const { images } = service();
        const bomb = await picture(5000, 5000);
        expect(bomb.byteLength).toBeLessThan(1024 * 1024);

        await expect(images.updateUserImage("user", bomb)).rejects.toThrow("isn't an image");
    });

    test("isn't made from what isn't a picture, or from an SVG", async () => {
        const { images } = service();
        const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10"/>');
        const fake = Buffer.concat([Buffer.from([0xff, 0xd8, 0xff]), Buffer.from("<script>alert(1)</script>")]);

        await expect(images.updateUserImage("user", svg)).rejects.toThrow("isn't an image");
        await expect(images.updateUserImage("user", fake)).rejects.toThrow("isn't an image");
    });
});
