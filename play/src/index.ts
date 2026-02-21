import { loadConfig } from './config';
import { runDoctor } from './doctor';
import { createLiveConnect } from './geminiLiveClient';
import { createReadlineIO } from './io';
import { runLiveTextApp } from './liveTextApp';

const main = async (): Promise<void> => {
  const config = loadConfig(process.env);
  const io = createReadlineIO();
  const connect = createLiveConnect();
  const skipDoctor = process.env.SKIP_DOCTOR === '1';
  const isDiagnosticOk = skipDoctor ? true : await runDoctor(config, io);

  if (skipDoctor) {
    io.print('doctor: SKIPPED (SKIP_DOCTOR=1)');
  }

  if (!isDiagnosticOk) {
    io.printError('Live API を開始できません。まず `bun run doctor` の結果を解消してください。');
    io.close();
    process.exitCode = 1;
    return;
  }

  await runLiveTextApp(config, { connect, io });
};

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : 'Unknown error';
  console.error(`fatal: ${message}`);
  process.exitCode = 1;
});
