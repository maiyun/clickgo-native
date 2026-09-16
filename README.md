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
        this.run(native.path(import.meta.url, './index.html'), {
            'frame': false,
            'icon': native.path(import.meta.url, './logo.png'),
        });
    }
}
native.launcher(new Boot());
```

`icon` supplies the native window icon on Windows and Linux. Include this file in the application's packaged files; `build.linux.icon` configures the installed application-list icon separately. When packaging through ClickGo Compiler, set `build.linux.icon` to a single square PNG of at least 256×256 pixels (512×512 or 1024×1024 is recommended). The compiler automatically generates standard Linux icon sizes in a temporary directory and cleans them up after packaging; the source image and configuration are not changed. Existing multi-size PNG directories remain supported. Also set the application's `desktopName` and `build.linux.syncDesktopName: true` to associate the running window with its desktop entry.

For frameless ClickGo applications, the first Form synchronizes its `minWidth` and `minHeight` to the native window, including subsequent changes. System close requests (such as Alt+F4) are forwarded to that Form's `close` event. Call `event.preventDefault()` synchronously before showing an asynchronous ClickGo confirmation, then close the Form after confirmation. Explicit `native.close()` and `native.quit()` are final, authorized close actions and do not repeat the confirmation. These integrations require the corresponding updated ClickGo runtime as well as ClickGo Native.

## Build a ClickGo Application as a Native Package

The application project does not need to install `electron` directly when using ClickGo Compiler to run and package it. The compiler supplies the Electron runtime. Native main-process code can use `native.getAppVersion()` to read the application's `package.json` version and `native.isPackaged()` to distinguish a packaged application from development runs. These APIs do not expose Electron to the HTML page.

Building a desktop application consists of two steps: compile the ClickGo application into a `.cga` file, then package the Native project with Electron.

Install the compiler globally first:

```sh
$ npm i -g clickgo-compiler
```

Use the following layout as a starting point. The `dist/test` directory in this repository is a complete working example.

```text
package.json
tsconfig.json
dist/
  index.ts
  index.html
  browser.ts
  app/
    app.ts
    config.json
    form/
```

The project `package.json` must use the compiled Native entry as `main`:

```json
{
    "type": "module",
    "main": "dist/index.js"
}
```

The Native page must provide the ClickGo runtime and load the compiled browser entry:

```html
<script type="importmap">
{
    "imports": {
        "clickgo": "https://js.maiyun.net/npm/clickgo@6.1.2/dist/index.js"
    }
}
</script>
<script type="module" src="browser.js"></script>
```

Compile the ClickGo application source into `dist/app.cga`:

```sh
$ npx tsc
$ clickgo --app ./dist/app --save ./dist/app
```

Load the generated application from the browser entry:

```typescript
import * as clickgo from 'clickgo';

class Boot extends clickgo.AbstractBoot {
    public async main(): Promise<void> {
        const taskId = await clickgo.task.run(this._sysId, 'app.cga', {
            'permissions': ['root'],
        });
        if (typeof taskId !== 'string') {
            throw new Error(`Load application failed (${taskId}).`);
        }
    }
}

await clickgo.launcher(new Boot());
```

Run the Native project without generating an installer:

```sh
$ clickgo --run ./dist/index.js
```

Run the following command from the directory containing `package.json` to generate a distributable package:

```sh
$ clickgo --native --platform win
$ clickgo --native --platform linux
$ clickgo --native --platform mac
```

When building the Linux `rpm` target, ensure that `rpmbuild` is installed on the build host. On Ubuntu or Debian, install it before packaging:

```sh
$ sudo apt install rpm
```

On other Linux distributions, use the system package manager to install the package that provides `rpmbuild`. This tool is required for RPM packaging, not for the AppImage or DEB targets.

When downloading Electron in mainland China, enable the mirror:

```sh
$ clickgo --native --platform win --mirror cn
```

`clickgo --app` generates the ClickGo `.cga` application, `clickgo --run` only starts the Native project for testing, and `clickgo --native` invokes Electron Builder to generate the desktop distribution. Build on the target operating system when platform-specific signing or installer tooling is required.

## Demo

Clone, build the current ClickGo test application, and run it with Electron:

```sh
$ npm i -g clickgo-compiler
$ npm run build
$ npm run native
```

## License

This library is published under [Apache-2.0](./LICENSE) license.
