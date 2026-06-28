// 密之下载页渲染：读取 download/md5sum.txt，按版本渲染下载表与历史版本区块。
// md5sum.txt 每行格式: <md5>  <filename>；文件名约定：
//   CLI 包  ：passwordz-<版本>-<平台>-<架构>.{zip,tar.gz}
//   桌面包  ：passwordz-<版本>-<平台>-desktop-<架构>.{zip,tar.gz,exe,msi,dmg,deb,AppImage}
// 下载表按 kind 分「命令行版」「桌面版」两组渲染；不发版时无需改动本文件。
// 由 download.html(简中) 与 en/download.html(英) 共享，面向用户文案按 <html lang> 切换。
(function () {
    "use strict";

    // 该脚本被 download.html（站点根）与 en/download.html（en/ 子目录）共享；
    // 子目录页的下载根需多回退一层，按当前路径决定前缀（取代 en/download.html 的 <base>）。
    var DL = /\/en\//.test(location.pathname) ? "../download/" : "download/";
    var MD5_URL = DL + "md5sum.txt";
    var PLATFORM_LABEL = { windows: "Windows", darwin: "MacOS", linux: "Linux", android: "Android" };
    var PLATFORM_ORDER = ["windows", "darwin", "linux", "android"];
    // 面向用户文案（中英共用本文件，按 <html lang> 选择）
    var i18n = document.documentElement.lang === "en" ? {
        historyTitle: "Version history",
        desktopTag: "Desktop",
        loadFail: "Failed to load download list: ",
        noEntries: "md5sum.txt has no valid entries.",
        noDesktop: "Desktop version is not available for this release."
    } : {
        historyTitle: "历史版本",
        desktopTag: "桌面版",
        loadFail: "加载下载列表失败：",
        noEntries: "md5sum.txt 无有效记录。",
        noDesktop: "此版本暂未提供桌面版。"
    };
    // CLI 安装命令模板（{file} 占位；桌面版无需 curl，直接下载运行）
    var CURL_TPL = {
        darwin: "curl -O http://mi.zhitianxia.com/download/{file}\ntar -xzf {file}\nmv passwordz /usr/local/bin/passwordz",
        linux: "curl -O http://mi.zhitianxia.com/download/{file}\ntar -xzf {file}\nsudo mv passwordz /usr/local/bin/passwordz",
        android: "curl -O http://mi.zhitianxia.com/download/{file}\ntar -xzf {file}\nmv passwordz ${PATH##*:}"
    };
    // 文件名正则：可选 -desktop 段区分桌面版（缺省即 CLI）；扩展名含桌面安装包格式。
    var FILE_RE = /^passwordz-(\d+\.\d+\.\d+)-(windows|darwin|linux|android)(?:-(desktop))?-(\w+)\.(zip|tar\.gz|exe|msi|dmg|deb|AppImage)$/;

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

    // 解析 md5sum.txt -> [{md5,file,version,platform,arch,kind}]
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
            entries.push({ md5: m[1], file: file, version: fm[1], platform: fm[2], kind: fm[3] ? "desktop" : "cli", arch: fm[4] });
        });
        return entries;
    }

    // 按版本分组并降序；版本内按「平台顺序 + 架构字典序」排序 -> [{version, entries:[...]}]
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

    // 下载表：按 kind 过滤，每个包一行（平台 + 架构）
    function renderTableBody(group, kind) {
        return group.entries.filter(function (e) { return e.kind === kind; }).map(function (e) {
            return '<tr><th scope="row">' + PLATFORM_LABEL[e.platform] +
                ' <small class="text-muted">(' + esc(e.arch) + ')</small></th>' +
                '<td><a href="' + DL + encodeURIComponent(e.file) + '">' + esc(e.file) + '</a></td>' +
                '<td><code>' + esc(e.md5) + '</code></td></tr>';
        }).join("");
    }

    // 历史版本区块（cli 与 desktop 混排，桌面条目标注徽标；用中性标点，中英通顺）
    function renderHistory(history) {
        return history.map(function (rel) {
            var lis = rel.entries.map(function (e) {
                var tag = e.kind === "desktop" ? ' <span class="badge bg-secondary">' + i18n.desktopTag + '</span>' : '';
                return '<li>' + PLATFORM_LABEL[e.platform] + ' (' + esc(e.arch) + ')' + tag +
                    ' &mdash; <a href="' + DL + encodeURIComponent(e.file) + '">' + esc(e.file) + '</a>' +
                    ' (md5: <code>' + esc(e.md5) + '</code>)</li>';
            }).join("");
            return '<h5 class="mt-3">' + i18n.historyTitle + ' v' + esc(rel.version) + '</h5><ul class="small">' + lis + '</ul>';
        }).join("");
    }

    // 回填 CLI 安装说明：仅取 cli 条目（桌面版直接下载运行，无需 curl 命令）。
    function fillInstall(latest) {
        var byPlatform = {};
        latest.entries.filter(function (e) { return e.kind === "cli"; }).forEach(function (e) {
            if (!byPlatform[e.platform]) byPlatform[e.platform] = e;
        });
        Array.prototype.forEach.call(document.querySelectorAll("[data-file]"), function (el) {
            var e = byPlatform[el.getAttribute("data-file")];
            if (e) el.setAttribute("href", DL + e.file);
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
        if (t) t.innerHTML = '<tr><td colspan="3" class="text-danger">' + esc(i18n.loadFail) + esc(msg) + '</td></tr>';
    }

    // cache:"no-cache" 强制向服务器重新验证，避免发版后浏览器仍读到旧的 md5sum.txt
    fetch(MD5_URL, { cache: "no-cache" }).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.text();
    }).then(function (text) {
        var entries = parse(text);
        if (entries.length === 0) { fail(i18n.noEntries); return; }
        var versions = groupByVer(entries);
        var latest = versions[0];
        var tb = document.getElementById("download-table");
        if (tb) tb.innerHTML = renderTableBody(latest, "cli");
        var dtb = document.getElementById("desktop-table");
        if (dtb) {
            var rows = renderTableBody(latest, "desktop");
            // 最新版若无桌面包，显示提示而非空表
            dtb.innerHTML = rows || '<tr><td colspan="3" class="text-muted">' + i18n.noDesktop + '</td></tr>';
        }
        var hist = document.getElementById("history");
        if (hist) hist.innerHTML = renderHistory(versions.slice(1));
        fillInstall(latest);
    }).catch(function (err) {
        fail(err.message || String(err));
    });
})();
