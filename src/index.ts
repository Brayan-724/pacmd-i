#!/bin/env node
import { $, argv, chalk, sleep } from "zx";
import terminalKit from "terminal-kit";
// import AnimatedText from "terminal-kit/lib/document/AnimatedText.js";
const terminal = terminalKit.terminal;
$.verbose = false;

// Help handler

if (argv.help || argv.h || argv._[1]?.toLowerCase?.() === "help") {
  terminal
    .green(" Usage: ")
    .yellow("$ pacmd [command] [options]")
    .green("\n\n Commands:")
    .yellow("\n   help")
    .green("\n\n Options:")
    .yellow("\n   --help, -h : Show this help message")
    .yellow("\n   --source : Enter in source mode");
  terminal("\n\n");
  process.exit(0);
}

// Main

enum Mode {
  Sink = "sink",
  Source = "source",
}

const mode: Mode = argv.source ? Mode.Source : Mode.Sink;

// Get data
const listMode = `list-${mode}s`;
// const spinnerChars = ["│", "/", "─", "\\"];

terminal.clear();
await sleep(500);
const { stdout } = await $`pacmd ${listMode}`;

// Properties typo
enum PropertyType {
  None = "none",
  Index = "index",
  Name = "name",
  CardName = "card_name",
  Flags = "flags",
}

interface IProperty {
  type: PropertyType;
  value: string | string[];
  isActual?: boolean;
}

interface IPropertyIndex extends IProperty {
  isActual: boolean;
}

interface IDevice {
  index: number;
  name: string;
  cardName: string;
  flags: string[];
  isActual: boolean;
}

type Devices = IDevice[];

interface PropertyRegex {
  type: PropertyType;
  regex: RegExp;
}

// Regex to parse data
const indexRE = {
  type: PropertyType.Index,
  regex: /^\s*(\* )?index: (\d+)/,
};

const nameRE = {
  type: PropertyType.Name,
  regex: /name: <alsa_output.([^>]+).analog-stereo>/,
};

const cardNameRE = {
  type: PropertyType.CardName,
  regex: /alsa.card_name = "([^"]+)"/,
};

const flagsRE = {
  type: PropertyType.Flags,
  regex: /flags: ((?:[A-Z_]+\s?)*)/,
};

const allRE: PropertyRegex[] = [indexRE, nameRE, cardNameRE, flagsRE];

// Parse data
const lines = stdout.split("\n");
const data = lines
  .filter((line: string) =>
    allRE.some((prop: PropertyRegex) => prop.regex.test(line))
  )
  .map<IProperty>((line: string) => {
    type IndexResult = [null] | [string, string | undefined, string];
    type PropertyResult = [null] | [string, string];

    const [indexOut, isActual, index] = (line.match(indexRE.regex) || [
      null,
    ]) as IndexResult;
    if (indexOut !== null)
      return {
        type: PropertyType.Index,
        value: index,
        isActual: !!isActual,
      } as IPropertyIndex;

    for (const re of allRE) {
      const [reOut, value] = (line.match(re.regex) || [null]) as PropertyResult;
      if (reOut !== null)
        return {
          type: re.type,
          value,
          isActual: true,
        } as IProperty;
    }

    return {
      type: PropertyType.None,
      value: "",
    } as IProperty;
  })
  .reduce<{ dev: Devices; i: number }>(
    (acc, curr) => {
      if (curr.type === PropertyType.Index) {
        const index = parseInt(curr.value as string);
        acc.i = index;
        acc.dev[index] = {
          index,
          name: "",
          cardName: "",
          flags: [],
          isActual: !!curr.isActual,
        };
      } else if (curr.type === PropertyType.Name) {
        acc.dev[acc.i].name = curr.value as string;
      } else if (curr.type === PropertyType.CardName) {
        acc.dev[acc.i].cardName = curr.value as string;
      } else if (curr.type === PropertyType.Flags) {
        acc.dev[acc.i].flags = (curr.value as string).split(" ");
      }
      return acc;
    },
    { dev: [], i: 0 }
  ).dev;

terminal(
  data
    .map((dev: IDevice) => {
      return [
        " " +
          (dev.isActual ? chalk.green("*") : " ") +
          " " +
          dev.index +
          ": " +
          chalk.italic(dev.name),
        `     ${chalk.gray`Card:`} ${chalk.green(dev.cardName)}`,
        `     ${chalk.gray`Flags:`} ${chalk.red(dev.flags.join(" "))}`,
      ].join("\n");
    })
    .join("\n\n")
).white("\n\n");

// Ask for index
terminal.blue(`Select ${mode} index: `).gray("(q to exit)");

const e = await terminal.singleColumnMenu(
  data.map(
    (d: IDevice) =>
      `${d.isActual ? chalk.green("*") : " "} ${d.index} - ${d.name
        .replaceAll("-", " ")
        .replaceAll(".", " - ")
        .replaceAll("_", "-")}`
  ),
  {
    cancelable: true,
    keyBindings: {
      ENTER: "submit",

      UP: "previous",
      DOWN: "next",
      j: "previous",
      k: "next",

      SHIFT_TAB: "cyclePrevius",
      TAB: "cycleNext",

      HOME: "first",
      END: "last",

      q: "escape",
    },
  }
).promise;
terminal.clear();

if (e.submitted) {
  await $`pacmd set-default-${mode} ${data[e.selectedIndex].index}`;
} else {
  terminal.red("Cancelled\n");
}

process.exit(0);
