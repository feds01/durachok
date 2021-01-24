export type RegisteredUserData = {
    id: string,
    name: string,
    email: string,
}

export type AnonymousUserData = {
    id?: string,
    name: string,
    pin: string,
}

export type Token<T extends RegisteredUserData | AnonymousUserData> = {
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
