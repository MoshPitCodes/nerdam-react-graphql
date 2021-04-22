import { MikroORM } from "@mikro-orm/core";
import mikroORMConfig from "./mikro-orm.config";

import { __prod__ } from "./constants";
import { Post } from "./entities/Post";

const main = async () => {
  // get MikroORM config
  const orm = await MikroORM.init(mikroORMConfig);

  // run migrations before anything else
  orm.getMigrator().up();

  // create an entity of type Post and save it on database
  const post = orm.em.create(Post, { title: "my first post" });
  await orm.em.persistAndFlush(post);
};

main();
