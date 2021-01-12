import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({
    email: { type: String, required: true, unique: true},

    // TODO: meaning that usernames don't need to be unique anymore, as long
    //      as the composite username and tag are unique, this makes it possible
    //      for users to use the same username.
    name: {type: String, required: false, unique: true},
    tag: {type: String, required: true, minlength: 4, maxlength: 4},
    password: {type: String, required: true, minLength: 12}
});

const userModel = mongoose.model('user', userSchema);

export default userModel;
