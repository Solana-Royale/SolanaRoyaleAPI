import chalk from "chalk";

export function info(args, ...args2) {
  if (args2 == null) {
    console.log(
      chalk.magentaBright(
        new Date().toISOString().replace(/T/, " ").replace(/\..+/, "")
      ) +
        chalk.cyan(" :: INFO :: ") +
        chalk.green(`${args}`)
    );
  } else {
    console.log(
      chalk.magentaBright(
        new Date().toISOString().replace(/T/, " ").replace(/\..+/, "")
      ) +
        chalk.cyan(" :: INFO :: ") +
        chalk.green(`${args}`),
      chalk.blueBright(`${args2.join(" ")}`)
    );
  }
}

export function error(args) {
  console.log(
    chalk.magentaBright(
      new Date().toISOString().replace(/T/, " ").replace(/\..+/, "")
    ),
    chalk.red(" :: ERROR :: "),
    chalk.yellow(`${args}`)
  );
}
