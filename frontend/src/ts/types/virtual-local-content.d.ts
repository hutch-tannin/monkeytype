declare module "virtual:local-content" {
  /** gitignored local content present when the app was built */
  export const localContent: {
    languages: string[];
    quotes: string[];
    kalinkaFiles: string[];
  };
}
