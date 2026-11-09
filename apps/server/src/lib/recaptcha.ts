import { z } from "zod";

/** Google's endpoint that checks a reCAPTCHA token, @see https://developers.google.com/recaptcha/docs/verify. */
export const SITEVERIFY_URL = "https://www.google.com/recaptcha/api/siteverify";

/** What Google answers about a token, as far as the server reads it. */
const SiteVerifyResponseSchema = z.object({
    success: z.boolean(),
    "error-codes": z.array(z.string()).optional(),
});

/** Whether a token passed, and if not, Google's reasons, such as `timeout-or-duplicate`. */
export interface ReCaptchaResult {
    passed: boolean;
    errors: string[];
}

/**
 * Ask Google whether a person solved the reCAPTCHA that gave them this token. A token can be
 * checked only once, and only within two minutes of the widget giving it.
 *
 * @param secret - The server's secret key, which Google pairs with the web app's site key.
 * @param token - The token that the web app's widget gave the person.
 * @param remoteIp - The person's address, which Google may check the token against.
 */
export async function verifyReCaptcha(secret: string, token: string, remoteIp?: string): Promise<ReCaptchaResult> {
    // Google would only say that the response is missing.
    if (token === "") {
        return { passed: false, errors: ["missing-input-response"] };
    }

    const body = new URLSearchParams({ secret, response: token, ...(remoteIp && { remoteip: remoteIp }) });
    const response = await fetch(SITEVERIFY_URL, { method: "POST", body });
    if (!response.ok) {
        return { passed: false, errors: [`http-${response.status}`] };
    }

    const answer = SiteVerifyResponseSchema.safeParse(await response.json());
    if (!answer.success) {
        return { passed: false, errors: ["unexpected-response"] };
    }
    return { passed: answer.data.success, errors: answer.data["error-codes"] ?? [] };
}
