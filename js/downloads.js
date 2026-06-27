// 密之下载页渲染：读取 download/md5sum.txt，按版本渲染下载表与历史版本区块。
// md5sum.txt 每行格式: <md5>  <filename>；文件名 passwordz-<版本>-<平台>-<架构>.<ext>
// 下载表按「文件」逐条渲染（平台+架构），天然支持同一平台的多个架构包（如 darwin-amd64 与 darwin-arm64）。
// 由 download.html 与 en/download.html 共享；不发版时无需改动本文件。
(function () {
    "use strict";

    var MD5_URL = "download/md5sum.txt";
    var PLATFORM_LABEL = { windows: "Windows", darwin: "MacOS", linux: "Linux", android: "Android" };
    var PLATFORM_ORDER = ["windows", "darwin", "linux", "android"];
    // 各平台安装 curl/解压命令模板（{file} 占位；windows 为解压运行 exe，无需 curl）
    var CURL_TPL = {
        darwin: "curl -O http://mi.zhitianxia.com/download/{file}\ntar -xzf {file}\nmv passwordz /usr/local/bin/passwordz",
        linux: "curl -O http://mi.zhitianxia.com/download/{file}\ntar -xzf {file}\nsudo mv passwordz /usr/local/bin/passwordz",
        android: "curl -O http://mi.zhitianxia.com/download/{file}\ntar -xzf {file}\nmv passwordz ${PATH##*:}"
    };
    var FILE_RE = /^passwordz-(\d+\.\d+\.\d+)-(windows|darwin|linux|android)-(\w+)\.(zip|tar\.gz)$/;

    // 平台顺序索引，用于条目排序
    var platformIdx = {};
    PLATFORM_ORDER.forEach(function (p, i) { platformIdx[p] = i; });

    function cmpVer(a, b) {
        var pa = a.split(".").map(Number), pb = b.split(".").map(Number);
        for (var i = 0; i < 3; i++) {
            if (pa[i] !== pb[i]) return pa[i] - pb[i];
        }
        return 0;
    }

    function esc(s) {
        return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // 解析 md5sum.txt -> [{md5,file,version,platform,arch}]
    function parse(text) {
        var entries = [];
        text.split(/\r?\n/).forEach(function (line) {
            line = line.trim();
            if (!line) return;
            var m = line.match(/^([0-9a-fA-F]+)\s+\*?(.+)$/);
            if (!m) return;
            var file = m[2].trim();
            var fm = file.match(FILE_RE);
            if (!fm) return;
            entries.push({ md5: m[1], file: file, version: fm[1], platform: fm[2], arch: fm[3] });
        });
        return entries;
    }

    // 按版本分组并降序；版本内按「平台顺序 + 架构字典序」排序 -> [{version, entries:[...]}]
    // 注意：用 entries 数组而非以 platform 为 key，避免同平台多架构互相覆盖。
    function groupByVer(entries) {
        var map = {};
        entries.forEach(function (e) {
            (map[e.version] = map[e.version] || []).push(e);
        });
        return Object.keys(map)
            .sort(function (a, b) { return cmpVer(b, a); })
            .map(function (v) {
                var es = map[v].sort(function (a, b) {
                    var pi = platformIdx[a.platform] - platformIdx[b.platform];
                    return pi !== 0 ? pi : (a.arch < b.arch ? -1 : a.arch > b.arch ? 1 : 0);
                });
                return { version: v, entries: es };
            });
    }

    // 最新版主下载表：每个包一行（平台 + 架构），无 size 列
    function renderTableBody(latest) {
        return latest.entries.map(function (e) {
            return '<tr><th scope="row">' + PLATFORM_LABEL[e.platform] +
                ' <small class="text-muted">(' + esc(e.arch) + ')</small></th>' +
                '<td><a href="download/' + encodeURIComponent(e.file) + '">' + esc(e.file) + '</a></td>' +
                '<td><code>' + esc(e.md5) + '</code></td></tr>';
        }).join("");
    }

    // 历史版本区块
    function renderHistory(history) {
        return history.map(function (rel) {
            var lis = rel.entries.map(function (e) {
                return '<li>' + PLATFORM_LABEL[e.platform] + ' (' + esc(e.arch) + ')：<a href="download/' +
                    encodeURIComponent(e.file) + '">' + esc(e.file) + '</a>（md5：<code>' + esc(e.md5) + '</code>）</li>';
            }).join("");
            return '<h5 class="mt-3">历史版本 v' + esc(rel.version) + '</h5><ul class="small">' + lis + '</ul>';
        }).join("");
    }

    // 回填安装说明：每平台取首个架构包作为安装示例（多架构时取排序靠前者）
    function fillInstall(latest) {
        var byPlatform = {};
        latest.entries.forEach(function (e) {
            if (!byPlatform[e.platform]) byPlatform[e.platform] = e;
        });
        Array.prototype.forEach.call(document.querySelectorAll("[data-file]"), function (el) {
            var e = byPlatform[el.getAttribute("data-file")];
            if (e) el.setAttribute("href", "download/" + e.file);
        });
        Array.prototype.forEach.call(document.querySelectorAll("[data-curl]"), function (el) {
            var p = el.getAttribute("data-curl");
            var e = byPlatform[p];
            if (e && CURL_TPL[p]) el.textContent = CURL_TPL[p].replace(/\{file\}/g, e.file);
        });
        Array.prototype.forEach.call(document.querySelectorAll("[data-version]"), function (el) {
            el.textContent = latest.version;
        });
    }

    function fail(msg) {
        var t = document.getElementById("download-table");
        if (t) t.innerHTML = '<tr><td colspan="3" class="text-danger">加载下载列表失败：' + esc(msg) + '</td></tr>';
    }

    // cache:"no-cache" 强制向服务器重新验证，避免发版后浏览器仍读到旧的 md5sum.txt
    fetch(MD5_URL, { cache: "no-cache" }).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
    }).then(function (text) {
        var entries = parse(text);
        if (entries.length === 0) { fail("md5sum.txt 无有效记录"); return; }
        var versions = groupByVer(entries);
        var latest = versions[0];
        var tb = document.getElementById("download-table");
        if (tb) tb.innerHTML = renderTableBody(latest);
        var hist = document.getElementById("history");
        if (hist) hist.innerHTML = renderHistory(versions.slice(1));
        fillInstall(latest);
    }).catch(function (err) {
        fail(err.message || String(err));
    });
})();
