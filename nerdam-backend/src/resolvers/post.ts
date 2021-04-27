import {
  Arg,
  Ctx,
  Field,
  InputType,
  Mutation,
  Query,
  Resolver,
  UseMiddleware,
} from "type-graphql";
import { Post } from "../entities/Post";
import { isAuth } from "../middleware/isAuth";
import { MyContext } from "../types";

@InputType()
class PostInput {
  @Field()
  title: string;

  @Field()
  text: string;
}

@Resolver()
export class PostResolver {
  /* -------------------------
  Get all posts from database
  ------------------------- */
  @Query(() => [Post])
  posts(): Promise<Post[]> {
    return Post.find();
  }

  /* -------------------------
  Get single post from database
  ------------------------- */
  @Query(() => Post, { nullable: true })
  post(@Arg("id") id: number): Promise<Post | undefined> {
    return Post.findOne(id);
  }

  /* -------------------------
  Get single post from database
  ------------------------- */
  @Mutation(() => Post)
  @UseMiddleware(isAuth)
  async createPost(
    @Arg("input") input: PostInput,
    @Ctx() { req }: MyContext
  ): Promise<Post> {
    return Post.create({ ...input, creatorId: req.session.userId }).save();
  }

  /* -------------------------
  Update post in database
  ------------------------- */
  @Mutation(() => Post, { nullable: true })
  @UseMiddleware(isAuth)
  async updatePost(
    @Arg("id") id: number,
    @Arg("title", () => String) title: string
  ): Promise<Post | null> {
    const post = await Post.findOne(id);
    // if post not found
    if (!post) {
      return null;
    }
    // if title is not empty
    if (typeof title !== undefined) {
      await Post.update({ id }, { title });
    }

    return post;
  }

  /* -------------------------
  Delete post from database
  ------------------------- */
  @Mutation(() => Boolean)
  async deletePost(@Arg("id") id: number): Promise<boolean> {
    await Post.delete(id);
    return true;
  }
}
