import { MikroORM } from "@mikro-orm/core";
import mikroORMConfig from "./mikro-orm.config";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";

import { __prod__ } from "./constants";
import { HelloResolver } from "./resolvers/hello";

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
      resolvers: [HelloResolver],
      validate: false,
    }),
  });

  // creates the GraphQL endpoint
  apolloServer.applyMiddleware({ app });

  app.listen(4000, () => {
    console.log("ExpressJS server started at localhost:4000");
  });
};

main();
