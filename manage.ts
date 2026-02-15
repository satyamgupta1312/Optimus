#!/usr/bin/env -S npx tsx
import { execSync } from 'child_process';
import { readFileSync, writeFileSync, existsSync } from 'fs';
import path from 'path';

const APP_NAME = 'optimus';
const PORT = 9999;
const PM2_CMD = 'pm2';

const commands: Record<string, () => void> = {
    start: () => {
        console.log(`Starting ${APP_NAME} on port ${PORT}...`);
        try {
            // Check if already running
            execSync(`${PM2_CMD} describe ${APP_NAME}`, { stdio: 'ignore' });
            console.log(`${APP_NAME} is already running. Restarting...`);
            commands.restart();
        } catch (e) {
            // Not running, start it
            // We use 'npm run preview' to serve the production build, or 'npm run dev' for dev
            // 'preview' is better for "deployment" style running.
            // Executing: pm2 start npm --name "optimus" -- run dev
            execSync(`${PM2_CMD} start npm --name "${APP_NAME}" -- run dev`, { stdio: 'inherit' });
            console.log(`Started successfully.`);
        }
    },
    kill: () => {
        console.log(`Stopping ${APP_NAME}...`);
        try {
            execSync(`${PM2_CMD} delete ${APP_NAME}`, { stdio: 'inherit' });
            console.log(`Stopped successfully.`);
        } catch (e) {
            console.log(`${APP_NAME} was not running.`);
        }
    },
    restart: () => {
        console.log(`Restarting ${APP_NAME}...`);
        try {
            execSync(`${PM2_CMD} restart ${APP_NAME}`, { stdio: 'inherit' });
            console.log(`Restarted successfully.`);
        } catch (e) {
            console.error(`Failed to restart. Is the app running? Try 'start' instead.`);
        }
    },
    status: () => {
        try {
            execSync(`${PM2_CMD} list`, { stdio: 'inherit' });
        } catch (e) {
            console.error("Error executing pm2 list");
        }
    },
    help: () => {
        console.log(`
Usage: npm run manage <command>

Commands:
  start    Start the application using PM2 (runs 'vite preview' on port ${PORT})
  kill     Stop and delete the PM2 process
  restart  Restart the PM2 process
  status   Show PM2 status
  help     Show this help message
`);
    }
};

const args = process.argv.slice(2);
const command = args[0] || 'help';

if (commands[command]) {
    commands[command]();
} else {
    console.error(`Unknown command: ${command}`);
    commands.help();
    process.exit(1);
}
