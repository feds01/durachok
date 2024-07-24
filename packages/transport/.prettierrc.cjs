module.exports = {
  "trailingComma": "all",
  "quoteProps": "preserve",
  "importOrderSeparation": true,
  "importOrderSortSpecifiers": true,
  "importOrder": ["^components/(.*)$", "^[./]"],
  "plugins": [require.resolve("@trivago/prettier-plugin-sort-imports")],
};
