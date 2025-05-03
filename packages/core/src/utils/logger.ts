// ANSI color codes
const colors = {
  reset: "\x1b[0m",
  bright: "\x1b[1m",
  dim: "\x1b[2m",
  underscore: "\x1b[4m",
  blink: "\x1b[5m",
  reverse: "\x1b[7m",
  hidden: "\x1b[8m",

  // Foreground colors
  fg: {
    black: "\x1b[30m",
    red: "\x1b[31m",
    green: "\x1b[32m",
    yellow: "\x1b[33m",
    blue: "\x1b[34m",
    magenta: "\x1b[35m",
    cyan: "\x1b[36m",
    white: "\x1b[37m",
  },
  // Background colors
  bg: {
    black: "\x1b[40m",
    red: "\x1b[41m",
    green: "\x1b[42m",
    yellow: "\x1b[43m",
    blue: "\x1b[44m",
    magenta: "\x1b[45m",
    cyan: "\x1b[46m",
    white: "\x1b[47m",
  },
};

// Helper to process template strings with color tags
const processMessage = (message: string, color: string): string => {
  // Split the message into parts around color tags
  const parts = message.split(/(<[^>]+>[^<]+<\/[^>]+>)/g);

  // Process each part
  return parts
    .map((part) => {
      if (part.startsWith("<") && part.endsWith(">")) {
        // Extract the color and value from <color>value</color>
        const match = part.match(/<([^>]+)>([^<]+)<\/[^>]+>/);
        if (match) {
          const [_, tag, value] = match;
          switch (tag.toLowerCase()) {
            case "cyan":
              return `${colors.fg.cyan}${value}${colors.reset}${color}`;
            case "red":
              return `${colors.fg.red}${value}${colors.reset}${color}`;
            case "blue":
              return `${colors.bright}${colors.fg.blue}${value}${colors.reset}${color}`;
            // Add more color cases here in the future
            default:
              return value;
          }
        }
      }
      return part;
    })
    .join("");
};

export const logger = {
  // Success paths - Green
  success: (message: string, ...args: any[]) => {
    const processedMessage = processMessage(message, colors.fg.green);
    console.debug(
      `${colors.fg.green}${processedMessage}${colors.reset}`,
      ...args
    );
  },

  // Error paths - Red
  error: (message: string, ...args: any[]) => {
    const processedMessage = processMessage(message, colors.fg.red);
    console.error(
      `${colors.fg.red}${processedMessage}${colors.reset}`,
      ...args
    );
  },

  // Warning paths - Yellow
  warn: (message: string, ...args: any[]) => {
    const processedMessage = processMessage(message, colors.fg.yellow);
    console.warn(
      `${colors.fg.yellow}${processedMessage}${colors.reset}`,
      ...args
    );
  },

  // Info paths - Blue
  info: (message: string, ...args: any[]) => {
    const processedMessage = processMessage(message, colors.fg.blue);
    console.info(
      `${colors.fg.blue}${processedMessage}${colors.reset}`,
      ...args
    );
  },

  // Debug paths - Magenta
  debug: (message: string, ...args: any[]) => {
    const processedMessage = processMessage(message, colors.fg.magenta);
    console.debug(
      `${colors.fg.magenta}${processedMessage}${colors.reset}`,
      ...args
    );
  },

  // Variable values - Cyan
  variable: (name: string, value: any) => {
    console.debug(`${colors.fg.cyan}${name}: ${value}${colors.reset}`);
  },

  // Helper for cyan values
  cyan: (value: any): string => {
    return `<cyan>${value}</cyan>`;
  },

  // Helper for red values
  red: (value: any): string => {
    return `<red>${value}</red>`;
  },

  // Helper for blue values
  blue: (value: any): string => {
    return `<blue>${value}</blue>`;
  },
};
