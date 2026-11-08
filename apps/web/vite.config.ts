import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

/** The server that the dev server and the preview pass the API and the sockets on to. */
const API_TARGET = process.env.API_TARGET ?? "http://localhost:8080";

const proxy = {
    "/api": { target: API_TARGET, changeOrigin: true },
    "/socket.io": { target: API_TARGET, changeOrigin: true, ws: true },
};

const allowedHosts = [
    /*
     * A Cloudflare quick tunnel (`cloudflared tunnel --url http://localhost:5173`) or an ngrok one
     * (`ngrok http 5173`) lets a friend play against a server on this machine, from an address
     * that Vite would otherwise refuse.
     * */
    ".trycloudflare.com",

    /*
     * Ngrok's domains for free accounts, then for paid ones, then its older one.
     */
    ".ngrok-free.app",
    ".ngrok-free.dev",
    ".ngrok.app",
    ".ngrok.dev",
    ".ngrok.io",
];

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [svgr(), tanstackRouter(), tailwindcss(), react()],
    // The app's settings are `REACT_APP_` variables, see `.env.sample`.
    envPrefix: ["VITE_", "REACT_APP_"],
    resolve: {
        tsconfigPaths: true,
    },
    server: { proxy, allowedHosts },
    preview: { proxy, allowedHosts },
});
