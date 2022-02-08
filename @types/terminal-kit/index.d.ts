import AnimatedText, {
  AnimatedTextOptions,
} from "terminal-kit/lib/document/AnimatedText.js";
import { Terminal as _Terminal } from "../../node_modules/@types/terminal-kit/index";

declare module "terminal-kit" {
  export class CustomTerminal extends _Terminal {
    spinner(): AnimatedText;
    spinner(animation: string): AnimatedText;
    spinner(options: AnimatedTextOptions): AnimatedText;
  }

  export const terminal: CustomTerminal;
}
