import { Arg, Ctx, Mutation, Query, Resolver } from "type-graphql";
import { Post } from "../entities/Post";
import { MyContext } from "../types";

@Resolver()
export class PostResolver {
  /* -------------------------
  Get all posts from database
  ------------------------- */
  @Query(() => [Post])
  posts(@Ctx() { em }: MyContext): Promise<Post[]> {
    return em.find(Post, {});
  }

  /* -------------------------
  Get single post from database
  ------------------------- */
  @Query(() => Post, { nullable: true })
  post(@Arg("id") id: number, @Ctx() { em }: MyContext): Promise<Post | null> {
    return em.findOne(Post, { id });
  }

  /* -------------------------
  Get single post from database
  ------------------------- */
  @Mutation(() => Post)
  async createPost(
    @Arg("title", () => String) title: string,
    @Ctx() { em }: MyContext
  ): Promise<Post> {
    const post = em.create(Post, { title });
    await em.persistAndFlush(post);
    return post;
  }

  /* -------------------------
  Update post in database
  ------------------------- */
  @Mutation(() => Post, { nullable: true })
  async updatePost(
    @Arg("id") id: number,
    @Arg("title", () => String) title: string,
    @Ctx() { em }: MyContext
  ): Promise<Post | null> {
    const post = await em.findOne(Post, { id });
    // if post not found
    if (!post) {
      return null;
    }
    // if title is not empty
    if (typeof title !== undefined) {
      post.title = title;
      await em.persistAndFlush(post);
    }

    return post;
  }

  /* -------------------------
  Delete post from database
  ------------------------- */
  @Mutation(() => Boolean)
  async deletePost(
    @Arg("id") id: number,
    @Ctx() { em }: MyContext
  ): Promise<boolean> {
    try {
      await em.nativeDelete(Post, { id });
    } catch (err) {
      console.log(err.message);
      return false;
    }

    return true;
  }
}
