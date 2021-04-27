import argon2 from "argon2";
import {
  Arg,
  Ctx,
  Field,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import { getConnection } from "typeorm";
import { v4 as uuidv4 } from "uuid";
import { COOKIE_NAME, FORGOT_PASSWORD_PREFIX } from "../constants";
import { User } from "../entities/User";
import { MyContext } from "../types";
import { sendEmail } from "../utils/sendEmail";
import { UsernamePasswordInput } from "../utils/UsernamePasswordInput";
import { validateRegister } from "../utils/validateRegister";

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
  me(@Ctx() { req }: MyContext) {
    /// not logged in
    if (!req.session.userId) {
      return null;
    }

    return User.findOne(req.session.userId);
  }

  /* -------------------------
  Change password
  ------------------------- */
  @Mutation(() => UserResponse)
  async changePassword(
    @Arg("token") token: string,
    @Arg("newPassword") newPassword: string,
    @Ctx() { req, redis }: MyContext
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
    const userIdNum = parseInt(userId);
    const user = await User.findOne(userIdNum);
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

    // update user in database
    await User.update(
      { id: userIdNum },
      { password: await argon2.hash(newPassword) }
    );
    // delete token from Redis
    // so it can't be used a second time
    await redis.del(key);

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
    @Ctx() { redis }: MyContext
  ) {
    const user = await User.findOne({ where: { email } });
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
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    // validate options given on register form
    const errors = validateRegister(options);

    if (errors) {
      return { errors };
    }

    // Check if username already exists
    const exists = await User.findOne({ username: options.username });
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
    let user;
    try {
      // await User.create([
      //   {
      //     username: options.username,
      //     email: options.email,
      //     password: hashedPassword,
      //   },
      // ]).save();

      const result = await getConnection()
        .createQueryBuilder()
        .insert()
        .into(User)
        .values([
          {
            username: options.username,
            email: options.email,
            password: hashedPassword,
          },
        ])
        .returning("*")
        .execute();
      user = result.raw[0];
    } catch (err) {
      console.log("err: ", err.message);
    }

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
    @Ctx() { req }: MyContext
  ): Promise<UserResponse> {
    const user = await User.findOne(
      usernameOrEmail.includes("@")
        ? { where: { email: usernameOrEmail.toLowerCase() } }
        : { where: { username: usernameOrEmail.toLowerCase() } }
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
