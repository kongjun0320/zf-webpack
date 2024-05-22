class RunPlugin {
  apply(compiler) {
    compiler.hooks.run.tap('RunPlugin', () => {
      console.log('run');
    });
  }
}

module.exports = RunPlugin;
