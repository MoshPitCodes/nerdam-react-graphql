import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  ObjectType,
  Query,
  Resolver,
} from "type-graphql";
import { User } from "../entities/User";
import { MyContext } from "../types";
import argon2 from "argon2";

// GraphQL Types
@InputType()
class UsernamePasswordInput {
  @Field()
  username: string;

  @Field()
  password: string;
}

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
  Register new user
  ------------------------- */
  @Mutation(() => UserResponse)
  async register(
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { req, em }: MyContext
  ): Promise<UserResponse> {
    // If username is too short
    if (options.username.length < 3) {
      return {
        errors: [
          {
            field: "username",
            message: "Username must contain more than 3 characters.",
          },
        ],
      };
    }

    // If password is too short
    if (options.password.length < 3) {
      return {
        errors: [
          {
            field: "password",
            message: "Password must contain more than 3 characters.",
          },
        ],
      };
    }
    const hashedPassword = await argon2.hash(options.password);
    const user = em.create(User, {
      username: options.username,
      password: hashedPassword,
    });

    // If username already exists
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

    // All good? Then save user
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
    @Arg("options") options: UsernamePasswordInput,
    @Ctx() { em, req }: MyContext
  ): Promise<UserResponse> {
    const user = await em.findOne(User, {
      username: options.username.toLowerCase(),
    });

    // If user does not exist
    if (!user) {
      return {
        errors: [
          {
            field: "username",
            message: "Username does not exist.",
          },
        ],
      };
    }

    // If entered password is incorrect
    const verified = await argon2.verify(user.password, options.password);
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
}
