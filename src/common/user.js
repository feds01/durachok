import * as Joi from "joi";
import {error} from "shared";
import SchemaError from "../errors/SchemaError";
import User from "../models/user";


/**
 * Function to create or update a user account based on the parameters
 *
 * @param {boolean} isCreating - flag to represent if an account is being created or not.
 * @param {{name?: string, email?: string, password?: string}} request - User account request body
 *
 * @throws {SchemaError} if any of the parameters do not match the defined schema.
 * */
export async function validateAccountCreateOrUpdate(isCreating, request) {
    const UserSchema = Joi.object().keys({
        name: Joi.string()
            .pattern(/^[^\s]{1,20}$/)
            .min(1)
            .max(20)
            .messages({
                'any.required': 'Name is required',
                'string.empty': 'Name cannot be empty',
                'string.pattern.base': 'Name cannot have spaces',
                'string.min': 'Name must be be at least 8 characters long',
                'string.max': 'Name cannot be longer than 20 characters',
            }),
        email: Joi.string()
            .email()
            .messages({
                'any.required': 'Email is required',
                'string.empty': 'Email cannot be empty',
                'string.email': 'Must be a valid email',
            }),
        password: Joi.string()
            .min(8)
            .max(30)
            .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[#$@!%&*?])[A-Za-z\d#$@!%&*?]{8,30}$/)
            .messages({
                'any.required': 'Password is required',
                'string.empty': 'Password cannot be empty',
                'string.min': 'Password must be be at least 8 characters long',
                'string.max': 'Password cannot be longer than 30 character.',
                'string.pattern.base': 'Password must include a special character, one uppercase character, and a number',
            })
    });

    const result = UserSchema.validate({name, email, password}, {presence: isCreating ? "required" : "optional", abortEarly: false});

    if (result.error) {
        throw new SchemaError("Invalid Parameters", result.error);
    }


    const existingUser = await User.findOne({
        $or: [
            {name: name},
            {email: email}
        ]
    });

    if (existingUser) {
        throw new SchemaError("Invalid parameters", {
            ...email === existingUser.email && {email: error.MAIL_EXISTS},
            ...name === existingUser.name && {name: "Name already taken."},
        });
    }

    return {name, email, password};
}
