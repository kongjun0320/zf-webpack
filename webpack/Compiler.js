const fs = require('fs');
const path = require('path');
const { SyncHook } = require('tapable');
const Compilation = require('./Compilation');

class Compiler {
  constructor(options) {
    this.options = options;
    this.hooks = {
      run: new SyncHook(),
      done: new SyncHook(),
    };
  }

  // 4. 执行对象的 run 方法开始执行编译
  run(callback) {
    this.hooks.run.call();
    const onCompiled = (error, stats, fileDependencies) => {
      // 10. 在确定好输出内容后，根据配置确定输出的路径和文件名，把文件内容写入到文件系统
      const { assets } = stats;
      for (const filename in assets) {
        let filePath = path.posix.join(this.options.output.path, filename);
        fs.writeFileSync(filePath, assets[filename], 'utf-8');
      }
      callback(error, {
        toJson: () => stats,
      });
      Array.from(fileDependencies).forEach((file) => {
        // 监听依赖的文件变化
        fs.watch(file, () => {
          this.compile(onCompiled);
        });
      });
    };
    // 编译过程，开始一次新的编译
    this.compile(onCompiled);

    this.hooks.done.call();
  }

  compile(onCompiled) {
    const compilation = new Compilation(this.options);
    compilation.build(onCompiled);
  }
}

module.exports = Compiler;
