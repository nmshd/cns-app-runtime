const path = require("path")
const webpack = require("webpack")

module.exports = {
    // Change to your "entry-point".
    mode: "development",
    node: {
        global: false
    },
    entry: "./dist-test/index",
    output: {
        path: path.resolve(__dirname, "lib-web"),
        filename: "nmshd.app-runtime.test.js",
        library: "NMSHDAppRuntimeTest",
        umdNamedDefine: true
    },
    resolve: {
        extensions: [".js", ".json"],
        alias: {
            src: path.resolve(__dirname, "tmp-browser/src/")
        }
    },
    devtool: "source-map",
    externals: {
        chai: "chai",
        lokijs: "loki",
        agentkeepalive: "NMSHDTransport",
        process: "NMSHDTransport",
        path: "NMSHDTransport",
        assert: "NMSHDTransport",
        util: "NMSHDTransport",
        "fs-extra": "NMSHDTransport",
        fs: "NMSHDTransport",
        sap: "sap",
        "graceful-fs": "NMSHDTransport",
        "@nmshd/app-runtime": "NMSHDAppRuntime",
        "@nmshd/consumption": "NMSHDConsumption",
        "@nmshd/content": "NMSHDContent",
        "@nmshd/transport": "NMSHDTransport",
        "@nmshd/crypto": "NMSHDCrypto",
        "@nmshd/runtime": "NMSHDRuntime",
        "@js-soft/ts-serval": "TSServal"
    }
}
