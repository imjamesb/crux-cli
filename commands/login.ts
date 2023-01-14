import { Command, EnumType, Number, prompt, Secret } from "../deps/cliffy.ts";
import { saveAuthentication } from "../lib/auth.ts";

enum LoginStrategy {
  Manual = "manual",
  GitHub = "github",
}

const strategy = new EnumType(LoginStrategy);

export default new Command<{ origin: string }>()
  .type("strategy", strategy)
  .name("login")
  .description("Sign in to crux.land")
  .option(
    "-s, --strategy <strategy:strategy>",
    "Which login strategy to use.",
    { default: "github" },
  )
  .action(async ({ origin, strategy }) => {
    if (strategy === "github") throw new Error("Not implemented!");
    if (strategy === "manual") {
      const result = await prompt([{
        name: "user",
        message: "What's your user ID?",
        type: Number,
      }, {
        name: "secret",
        message: "What's your user secret?",
        type: Secret,
      }]);
      // deno-lint-ignore no-explicit-any
      await saveAuthentication(origin, result as any);
    }
  });
