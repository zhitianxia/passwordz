function zhi_hash(pwd, key) {
	return md5(md5(md5(pwd, key),"mi"), "zhi") + md5(md5(md5(pwd, key),"tian"), "xia");
}

function zhi_password(hash, l, u, p) {
	var digit = "0123456789";
	var lower = "abcdefghijklmnopqrstuvwxyz";
	var upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	var punctuation = "~!@#$%^&*():;,.?";
	var chars = digit;
	var lenth = 10;
	if(l){
		chars = chars + lower;
		lenth = lenth + lower.length;
	}
	if(u){
		chars = chars + upper;
		lenth = lenth + upper.length;
	}
	if(p){
		chars = chars + punctuation;
		lenth = lenth + punctuation.length;
	}
	var password = "";
	for (var i = 0; i < 16; ++i) {
		var str = hash.slice(i * 4, i * 4 + 4);
		var x = parseInt(str, 16);
		password = password + chars[x % lenth];
	}
	return password;
}

function generate_password(pwd, key, l, u, p) {
	if (pwd && key) {
		var hash = zhi_hash(pwd, key);
		return zhi_password(hash, l, u, p);
	}
}