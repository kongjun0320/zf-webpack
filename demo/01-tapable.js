// const { SyncHook } = require('tapable');

class SyncHook {
  constructor() {
    this.hooks = [];
  }

  tap(name, fn) {
    this.hooks.push(fn);
  }

  call() {
    this.hooks.forEach((hook) => hook());
  }
}

const hook = new SyncHook();

// 插件形式触发
class SomePlugin {
  apply() {
    hook.tap('1', () => {
      console.log(1);
    });

    hook.tap('2', () => {
      console.log(2);
    });

    hook.tap('3', () => {
      console.log(3);
    });
  }
}

const plugin = new SomePlugin();
// 订阅
plugin.apply();
// 触发
hook.call();
