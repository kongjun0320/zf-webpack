const path = require('path');
const fs = require('fs');
const types = require('babel-types'); // 生成和判断节点的工具库
const parser = require('@babel/parser'); // 把源代码转换 AST 的编译器
const traverse = require('@babel/traverse').default;
const generator = require('@babel/generator').default;

function toUnixSeparator(filePath) {
  return filePath.replace(/\\/g, '/');
}

class Compilation {
  constructor(options) {
    this.options = options;
    // /Users/junkong/AiCherish/study-webpack/11-flow
    this.options.context =
      this.options.context || toUnixSeparator(process.cwd());
    this.fileDependencies = new Set();
    // 存放本次编译所有产生的模块
    this.modules = [];
    this.chunks = [];
    this.assets = [];
  }

  build(onCompiled) {
    // 5. 根据配置中的 entry 找出入口文件
    let entry = {};
    if (typeof this.options.entry === 'string') {
      entry.main = this.options.entry;
    } else {
      entry = this.options.entry;
    }
    // entryName: entry1
    // entry[entryName]: ./src/entry1.js
    for (const entryName in entry) {
      // 入口文件的绝对路径 /Users/junkong/AiCherish/study-webpack/11-flow/src/entry1.js
      const entryFilePath = path.posix.join(
        this.options.context,
        entry[entryName]
      );
      // 添加依赖
      this.fileDependencies.add(entryFilePath);
      // entryFilePath: /Users/junkong/AiCherish/study-webpack/11-flow/src/entry1.js
      // 入口文件的绝对路径
      const entryModule = this.buildModule(entryName, entryFilePath);
      // 8. 根据入口和模块之间的依赖关系，组装成一个个包含多个模块的 chunk
      const chunk = {
        name: entryName,
        entryModule,
        modules: this.modules.filter((m) => m.names.includes(entryName)),
      };
      this.chunks.push(chunk);
    }
    // 9. 再把每个 chunk 转换成一个单独的文件加入到输入列表
    this.chunks.forEach((chunk) => {
      const outputFilename = this.options.output.filename.replace(
        '[name]',
        chunk.name
      );
      this.assets[outputFilename] = getSourceCode(chunk);
    });

    onCompiled(
      null,
      {
        modules: this.modules,
        chunks: this.chunks,
        assets: this.assets,
      },
      this.fileDependencies
    );
  }

  /**
   * 编译模块
   * @param {*} name 文件名 entry1
   * @param {*} modulePath 文件的绝对路径 /Users/junkong/AiCherish/study-webpack/11-flow/src/entry1.js
   */
  buildModule(entryName, modulePath) {
    // 6. 从入口文件触发，调用所有配置的 Loader 对模块进行编译
    const rawSourceCode = fs.readFileSync(modulePath, 'utf-8');
    const { rules } = this.options.module;
    const loaders = rules.find((rule) => rule.test.test(modulePath)).use;
    const finalSourceCode = loaders.reduceRight((source, loaderPath) => {
      const loader = require(loaderPath);
      return loader(source);
    }, rawSourceCode);
    // 获取当前模块的模块id
    let moduleId = './' + path.posix.relative(this.options.context, modulePath);
    let module = {
      id: moduleId,
      names: [entryName],
      dependencies: new Set(),
    };
    this.modules.push(module);
    // 7. 再找出该模块依赖的模块，递归地进行编译
    const ast = parser.parse(finalSourceCode, {
      sourceType: 'module',
    });
    traverse(ast, {
      CallExpression: ({ node }) => {
        if (node.callee.name === 'require') {
          // modulePath: ./title
          const depModuleName = node.arguments[0].value;
          // /Users/junkong/AiCherish/study-webpack/11-flow/src/
          const dirName = path.posix.dirname(modulePath);
          // /Users/junkong/AiCherish/study-webpack/11-flow/src/title
          let depModulePath = path.posix.join(dirName, depModuleName);
          // 获取配置的扩展名
          let extensions = this.options.resolve.extensions;
          depModulePath = tryExtensions(depModulePath, extensions);
          // 添加依赖
          this.fileDependencies.add(depModulePath);
          // 获取此模块的 ID，也就是相对于根目录的相对路径
          let depModuleId =
            './' + path.posix.relative(this.options.context, depModulePath);
          node.arguments[0] = types.stringLiteral(depModuleId);
          // 给当前的 entry1 模块添加依赖信息
          module.dependencies.add({
            depModuleId,
            depModulePath,
          });
        }
      },
    });
    const { code } = generator(ast);
    // 转换源代码，把转换后的源码放在 _source 属性，用户后面写入文件
    module._source = code;
    // 递归编译依赖的模块
    Array.from(module.dependencies).forEach(
      ({ depModuleId, depModulePath }) => {
        const existModule = this.modules.find((m) => m.id === depModuleId);
        if (existModule) {
          existModule.names.push(entryName);
        } else {
          this.buildModule(entryName, depModulePath);
        }
      }
    );
    return module;
  }
}

function tryExtensions(modulePath, extensions) {
  // 如果此绝对路径上的文件是真实存在的，直接返回
  if (fs.existsSync(modulePath)) {
    return modulePath;
  }
  for (const extension of extensions) {
    const finalModulePath = `${modulePath}${extension}`;
    if (fs.existsSync(finalModulePath)) {
      return finalModulePath;
    }
  }
  throw new Error(`Module not found: ${modulePath}`);
}

function getSourceCode(chunk) {
  return `(() => {
    var webpackModules = {
      ${chunk.modules
        .filter((module) => module.id !== chunk.entryModule.id)
        .map(
          (module) => `'${module.id}': (module) => {
          ${module._source};
        },`
        )}
    };
    var webpackModuleCache = {};
    function webpackRequire(moduleId) {
      var cachedModule = webpackModuleCache[moduleId];
      if (cachedModule !== undefined) {
        return cachedModule.exports;
      }
      var module = (webpackModuleCache[moduleId] = {
        exports: {},
      });
      webpackModules[moduleId](module, module.exports, webpackRequire);
      return module.exports;
    }
    var webpackExports = {};
    (() => {
      ${chunk.entryModule._source}
    })();
  })();
  `;
}

module.exports = Compilation;
