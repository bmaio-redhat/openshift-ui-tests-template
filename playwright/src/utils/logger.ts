export const logger = {
  info: (message: string): void => {
    process.stdout.write(`${message}\n`);
  },
  error: (message: string): void => {
    process.stderr.write(`${message}\n`);
  },
  warn: (message: string): void => {
    process.stderr.write(`⚠️  ${message}\n`);
  },
  success: (message: string): void => {
    process.stdout.write(`✅ ${message}\n`);
  },
};
