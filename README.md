# ClickGo Native

<p align="center"><img src="dist/icon.png" width="100" height="100" alt="ClickGo Native"></p>

[![npm version](https://img.shields.io/npm/v/clickgo-native.svg?colorB=brightgreen)](https://www.npmjs.com/package/clickgo-native "Stable Version")
[![npm version](https://img.shields.io/npm/v/clickgo-native/dev.svg)](https://www.npmjs.com/package/clickgo-native "Development Version")
[![npm version](https://img.shields.io/npm/v/clickgo-native/beta.svg)](https://www.npmjs.com/package/clickgo-native "Beta Version")
[![License](https://img.shields.io/github/license/maiyun/clickGo-native.svg)](https://github.com/maiyun/clickgo-native/blob/master/LICENSE)
[![GitHub issues](https://img.shields.io/github/issues/maiyun/clickgo-native.svg)](https://github.com/maiyun/clickgo-native/issues)
[![GitHub Releases](https://img.shields.io/github/release/maiyun/clickgo-native.svg)](https://github.com/maiyun/clickgo-native/releases "Stable Release")
[![GitHub Pre-Releases](https://img.shields.io/github/release/maiyun/clickgo-native/all.svg)](https://github.com/maiyun/clickgo-native/releases "Pre-Release")

The software developed with ClickGo will run in Windows, Mac OS, Linux.

## Installation

You can install directly using NPM:

```sh
$ npm i clickgo --save
```

Or install the developing (unstable) version for newest features:

```sh
$ npm i clickgo@dev --save
```

**index.html**

```html
<script src="https://cdn.jsdelivr.net/npm/@litert/loader@3.2.0/dist/loader.min.js?path=index"></script>
```

**index.js**

```typescript
import * as clickgo from 'clickgo';
async function run(): Promise<void> {
    await clickgo.init();
    await clickgo.task.run('app/');
}
```

**Node**

```typescript
import * as native from 'clickgo-native';
native.ready().then(function() {
    native.run('./index.html');
}).catch(function(e) {
    console.log(e);
});
```

## Note

ClickGo demand loading Vue, jszip, resize-observer, but **DO NOT** reference these JS and CSS files. ClickGo will automatically reference. You only need to import "clickgo" module.

## Demo

Clone and `npm run native`.

## Changelog

[Changelog](doc/CHANGELOG.md)

## License

This library is published under [Apache-2.0](./LICENSE) license.