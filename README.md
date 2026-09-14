# ClickGo Native

<p align="center"><img src="./dist/icon.png" width="100" height="100" alt="ClickGo Native"></p>
<p align="center">
    <a href="https://github.com/maiyun/clickgo-native/blob/master/LICENSE">
        <img alt="License" src="https://img.shields.io/github/license/maiyun/clickgo-native?color=blue" />
    </a>
    <a href="https://www.npmjs.com/package/clickgo-native">
        <img alt="NPM stable version" src="https://img.shields.io/npm/v/clickgo-native?color=brightgreen&logo=npm" />
    </a>
    <a href="https://github.com/maiyun/clickgo-native/releases">
        <img alt="GitHub releases" src="https://img.shields.io/github/v/release/maiyun/clickgo-native?color=brightgreen&logo=github" />
    </a>
    <a href="https://github.com/maiyun/clickgo-native/issues">
        <img alt="GitHub issues" src="https://img.shields.io/github/issues/maiyun/clickgo-native?color=blue&logo=github" />
    </a>
</p>

The software developed with ClickGo will run in Windows, Mac OS, Linux.

## Installation

You can install directly using NPM:

```sh
$ npm i clickgo-native --save
```

**Node**

```typescript
import * as native from 'clickgo-native';
class Boot extends native.AbstractBoot {
    public main(): void {
        this.run('./index.html');
    }
}
native.launcher(new Boot());
```

## Demo

Clone and `npm run native`.

## License

This library is published under [Apache-2.0](./LICENSE) license.