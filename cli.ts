import {
  basename,
  Command,
  Confirm,
  EnumType,
  execPath,
  extname,
  increment,
  maxSatisfying,
  Number,
  prompt,
  relative,
  resolve,
  Secret,
  sort,
  spin,
  versionOf,
} from "./_cli_deps.ts";
import { defaultBaseUrl } from "./_constants.ts";
import { getAuth, saveAuth } from "./_cli_auth.ts";
import CruxError from "./error.ts";
import { addFile, aliasList, aliasRelease, aliasRequest } from "./mod.ts";

class FriendlyError extends Error {
  public readonly args: unknown[] = [];
  public constructor(message: string, ...args: unknown[]) {
    super(message);
    this.args = args;
  }
}
FriendlyError.prototype.name = "FriendlyError";
const panic = (formatter: string, ...args: unknown[]): never => {
  throw new FriendlyError(formatter, ...args);
};

const baseUrlAction = (o: { baseUrl: string }) => {
  // verify that the baseUrl provided is valid.
  let url: URL;
  try {
    url = new URL(o.baseUrl);
  } catch (error) {
    try {
      url = new URL("https://" + o.baseUrl);
    } catch {
      throw error;
    }
  }
  o.baseUrl = url.origin + url.pathname;
};

const getUserLogin = async (id: number): Promise<string | undefined> => {
  try {
    const response = await fetch(
      "https://api.github.com/user/" + id,
    );
    const body = await response.json();
    if (body.login) {
      return body.login;
    }
    // deno-lint-ignore no-empty
  } catch {}
};

const useAuth = async (baseDir?: string, baseUrl?: string | URL) => {
  try {
    const info = await getAuth({ baseDir, baseUrl });
    if (!info) throw new Deno.errors.NotFound("");
    return {
      user: info.user,
      secret: info.secret,
      login: info.login || "unknown",
    };
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) {
      panic(
        "You are currently not signed in on '%s'!",
        baseUrl,
      );
    }
    throw error;
  }
};

const inferName = (name?: string, path?: string) =>
  name || (path ? basename(path).slice(0, -extname(path).length) : undefined);

const getCurrentTag = async (
  baseUrl: URL,
  user: number,
  alias: string,
): Promise<{ tag: string; script: URL } | undefined> => {
  const aliases = await aliasList({
    baseUrl,
    user,
  });
  const entry = aliases.find((entry) => entry.alias === alias);
  if (!entry) {
    throw new FriendlyError(
      "You do not currently own that alias! You may request it with '%s alias request %s'",
      await execPath() || "crux",
      alias,
    );
  }
  const tags = Object.keys(entry.tags);
  if (!tags.length) return undefined;
  const tag = maxSatisfying(tags, ">=0", { includePrerelease: true });
  if (!tag) return undefined;
  return { tag, script: new URL("../" + entry.tags[tag], baseUrl) };
};

export const getNextVersionOfAlias = async (
  baseUrl: URL,
  user: number,
  alias: string,
  step: "major" | "minor" | "patch",
): Promise<
  {
    previous: Awaited<ReturnType<typeof getCurrentTag>>;
    next: string;
  }
> => {
  const previous = await getCurrentTag(baseUrl, user, alias);
  return {
    previous,
    next: previous ? increment(previous.tag, step)! : "0.1.0",
  };
};

const command = new Command()
  .name(await execPath() || "")
  .version(versionOf(import.meta.url))
  .option(
    "-b, --base-url <url:string>",
    "The base URL of the crux.land instance.",
    { default: defaultBaseUrl.href, global: true, action: baseUrlAction },
  )
  .command(
    "whoami",
    new Command<{ baseUrl: string }>()
      .name("whoami")
      .description("See who's currently signed in.")
      .option(
        "-d, --base-dir <path:file>",
        "Set the base authentication directory.",
      )
      .action(async ({ baseUrl, baseDir }) => {
        const auth = await useAuth(baseDir, baseUrl);
        console.log("%d (%s)", auth.user, auth.login);
      }),
  )
  .command(
    "login",
    new Command<{ baseUrl: string }>()
      .type("strategy", new EnumType(["manual", "github"]))
      .name("login")
      .description("Sign into crux.land.")
      .arguments("[strategy:strategy]")
      .option(
        "-d, --base-dir <path:file>",
        "Set the base authentication directory.",
      )
      .action(async ({ baseUrl, baseDir }, strategy) => {
        strategy ??= "github";
        switch (strategy) {
          case "manual": {
            const { user, secret } = await prompt([
              {
                type: Number,
                name: "user",
                message: "What's your crux user ID?",
              },
              {
                type: Secret,
                name: "secret",
                message: "What's your crux user secret?",
              },
            ]) as { user: number; secret: string };
            const login = await spin({
              fn: getUserLogin,
              text: "Fetching login name.",
              done: (spinner, login) =>
                login ? spinner.succeed(`Hello, ${login}!`) : spinner.stop(),
              error: (spinner) => spinner.stop(),
            }, user);
            if (
              !login && !await Confirm.prompt({
                message:
                  "We could not find a user with that ID, do you still want to save?",
              })
            ) {
              console.log("Okay we won't save!");
              return;
            }
            await spin({
              fn: saveAuth,
              text: "Saving authentication information.",
              done: (spinner) => spinner.succeed("Saved!"),
              error: (spinner) =>
                spinner.fail("Could not save authentication information!"),
            }, { login, user, secret, baseUrl, baseDir });
            break;
          }
          default:
            panic(
              'The "%s" sign-in strategy has not been implemented yet!',
              strategy,
            );
            break;
        }
      }),
  )
  .command(
    "add",
    new Command<{ baseUrl: string }>()
      .name("add")
      .description(
        "Upload a file to crux. If used together with -v, -r, -m or -p, the alias will be inferred based on the filename, unless used together with -n.",
      )
      .arguments("<path:file>")
      .option(
        "-n, --name <name:string>",
        "Define a custom name for the module.",
      )
      .option(
        "-v, --version <tag:string>",
        "Set the tag of the alias to upload, if not provded, the latest tag will be used instead.",
        { conflicts: ["major", "minor", "patch"] },
      )
      .option(
        "-r, --major, --release",
        "Increment the version of an alias by a major.",
        { conflicts: ["version", "minor", "patch"] },
      )
      .option(
        "-m, --minor",
        "Increment the version of an alias by a minor.",
        {
          conflicts: ["version", "major", "patch"],
        },
      )
      .option(
        "-p, --patch",
        "Increment the version of an alias by a patch.",
        {
          conflicts: ["version", "major", "minor"],
        },
      )
      .option(
        "-d, --base-dir <path:file>",
        "Set the base authentication directory.",
      )
      .action(
        async (
          { baseUrl, baseDir, major, minor, patch, version, name },
          path,
        ) => {
          const withAlias = major || minor || patch || version;
          const inferredName = withAlias ? inferName(name, path) : undefined;

          if (withAlias && !inferredName) {
            panic("Could not infer name of alias!");
          }

          const auth = withAlias
            ? await spin(
              {
                fn: useAuth,
                text: "Getting authentication information.",
                done: (spinner, result) =>
                  spinner.succeed(
                    `Signed in with user ${result.user} (${result.login})`,
                  ),
                error: (spinner) => spinner.stop(),
              },
              baseDir,
              baseUrl,
            )
            : undefined;

          path = resolve(Deno.cwd(), path);
          const rPath = relative(Deno.cwd(), path);

          let result: { script: URL };

          try {
            result = await spin({
              fn: addFile,
              text: `Uploading ${rPath}`,
              done: (spinner, result) =>
                result.created
                  ? spinner.succeed("Published to " + result.script.href)
                  : spinner.info("Already published to " + result.script.href),
              error: (spinner, error) => {
                if (error instanceof CruxError) {
                  spinner.fail(error.message);
                } else if (error instanceof Deno.errors.NotFound) {
                  spinner.fail(`File '${rPath}' not found!`);
                }
              },
            }, { baseUrl, path });
          } catch (error) {
            if (
              error instanceof CruxError ||
              error instanceof Deno.errors.NotFound
            ) return;
            throw error;
          }

          if (!withAlias || !auth) return;

          if (!version) {
            const compute = await spin(
              {
                fn: getNextVersionOfAlias,
                text: "Resolving next version for " + inferredName,
                error: (spinner) => spinner.stop(),
                done: (spinner, { previous, next }) => {
                  if (!previous) {
                    spinner.info(
                      `No previous tags of '${inferredName}' exists, using '${next}'`,
                    );
                  } else {
                    if (result.script.href === previous.script.href) {
                      spinner.warn(
                        `Previous tag '${previous.tag}' and next tag '${next}' has same script ${result.script.href}`,
                      );
                    } else {
                      spinner.info(
                        `Next tag of '${inferredName}' will be '${next}'`,
                      );
                    }
                  }
                },
              },
              new URL(baseUrl),
              auth.user,
              inferredName!,
              major ? "major" : minor ? "minor" : "patch",
            );
            if (
              compute.previous &&
              compute.previous.script.href === result.script.href
            ) {
              if (
                !await Confirm.prompt({
                  message:
                    "Are you sure you would still like to release the new tag?",
                  default: false,
                })
              ) {
                await spin({
                  fn: () => {},
                  text: "",
                  done: (spinner) => spinner.fail("Okay we won't!"),
                  error: () => {},
                });
                return;
              }
            }
            version = compute.next;
          }
          try {
            await spin({
              fn: aliasRelease,
              text: `Releasing '${version}' on '${inferredName}'`,
              done: (spinner) =>
                spinner.succeed(
                  `Published to ${new URL(
                    `../${inferredName}@${version}`,
                    baseUrl,
                  )}`,
                ),
              error: (spinner, error) => {
                if (error instanceof CruxError) {
                  spinner.fail(error.message);
                } else {
                  spinner.stop();
                }
              },
            }, {
              baseUrl,
              user: auth.user,
              secret: auth.secret,
              alias: inferredName!,
              tag: version,
              script: result.script.pathname.substring(1),
            });
          } catch (error) {
            if (error instanceof CruxError) Deno.exit(0);
            else throw error;
          }
        },
      ),
  )
  .command(
    "alias",
    new Command<{ baseUrl: string }>()
      .name("alias")
      .description("Manage your aliases.")
      .command(
        "request",
        new Command<{ baseUrl: string }>()
          .name("request")
          .alias("req")
          .description("Request a new alias.")
          .arguments("<alias:string>")
          .option(
            "-d, --base-dir <path:file>",
            "Set the base authentication directory.",
          )
          .action(async ({ baseUrl, baseDir }, alias) => {
            const auth = await spin(
              {
                fn: useAuth,
                text: "Getting authentication information.",
                done: (spinner, result) =>
                  spinner.succeed(
                    `Signed in with user ${result.user} (${result.login})`,
                  ),
                error: (spinner) => spinner.stop(),
              },
              baseDir,
              baseUrl,
            );
            try {
              await spin({
                fn: aliasRequest,
                text: `Requesting '${alias}'`,
                done: (spinner) =>
                  spinner.succeed(`Successfully requested '${alias}'`),
                error: (spinner, error) => {
                  if (error instanceof CruxError) {
                    spinner.fail(error.message);
                  } else {
                    spinner.stop();
                  }
                },
              }, { baseUrl, user: auth.user, secret: auth.secret, alias });
            } catch (error) {
              if (error instanceof CruxError) Deno.exit(1);
              else throw error;
            }
          }),
      )
      .command(
        "list",
        new Command<{ baseUrl: string }>()
          .name("list")
          .alias("ls")
          .description("Get a list of aliases owned by the current user.")
          .arguments("[alias:string]")
          .option(
            "-d, --base-dir <path:file>",
            "Set the base authentication directory.",
          )
          .action(async ({ baseUrl, baseDir }, alias) => {
            const { user } = await useAuth(baseDir, baseUrl);
            const entries = await aliasList({ user, baseUrl });
            if (!alias) {
              if (Deno.isatty(Deno.stdout.rid)) {
                let longestAliasName = 0;
                const names: string[] = [];
                for (const entry of entries) {
                  longestAliasName = Math.max(
                    longestAliasName,
                    entry.alias.length,
                  );
                  names.push(entry.alias);
                }
                longestAliasName += 4;
                const columns = Math.min(
                  6,
                  Math.floor(
                    Deno.consoleSize().columns / longestAliasName,
                  ),
                );
                let str = "";
                for (let i = 0; i < names.length; i++) {
                  const name = names[i];
                  if (i !== 0 && i % columns === 0) str += "\r\n";
                  str += name.padStart(longestAliasName);
                }
                console.log(str);
              } else {
                console.log(entries.map((entry) => entry.alias).join("\r\n"));
              }
            } else {
              const entry = entries.find((entry) => entry.alias === alias);
              if (!entry) Deno.exit(1);
              const tags = sort(Object.keys(entry.tags), {
                includePrerelease: true,
              });
              const longestTag = tags.reduce(
                (p, c) => Math.max(p, c.length),
                0,
              );
              for (const tag of tags) {
                console.log(
                  "%s -> %s",
                  new URL(`../${alias}@${tag}`, baseUrl)
                    .href + " ".repeat(longestTag - tag.length),
                  new URL(`../${entry.tags[tag]}`, baseUrl).href,
                );
              }
            }
          }),
      ),
  );

if (import.meta.main) {
  try {
    await command.parse(Deno.args);
  } catch (error) {
    if (error instanceof FriendlyError || error instanceof CruxError) {
      // deno-lint-ignore no-explicit-any
      let cmd: Command<any> = command;
      for (const arg of Deno.args) {
        if (cmd.hasArguments()) break;
        cmd = cmd.getCommand(arg)!;
      }
      cmd.showHelp();
      console.log(
        "  %cerror%c: " + error.message,
        "font-weight: bold; color: red;",
        "font-weight: normal; color: red;",
        ...error instanceof CruxError ? [] : error.args,
      );
    } else {
      throw error;
    }
  }
}
