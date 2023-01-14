import { Command, CompletionsCommand, HelpCommand } from "./deps/cliffy.ts";
import version from "./version.ts";

import loginCommand from "./commands/login.ts";
import whoamiCommand from "./commands/whoami.ts";
import newCommand from "./commands/new.ts";
import requestCommand from "./commands/request.ts";

const command = new Command()
  .name("crux")
  .description("A command-line tool to interact with https://crux.land/")
  .version(version)
  .option(
    "-o, --origin <url:string>",
    "The origin URL of your desired crux.land instance.",
    {
      default: "crux.land",
      global: true,
      action: (options) => {
        try {
          options.origin = new URL(options.origin).hostname;
        } catch {
          try {
            options.origin = new URL("https://" + options.origin).hostname;
          } catch {
            throw new Error("Invalid origin!");
          }
        }
      },
    },
  )
  // deno-lint-ignore no-explicit-any
  .command("login", loginCommand as any)
  // deno-lint-ignore no-explicit-any
  .command("whoami", whoamiCommand as any)
  // deno-lint-ignore no-explicit-any
  .command("new", newCommand as any)
  // deno-lint-ignore no-explicit-any
  .command("request", requestCommand as any)
  .command("help", new HelpCommand())
  .command("completions", new CompletionsCommand());

if (import.meta.main) {
  await command.parse(Deno.args);
}

export * from "./lib/mod.ts";
