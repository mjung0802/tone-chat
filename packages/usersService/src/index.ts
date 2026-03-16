import { app } from "./app.js";
import { config, validateConfig } from "./config/index.js";

validateConfig();

app.listen(config.port, () => {
  console.log(`usersService listening on port ${config.port}`);
});
