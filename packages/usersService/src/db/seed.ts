import { client } from "@/client.ts";

(async () => {
  try {
    await client.connect();
    console.log("Connected to the database");

    // Your seed logic here
  } catch (err) {
    console.error("Error connecting to the database", err);
  } finally {
    await client.end();
  }
})();
