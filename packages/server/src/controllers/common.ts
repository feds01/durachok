import { isDef } from '../utils';
import User, { IUser } from './../models/user.model';

/**
 * A service used to access common functionality and information
 * about data objects stored within the DB.
 */
export class CommonService {
    public constructor() {
    }

    /** Find a user by `ID` and return the underling DB object. */
    public async getUserDbObject(userId: string): Promise<IUser> {
        const user = await User.findById(userId);

        if (!isDef(user)) {
            throw new Error('User not found');
        }

        return user;
    }
}
