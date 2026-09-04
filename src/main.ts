import { createApp } from "./app/create-app";
import { loadConfig } from "./app/config";

async function main(): Promise<void> {
    const config = loadConfig();
    const app = await createApp(config);

    try {
        await app.listen({ host: config.host, port: config.port });
        console.log(`World Flipper server is listening on http://${config.host}:${config.port}`);
    } catch (error) {
        app.log.error(error);
        process.exitCode = 1;
    }
}

void main();
