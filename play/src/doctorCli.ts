import { loadConfig } from './config';
import { createReadlineIO } from './io';
import { runDoctor } from './doctor';

const main = async (): Promise<void> => {
  const config = loadConfig(process.env);
  const io = createReadlineIO();
  const ok = await runDoctor(config, io);
  io.close();
  if (!ok) {
    process.exitCode = 1;
  }
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`fatal: ${message}`);
  process.exitCode = 1;
});
