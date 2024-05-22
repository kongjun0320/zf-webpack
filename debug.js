const fs = require('fs');

debugger;
const webpack = require('./webpack');

const config = require('./webpack.config.js');

const compiler = webpack(config);

compiler.run((error, stats) => {
  if (error) {
    console.error(error);
    return;
  }
  const json = stats.toJson({
    modules: true,
    chunks: true,
    assets: true,
  });
  fs.writeFileSync('./debug1.json', JSON.stringify(json, null, 2));
});
