import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import svgr from "vite-plugin-svgr";
import tailwindcss from "@tailwindcss/vite";
import { tanstackRouter } from "@tanstack/router-plugin/vite";

// https://vitejs.dev/config/
export default defineConfig({
    plugins: [svgr(), tanstackRouter(), tailwindcss(), react()],
    // The app's settings are `REACT_APP_` variables, see `.env.sample`.
    envPrefix: ["VITE_", "REACT_APP_"],
    resolve: {
        tsconfigPaths: true,
    },
});
