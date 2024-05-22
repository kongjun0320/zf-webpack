const Compiler = require('./Compiler');

function webpack(config) {
  // 1. 初始化参数：从配置文件和 Shell 语句中读取并合并参数，得出最终的参数
  const argv = process.argv.slice(2);
  // node debug.js --mode=production
  const shellOptions = argv.reduce((iterateShellOption, currentOption) => {
    const [key, value] = currentOption.split('=');
    return { ...iterateShellOption, [key.slice(2)]: value };
  }, {});
  const finalOptions = {
    ...config,
    ...shellOptions,
  };
  // 2. 用上一步得到的参数初始化 Compiler 对象
  const compiler = new Compiler(finalOptions);
  // 3. 加载所有配置的插件
  finalOptions.plugins.forEach((plugin) => plugin.apply(compiler));

  return compiler;
}

module.exports = webpack;
