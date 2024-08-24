var clipboard = new ClipboardJS("#btn_copy");
var langValue = document.documentElement.lang;
document.getElementById("btn_generate").onclick = function() {
    var originPassword = document.getElementById("originPassword").value;
    var sceneCode = document.getElementById("sceneCode").value;
    var l = document.getElementById("lowerCheck").checked;
    var u = document.getElementById("upperCheck").checked;
    var p = document.getElementById("punctuationCheck").checked;
    var zhi_pwd = generate_password(originPassword, sceneCode, l, u, p);
    if (zhi_pwd) {
        document.getElementById("code").value = zhi_pwd;
        if (langValue == "en"){
            document.getElementById("btn_copy").innerHTML="copy";
        }else{
            document.getElementById("btn_copy").innerHTML="复制";
        }
    }
}
document.getElementById("btn_copy").onclick = function() {
    if (langValue == "en"){
        document.getElementById("btn_copy").innerHTML="copied";
    }else{
        document.getElementById("btn_copy").innerHTML="已复制";
    }
}   