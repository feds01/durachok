module.exports = {
    root: true,
    env: { browser: false, es2020: true },
    extends: ["eslint:recommended", "plugin:@typescript-eslint/recommended"],
    ignorePatterns: ["dist", ".eslintrc.cjs"],
    parser: "@typescript-eslint/parser",
    rules: {
        "@typescript-eslint/no-unused-vars": [
            "error",
            {
                "argsIgnorePattern": "^_",
                "varsIgnorePattern": "^_",
                "caughtErrorsIgnorePattern": "^_",
            },
        ],
    },
};
