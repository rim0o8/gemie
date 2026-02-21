import readline from 'node:readline';
import type { UserIO } from './types';

export const createReadlineIO = (): UserIO => {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: true,
  });

  return {
    onLine: (handler) => {
      rl.on('line', (line) => {
        void handler(line);
      });
    },
    print: (message) => {
      console.log(message);
    },
    printError: (message) => {
      console.error(message);
    },
    close: () => {
      rl.close();
    },
  };
};
