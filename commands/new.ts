import {
  SpinnerTypes,
  TerminalSpinner,
} from "https://deno.land/x/spinners@v1.1.2/mod.ts";
import { relative, resolve } from "https://deno.land/std@0.172.0/path/mod.ts";
import { Command } from "../deps/cliffy.ts";
import { uploadFile } from "../lib/uploadFile.ts";
import { release } from "../lib/release.ts";
import {
  increment,
  maxSatisfying,
} from "https://deno.land/std@0.172.0/semver/mod.ts";
import { getAliasList } from "../lib/getAliasList.ts";

export default new Command<{ origin: string }>()
  .name("new")
  .description("Upload a file to crux.")
  .arguments("<path:file>")
  .option("-n, --name <name:string>", "Use a custom name for the modue.")
  .option(
    "-v, --version <version:string>",
    "Set the version of the named module.",
    {
      depends: ["name"],
      conflicts: ["major", "minor", "patch"],
    },
  )
  .option(
    "-r, --release, --major",
    "Increment the version of a named crux module by a major.",
    {
      depends: ["name"],
      conflicts: ["version"],
    },
  )
  .option(
    "-m, --minor",
    "Increment the version of a named crux module by a minor.",
    {
      depends: ["name"],
      conflicts: ["version"],
    },
  )
  .option(
    "-p, --patch",
    "Increment the version of a named crux module by a patch.",
    {
      depends: ["name"],
      conflicts: ["version"],
    },
  )
  .action(
    async ({ origin, name, minor, patch, release: major, version }, path) => {
      path = resolve(Deno.cwd(), path);
      const rPath = relative(path, Deno.cwd());
      let id: string;
      {
        const spinner = new TerminalSpinner({
          text: `Uploading '${rPath}' to ${origin}`,
          spinner: SpinnerTypes.arc,
        }).start();
        try {
          id = await uploadFile(origin, path);
          spinner.succeed(`Published to https://${origin}/${id}`);
        } catch (error) {
          let message = "";
          if (error instanceof Deno.errors.NotFound) {
            message = "File not found!";
          } else message = error.message;
          spinner.fail(message);
          Deno.exit(1);
        }
      }
      if (name) {
        if (!version && !(minor || patch || major)) {
          throw new Error(
            "You must provide a way to set the version of the named module, via --version, --major, --minor or --patch!",
          );
        }
        if (!version) {
          const spinner = new TerminalSpinner({
            text: `Getting module versions for https://${origin}/${name}`,
            spinner: SpinnerTypes.arc,
          }).start();
          const list = await getAliasList(origin);
          const mod = list.find((entry) => entry.alias === name);
          if (!mod) {
            spinner.fail(
              `Module https://${origin}/${name} not found or does not belong to you! Use \`crux request${
                origin === "crux.land" ? "" : ` --origin '${origin}'`
              } '${name}'\` to request the alias!`,
            );
            Deno.exit(1);
          }
          const tags = Object.keys(mod.tags);
          if (!tags.length) {
            version = "0.1.0";
            spinner.succeed("No previous versions, next version 0.1.0!");
          } else {
            const greatestVersion = maxSatisfying(tags, ">=0", {
              includePrerelease: true,
            });
            version = increment(
              greatestVersion!,
              major ? "major" : minor ? "minor" : "patch",
            )!;
            spinner.succeed(
              `Previous version was ${greatestVersion}, next version ${version}!`,
            );
          }
        }

        const spinner = new TerminalSpinner({
          text: `Publishing to https://${origin}/${name}@${version}`,
          spinner: SpinnerTypes.arc,
        }).start();
        try {
          await release({
            origin,
            name,
            version,
            id,
          });
          spinner.succeed(
            `Published to https://${origin}/${name}@${version}`,
          );
        } catch (error) {
          let message = "";
          if (error instanceof Deno.errors.NotFound) {
            message = `You are currently not signed onto ${origin}!`;
          } else {
            message = error.message;
          }
          spinner.fail(message);
          Deno.exit(1);
        }
      }
    },
  );
