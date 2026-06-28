// 密之 PasswordZ 在线版交互层。
// 注意：算法（zhi_hash / password_z / generate_password）定义在 passwordz.js，本文件不触碰算法逻辑。
// 结果密码采用「纯 CSS 视觉分组」：4 组 <span> 之间靠 flex gap 拉开，不插入任何分隔字符，
// 故用户选中拖蓝 Ctrl+C、或照屏誊抄，得到的都是 16 位无空格纯密码。

(function () {
    "use strict";

    var EN = document.documentElement.lang === "en";
    var I18N = EN ? {
        emptyHint: "Please enter both the original password and the scene code.",
        copy: "copy",
        copied: "copied",
        copyFail: "Copy failed — please select and copy manually.",
        strength: { weak: "Weak", mid: "Fair", strong: "Strong" },
        placehold: "················"
    } : {
        emptyHint: "请输入原始密码和场景代码。",
        copy: "复制",
        copied: "已复制",
        copyFail: "复制失败，请手动选中复制。",
        strength: { weak: "弱", mid: "中", strong: "强" },
        placehold: "················"
    };

    // 符号集来自 passwordz.js 导出的 PZ_PUNCTUATION（单一来源，避免重复定义）

    var currentPassword = "";

    function $(id) { return document.getElementById(id); }

    function esc(s) {
        return String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
    }

    // 字符集容量（数字恒开），用于估算强度
    function charsetSize(l, u, p) {
        var n = 10; // digit 始终包含
        if (l) n += 26;
        if (u) n += 26;
        if (p) n += PZ_PUNCTUATION.length;
        return n;
    }

    // 渲染分组密码：每 4 位一个 <span class="pz-grp">，组间靠 CSS gap 呈现，不插字符
    function renderCode(pwd) {
        var el = $("pzCode");
        if (!el) return;
        if (!pwd) {
            el.innerHTML = '<span class="pz-code-ph">' + I18N.placehold + '</span>';
            return;
        }
        var html = "";
        for (var i = 0; i < pwd.length; i += 4) {
            html += '<span class="pz-grp">' + esc(pwd.slice(i, i + 4)) + '</span>';
        }
        el.innerHTML = html;
    }

    // 强度估算：熵 bits = 16 * log2(charsetSize)
    function renderStrength(l, u, p) {
        var box = $("pzStrength");
        var fill = $("pzStrengthFill");
        var label = $("pzStrengthLabel");
        var bits = 16 * Math.log2(charsetSize(l, u, p));
        var level = bits < 60 ? "weak" : (bits <= 80 ? "mid" : "strong");
        var pct = Math.max(6, Math.min(100, Math.round(bits / 110 * 100)));
        box.className = "pz-strength " + level;
        box.hidden = false;
        fill.style.width = pct + "%";
        label.textContent = I18N.strength[level] + " · " + Math.round(bits) + " bit";
    }

    function clearResult() {
        currentPassword = "";
        var code = $("code");
        if (code) code.value = "";
        renderCode("");
        var r = $("pzResult");
        if (r) r.classList.add("is-empty");
        var s = $("pzStrength");
        if (s) s.hidden = true;
        var hint = $("pzHint");
        if (hint) { hint.className = "pz-hint"; hint.textContent = ""; }
        resetCopyText();
    }

    function resetCopyText() {
        var btn = $("btn_copy");
        if (btn) btn.classList.remove("copied");
        var t = $("copyText");
        if (t) t.textContent = I18N.copy;
    }

    function doGenerate() {
        var pwd = $("originPassword").value;
        var key = $("sceneCode").value;
        var l = $("lowerCheck").checked;
        var u = $("upperCheck").checked;
        var p = $("punctuationCheck").checked;
        var hint = $("pzHint");

        // 空输入：给出明确提示，不静默返回
        if (!pwd || !key) {
            clearResult();
            if (hint) { hint.className = "pz-hint error"; hint.textContent = I18N.emptyHint; }
            return;
        }

        var zhi = generate_password(pwd, key, l, u, p);
        if (!zhi) { return; } // 理论上不会走到（pwd/key 非空必返回）

        currentPassword = zhi;
        var code = $("code");
        if (code) code.value = zhi; // 隐藏降级源，持纯值
        renderCode(zhi);
        var r = $("pzResult");
        if (r) r.classList.remove("is-empty");
        renderStrength(l, u, p);
        if (hint) { hint.className = "pz-hint"; hint.textContent = ""; }
        resetCopyText();
    }

    // 复制：优先原生 API，降级 execCommand；始终写入纯 16 位
    function copyToClipboard(text) {
        if (navigator.clipboard && navigator.clipboard.writeText) {
            return navigator.clipboard.writeText(text);
        }
        return new Promise(function (resolve, reject) {
            var ta = document.createElement("textarea");
            ta.value = text;
            ta.setAttribute("readonly", "");
            ta.style.position = "absolute";
            ta.style.left = "-9999px";
            document.body.appendChild(ta);
            ta.select();
            try { document.execCommand("copy"); resolve(); }
            catch (e) { reject(e); }
            document.body.removeChild(ta);
        });
    }

    // ---- 绑定 ----
    $("btn_generate").onclick = doGenerate;

    // 回车生成（表单本身不提交）
    ["originPassword", "sceneCode"].forEach(function (id) {
        var el = $(id);
        if (el) el.addEventListener("keydown", function (e) {
            if (e.key === "Enter" || e.keyCode === 13) { e.preventDefault(); doGenerate(); }
        });
    });

    // 输入变化即清空旧结果，防止误用上一个密码
    ["originPassword", "sceneCode"].forEach(function (id) {
        var el = $(id);
        if (el) el.addEventListener("input", function () {
            if (currentPassword) clearResult();
        });
    });

    // 字符集开关变化即清空旧结果，防止误用上一个密码
    ["lowerCheck", "upperCheck", "punctuationCheck"].forEach(function (id) {
        var el = $(id);
        if (el) el.addEventListener("change", function () {
            if (currentPassword) clearResult();
        });
    });

    $("btn_copy").onclick = function () {
        if (!currentPassword) return;
        var btn = this;
        copyToClipboard(currentPassword).then(function () {
            btn.classList.add("copied");
            $("copyText").textContent = I18N.copied;
            setTimeout(function () {
                btn.classList.remove("copied");
                $("copyText").textContent = I18N.copy;
            }, 1500);
        }, function () {
            var hint = $("pzHint");
            if (hint) { hint.className = "pz-hint error"; hint.textContent = I18N.copyFail; }
        });
    };
})();
