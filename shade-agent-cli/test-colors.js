import chalk from "chalk";

console.log("\n=== Chalk Colors Test ===\n");

console.log("Basic Colors:");
console.log(`  ${chalk.black("black")} - chalk.black`);
console.log(`  ${chalk.red("red")} - chalk.red`);
console.log(`  ${chalk.green("green")} - chalk.green`);
console.log(`  ${chalk.yellow("yellow")} - chalk.yellow`);
console.log(`  ${chalk.blue("blue")} - chalk.blue`);
console.log(`  ${chalk.magenta("magenta")} - chalk.magenta`);
console.log(`  ${chalk.cyan("cyan")} - chalk.cyan`);
console.log(`  ${chalk.white("white")} - chalk.white`);
console.log(`  ${chalk.gray("gray")} - chalk.gray`);

console.log("\nModifiers:");
console.log(`  ${chalk.bold("bold")} - chalk.bold`);
console.log(`  ${chalk.dim("dim")} - chalk.dim`);
console.log(`  ${chalk.underline("underline")} - chalk.underline`);
console.log(`  ${chalk.italic("italic")} - chalk.italic`);

console.log("\nCombined:");
console.log(`  ${chalk.yellow.bold("yellow.bold")} - chalk.yellow.bold`);
console.log(`  ${chalk.cyan.bold("cyan.bold")} - chalk.cyan.bold`);
console.log(`  ${chalk.magenta.dim("magenta.dim")} - chalk.magenta.dim`);
console.log(`  ${chalk.green.dim("green.dim")} - chalk.green.dim`);
console.log(`  ${chalk.blue.dim("blue.dim")} - chalk.blue.dim`);
console.log(`  ${chalk.white.dim("white.dim")} - chalk.white.dim`);

console.log("\nJSON Arguments Examples:");
const sampleJson = JSON.stringify(
  {
    owner_id: "example.testnet",
    mpc_contract_id: "v1.signer",
    requires_tee: false,
  },
  null,
  2,
);

console.log("\nCurrent (dim):");
console.log(chalk.dim(sampleJson));

console.log("\nAlternatives:");
console.log("magenta:");
console.log(chalk.magenta(sampleJson));
console.log("\ngreen:");
console.log(chalk.green(sampleJson));
console.log("\nblue:");
console.log(chalk.blue(sampleJson));
console.log("\nwhite.dim:");
console.log(chalk.white.dim(sampleJson));
console.log("\ncyan.dim:");
console.log(chalk.cyan.dim(sampleJson));
console.log("\n");
