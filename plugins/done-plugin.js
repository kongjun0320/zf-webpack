class DonePlugin {
  apply(compiler) {
    compiler.hooks.done.tap('DonePlugin', () => {
      console.log('done');
    });
  }
}

module.exports = DonePlugin;
