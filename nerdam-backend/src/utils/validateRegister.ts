import { UsernamePasswordInput } from "./UsernamePasswordInput";

export const validateRegister = (options: UsernamePasswordInput) => {
  // If email is invalid
  if (!options.email.includes("@")) {
    return [
      {
        field: "email",
        message: "Invalid email address.",
      },
    ];
  }

  // If username is too short
  if (options.username.length < 3) {
    return [
      {
        field: "username",
        message: "Username must contain more than 3 characters.",
      },
    ];
  }

  // If username includes @ sign
  if (options.username.includes("@")) {
    return [
      {
        field: "username",
        message: "Username cannot include an @ sign",
      },
    ];
  }

  // If password is too short
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
