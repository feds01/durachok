export type RegisteredUserTokenPayload = {
    id: string,
    name: string,
    email: string,
}

export type AnonymousUserTokenPayload = {
    name: string,
    pin: string,
}

export type Token<T extends RegisteredUserTokenPayload | AnonymousUserTokenPayload> = {
    data: T
    exp: number,
    alg: string,
}

declare global {
    namespace Express {
        export interface Request {
            token?: Token,
        }
    }
}
