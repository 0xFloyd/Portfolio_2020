const path = require("path");

module.exports = {
  entry: {
    app: ["@babel/polyfill", "./src/app.js"],
  },
  output: {
    path: path.resolve(__dirname, "build"),
    filename: "app.bundle.js",
  },
  module: {
    rules: [
      {
        test: /\.js?$/,
        exclude: /node_modules/,
        loader: "babel-loader",
        query: {
          presets: ["@babel/preset-env"],
        },
      },
    ],
  },
  devServer: {
    contentBase: path.join(__dirname, ""),
    compress: true,
    watchContentBase: true,
    port: 8080,
    host: "0.0.0.0", //your ip address
    disableHostCheck: true, //coment these out for prod
  },
  node: {
    fs: "empty",
  },
};
