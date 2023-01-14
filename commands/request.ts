import {
  SpinnerTypes,
  TerminalSpinner,
} from "https://deno.land/x/spinners@v1.1.2/mod.ts";
import { Command } from "../deps/cliffy.ts";
import { request } from "../lib/request.ts";

export default new Command<{ origin: string }>()
  .name("request")
  .description("Request a new alias on crux.")
  .arguments("<alias:string>")
  .action(async ({ origin }, name) => {
    const spinner = new TerminalSpinner({
      text: `Requesting https://${origin}/${name}`,
      spinner: SpinnerTypes.arc,
    }).start();
    try {
      if (await request(origin, name)) {
        spinner.succeed(`Successfully requested https://${origin}/${name}!`);
      } else {
        spinner.fail(
          `Failed to request https://${origin}/${name}, alias already exists!`,
        );
        Deno.exit(1);
      }
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        spinner.fail(`You are currently not signed onto ${origin}!`);
      } else {
        spinner.fail(error.message);
      }
      Deno.exit(1);
    }
  });
