#!/bin/env node
import { $, argv, chalk, sleep } from "zx";
import terminalKit from "terminal-kit";
import { PropertyRegex } from "./PropertyRegex";
import { Property } from "./Property";
import { PropertyType } from "./PropertyType";
import { PropertiesRegex } from "./PropetiesRegex";
import { Device } from "./Device";
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

async function main() {
  enum Mode {
    Sink = "sink",
    Source = "source",
  }
  terminal.clear();

  const mode: Mode = argv.source || argv.s ? Mode.Source : Mode.Sink;

  // Get data
  const listMode = `list-${mode}s`;
  // const spinnerChars = ["│", "/", "─", "\\"];

  await sleep(500);
  const { stdout } = await $`pacmd ${listMode}`;

  // Regex to parse data
  const allRE = new PropertiesRegex([
    new PropertyRegex<PropertyType.Index, [string, string | undefined, string]>(
      PropertyType.Index,
      /^\s*(\* )?index: (\d+)/
    ),
    new PropertyRegex(
      PropertyType.Name,
      /name: <alsa_(?:in|out)put.([^>]+).analog-stereo>/
    ),
    new PropertyRegex(PropertyType.CardName, /alsa.card_name = "([^"]+)"/),
    new PropertyRegex(PropertyType.Flags, /flags: ((?:[A-Z_]+\s?)*)/),
  ]);

  // Parse data
  const lines = stdout.split("\n");
  const data = lines
    .filter((line: string) => allRE.test(line))
    .map<Property>((line: string) => {
      for (const re of allRE.list) {
        const v = re.generate(line);
        if (v !== null) return v;
      }

      return Property.none;
    })
    .reduce<{ dev: Device[]; i: number }>(
      (acc, curr) => {
        if (curr.type === PropertyType.Index) {
          const index = parseInt(curr.value as string);
          acc.i = index;
          acc.dev[index] = new Device({
            index,
            isActual: curr.isActual,
          });
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
      .map((dev: Device) => {
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
      (d: Device) =>
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
}

main();
