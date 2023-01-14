import { Command } from "../deps/cliffy.ts";
import { useAuthentication } from "../lib/auth.ts";

export default new Command<{ origin: string }>()
  .name("whoami")
  .description("See the currently signed in user ID.")
  .action(async ({ origin }) => {
    try {
      const obj = {} as { user: string };
      await useAuthentication(origin, obj);
      console.log("Your user id is %d", obj.user);
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        console.log("You are currently not signed onto %s!", origin);
      } else {
        throw error;
      }
    }
  });
