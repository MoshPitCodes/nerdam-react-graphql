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

import redis from "redis";
import session from "express-session";
import connectRedis from "connect-redis";

// Main App Setup
const main = async () => {
  // get MikroORM config
  const orm = await MikroORM.init(mikroORMConfig);

  // run migrations before anything else
  orm.getMigrator().up();

  // ExpressJS server init
  const app = express();

  // Setup redis, connect-redis and express-session
  // ORDER MATTERS!
  const RedisStore = connectRedis(session);
  const redisClient = redis.createClient();

  app.use(
    session({
      name: "nerdam",
      store: new RedisStore({
        client: redisClient,
        disableTouch: true,
        disableTTL: true,
      }),
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 365 * 10, // 10 years
        httpOnly: true, // cookie not accessible from JS in frontend
        secure: __prod__, // cookie only works with https in production
        sameSite: "lax", // related to CSRF
      },
      saveUninitialized: false, // create session by default, even if empty
      secret: "ljshrtboijhaerv09873pojkmaestrpbij0897235r",
      resave: false,
    })
  );

  // ApolloServer setup
  const apolloServer = new ApolloServer({
    schema: await buildSchema({
      resolvers: [HelloResolver, PostResolver, UserResolver],
      validate: false,
    }),
    context: ({ req, res }) => ({ em: orm.em, req, res }),
  });

  // creates the GraphQL endpoint
  apolloServer.applyMiddleware({ app });

  app.listen(4000, () => {
    console.log("ExpressJS server started at localhost:4000");
  });
};

main();
