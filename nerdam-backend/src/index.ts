import "reflect-metadata";
import { COOKIE_NAME, __prod__ } from "./constants";
import { MikroORM } from "@mikro-orm/core";
import mikroORMConfig from "./mikro-orm.config";
import express from "express";
import { ApolloServer } from "apollo-server-express";
import { buildSchema } from "type-graphql";

// import Type-GraphQL Resolvers
import { HelloResolver } from "./resolvers/hello";
import { PostResolver } from "./resolvers/post";
import { UserResolver } from "./resolvers/user";

import Redis from "ioredis";
import session from "express-session";
import connectRedis from "connect-redis";
import cors from "cors";

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
  const redis = new Redis();

  // Make CORS headers available globally (on all routes)

  // enable cors
  var corsOptions = {
    origin: "http://localhost:3000",
    credentials: true, // <-- REQUIRED backend setting
  };
  app.use(cors(corsOptions));

  // Setup session config
  app.use(
    session({
      name: COOKIE_NAME,
      store: new RedisStore({
        client: redis,
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
    context: ({ req, res }) => ({ em: orm.em, req, res, redis }),
  });

  // creates the GraphQL endpoint
  apolloServer.applyMiddleware({ app, cors: false });

  app.listen(4000, () => {
    console.log("ExpressJS server started at localhost:4000");
  });
};

main();
