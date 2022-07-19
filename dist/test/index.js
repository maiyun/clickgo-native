"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const native = require("../index");
native.ready().then(function () {
    native.run('./index.html');
}).catch(function (e) {
    console.log(e);
});
