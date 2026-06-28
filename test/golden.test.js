// 密之在线版算法黄金向量测试
// 零依赖：仅用 Node 18+ 内置的 node:test / node:assert / node:vm。
// 加载的是线上真实文件 js/md5.min.js + js/passwordz.js——改算法后跑本测试即可回归。
// 黄金向量须与 passwordz-go/passwordz-core/passwordz-core_test.go 保持一致。
//
// 运行：npm test    （等价于 node --test test/）

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const ROOT = path.join(__dirname, "..");

// passwordz.js / md5.min.js 为浏览器风格全局脚本（顶层声明挂全局、依赖全局 md5），
// 故用 vm 上下文加载，使其顶层函数进入上下文全局，而非 Node 模块作用域。
function loadAlgorithm() {
    const sb = { unescape, encodeURIComponent, decodeURIComponent }; // md5 库用到的遗留全局
    sb.window = sb;
    sb.self = sb;
    vm.createContext(sb);
    vm.runInContext(fs.readFileSync(path.join(ROOT, "js/md5.min.js"), "utf8"), sb);
    vm.runInContext(fs.readFileSync(path.join(ROOT, "js/passwordz.js"), "utf8"), sb);
    return sb;
}

const algo = loadAlgorithm();

// 黄金向量：[原始密码, 场景代码, d, l, u, p, 期望分发密码]
// 覆盖：纯数字(d)、四类全开、中文场景代码、含逃逸兜底(douyin 锁定符号兜底分支)等。
const VECTORS = [
    ["111111", "icbc",     true, false, false, false, "8024153261987848"],
    ["111111", "qq",       true, true,  true,  true,  "meh,NyBP6DRUga?r"],
    ["111111", "公司wifi", true, true,  true,  false, "Y8XanFkjtGuamy6O"],
    ["111111", "4",        true, true,  true,  true,  "5;x~VVmTq;TA(bAi"],
    ["111111", "as",       true, true,  true,  true,  "5iTgFF:C&;F^Updf"],
    ["111111", "日记",     true, true,  true,  true,  "5*b8U;O?h@$^uH(7"],
    ["111111", "douyin",   true, true,  true,  true,  "?xBTctRyyn1YKZor"],
];

test("黄金向量：password_z 与 Go core 一致", () => {
    for (const [pwd, key, d, l, u, p, expected] of VECTORS) {
        const got = algo.password_z(pwd, key, d, l, u, p);
        assert.equal(got, expected,
            `password_z(${JSON.stringify(pwd)}, ${JSON.stringify(key)}, d=${d},l=${l},u=${u},p=${p})`);
    }
});

test("输出恒为 16 位", () => {
    for (const [pwd, key, d, l, u, p] of VECTORS) {
        assert.equal(algo.password_z(pwd, key, d, l, u, p).length, 16,
            `长度不为 16：${JSON.stringify(key)}`);
    }
});

test("generate_password 强制包含数字（网站语义 d=true）", () => {
    // 即便 l/u/p 全关，generate_password 内部 d=true，等价于 password_z(...,true,false,false,false)
    assert.equal(algo.generate_password("111111", "icbc", false, false, false), "8024153261987848");
});

test("generate_password 任一输入为空时返回 undefined（防御）", () => {
    assert.equal(algo.generate_password("", "icbc", true, true, true, true), undefined);
    assert.equal(algo.generate_password("111111", "", true, true, true, true), undefined);
});
