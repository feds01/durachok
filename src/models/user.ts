import mongoose, {Document, Schema} from 'mongoose';

export interface IUser extends Document {
    email: string,
    name: string,
    password: string,
    image: boolean,
    createdAt: number,
}


const UserSchema = new Schema({
    image: {type: Boolean, required: false, default: false},
    email: { type: String, required: true, unique: true},
    name: {type: String, required: false, unique: true},
    password: {type: String, required: true, minLength: 12},
    createdAt: {type: Date, required: false, default: Date.now},
});

export default mongoose.model<IUser>('user', UserSchema);
