"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validateRegister = void 0;
const validateRegister = (options) => {
    if (!options.email.includes("@")) {
        return [
            {
                field: "email",
                message: "Invalid email address.",
            },
        ];
    }
    if (options.username.length < 3) {
        return [
            {
                field: "username",
                message: "Username must contain more than 3 characters.",
            },
        ];
    }
    if (options.username.includes("@")) {
        return [
            {
                field: "username",
                message: "Username cannot include an @ sign",
            },
        ];
    }
    if (options.password.length < 3) {
        return [
            {
                field: "password",
                message: "Password must contain more than 3 characters.",
            },
        ];
    }
    return null;
};
exports.validateRegister = validateRegister;
//# sourceMappingURL=validateRegister.js.map