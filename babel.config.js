module.exports = function(api) {
    api.cache(true);

    const presets = [
        [
            "@babel/preset-env",
            {
                debug: false,
                targets: {
                    node: "current",
                },
            },
        ],
    ];

    return {
        babelrcRoots: [
            __dirname,
        ],
        ignore: [
            "./node_modules/*",
        ],
        presets,
        plugins: ["@babel/plugin-proposal-class-properties"]
    };
};
