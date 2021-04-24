import {
  Arg,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import { User } from "../entities/User";
import { MyContext } from "../types";
import argon2 from "argon2";
import { COOKIE_NAME, FORGOT_PASSWORD_PREFIX } from "../constants";
import { UsernamePasswordInput } from "../utils/UsernamePasswordInput";
import { validateRegister } from "../utils/validateRegister";
import { sendEmail } from "../utils/sendEmail";
import { v4 as uuidv4 } from "uuid";

// GraphQL Object Types
@ObjectType()
class FieldError {
  @Field()
  field: string;

  @Field()
  message: string;
}

@ObjectType()
class UserResponse {
  @Field(() => [FieldError], { nullable: true })
  errors?: FieldError[];

  @Field(() => User, { nullable: true })
  user?: User;
}

// GraphQL Resolver
@Resolver()
export class UserResolver {
  /* -------------------------
  Check if user is logged in
  ------------------------- */
  @Query(() => User, { nullable: true })
  async me(@Ctx() { req, em }: MyContext) {
    /// not logged in
    if (!req.session.userId) {
      return null;
    }

    const user = await em.findOne(User, { id: req.session.userId });
    return user;
  }

  /* -------------------------
  Change password
  ------------------------- */
  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { req, em, redis }: MyContext
  ): Promise<UserResponse> {
    // If password is too short
    if (newPassword.length < 3) {
      return {
        errors: [
          {
            field: "newPassword",
            message: "Password must contain more than 3 characters.",
          },
        ],
      };
    }

    // check if token is still valid
    const key = FORGOT_PASSWORD_PREFIX + token;
    const userId = await redis.get(key);
    if (!userId) {
      return {
        errors: [
          {
            field: "token",
            message: "Token expired.",
          },
        ],
      };
    }

    // check if user exists
    const user = await em.findOne(User, { id: parseInt(userId) });
    if (!user) {
      return {
        errors: [
          {
            field: "token",
            message: "User no longer exists.",
          },
        ],
      };
    }

    // set new password and update database record
    user.password = await argon2.hash(newPassword);
    await em.persistAndFlush(user);

    // delete token from Redis
    // so it can't be used a second time
    redis.del(key);

    // log in user after password change
    req.session.userId = user.id;
    return { user };
  }

  /* -------------------------
  Forgot Password
  ------------------------- */
  @Mutation(() => Boolean)
  async forgotPassword(
    @Arg("email") email: string,
    @Ctx() { em, redis }: MyContext
  ) {
    const user = await em.findOne(User, { email });
    if (!user) {
      // email is not in database
      // maybe do not return any answer to user for security purposes (return true)
      return true;
    }

    // generate token to reset password
    const emailResetToken = uuidv4();

    // store token in Redis
    await redis.set(
      FORGOT_PASSWORD_PREFIX + emailResetToken,
      user.id,
      "ex",
      1000 * 60 * 60 * 24
    );

    // generate email to send to user
    await sendEmail(
      email,
      `<a href="http://localhost:3000/change-password/${emailResetToken}">reset password</a>`
    );

    return true;
  }

  /* -------------------------
  Register new user
  ------------------------- */
  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { req, em }: MyContext
  ): Promise<UserResponse> {
    // validate options given on register form
    const errors = validateRegister(options);

    if (errors) {
      return { errors };
    }

    // Check if username already exists
    const exists = await em.findOne(User, { username: options.username });
    if (exists && exists.username === options.username) {
      return {
        errors: [
          {
            field: "username",
            message: "Username already exists.",
          },
        ],
      };
    }

    // All good? Then create and save user

    const hashedPassword = await argon2.hash(options.password);
    const user = em.create(User, {
      username: options.username,
      password: hashedPassword,
      email: options.email,
    });

    console.log("-------------------------", user);
    await em.persistAndFlush(user);

    // store userId in session
    // this will setin session on the user client
    req.session!.userId = user.id;

    return { user };
  }

  /* -------------------------
  Login user
  ------------------------- */
  @Mutation(() => UserResponse)
  async login(
    @Arg("usernameOrEmail") usernameOrEmail: string,
    @Arg("password") password: string,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(
      User,
      usernameOrEmail.includes("@")
        ? { email: usernameOrEmail.toLowerCase() }
        : { username: usernameOrEmail.toLowerCase() }
    );

    // If user does not exist
    if (!user) {
      return {
        errors: [
          {
            field: "usernameOrEmail",
            message: "Username does not exist.",
          },
        ],
      };
    }

    // If entered password is incorrect
    const verified = await argon2.verify(user.password, password);
    if (!verified) {
      return {
        errors: [
          {
            field: "password",
            message: "Incorrect password",
          },
        ],
      };
    }

    // store userId in session
    // this will setin session on the user client
    req.session!.userId = user.id;

    return { user };
  }

  /* -------------------------
  Logout user
  ------------------------- */
  @Mutation(() => Boolean)
  logout(@Ctx() { req, res }: MyContext) {
    return new Promise((resolve) =>
      req.session.destroy((err) => {
        if (err) {
          console.log(err);
          resolve(false);
          return;
        }
        res.clearCookie(COOKIE_NAME);
        resolve(true);
      })
    );
  }
}
