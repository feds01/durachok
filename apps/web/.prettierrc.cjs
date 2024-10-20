// eslint-disable-next-line no-undef
module.exports = {
    "trailingComma": "all",
    "quoteProps": "preserve",
    "importOrderSeparation": true,
    "importOrderSortSpecifiers": true,
    "importOrder": ["^components/(.*)$", "^[@/]" ],
    // eslint-disable-next-line no-undef
    "plugins": [require.resolve("@trivago/prettier-plugin-sort-imports")],
}
