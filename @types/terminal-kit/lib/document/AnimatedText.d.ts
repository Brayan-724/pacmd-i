declare module 'terminal-kit/lib/document/AnimatedText.js' {
  export interface AnimatedTextOptions {
    animation?: string;
  }

  export default class AnimatedText {
    constructor(options?: AnimatedTextOptions);
    animate(animationSpeed?: number): void;
    autoUpdate(): void;
  }
}