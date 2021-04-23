import "reflect-metadata";
import { __prod__ } from "./constants";
import { MikroORM } from "@mikro-orm/core";
import mikroORMConfig from "./mikro-orm.config";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";

// import Type-GraphQL Resolvers
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";

// Main App Setup
const main = async () => {
  // get MikroORM config
  const orm = await MikroORM.init(mikroORMConfig);

  // run migrations before anything else
  orm.getMigrator().up();

  // ExpressJS server init
  const app = express();

  // ApolloServer setup
  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: () => ({ em: orm.em }),
  });

  // creates the GraphQL endpoint
  apolloServer.applyMiddleware({ app });

  app.listen(4000, () => {
    console.log("ExpressJS server started at localhost:4000");
  });
};

main();
