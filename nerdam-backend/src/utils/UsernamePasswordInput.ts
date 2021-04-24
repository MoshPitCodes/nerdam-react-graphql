import { Field, InputType } from "type-graphql";

// GraphQL Types

@InputType()
export class UsernamePasswordInput {
  @Field()
  email: string;

  @Field()
  username: string;

  @Field()
  password: string;
}
