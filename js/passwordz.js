function zhi_hash(pwd, key) {
	return md5(md5(md5(pwd, key),"mi"), "zhi") + md5(md5(md5(pwd, key),"tian"), "xia");
}

function password_z(pwd, key, d, l, u, p){
	var hash = zhi_hash(pwd, key);
	var digit = "0123456789";
	var lower = "abcdefghijklmnopqrstuvwxyz";
	var upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
	var punctuation = "~!@#$%^&*():;,.?";
	var chars = "";
	if(d){
		chars = chars + digit;
	}
	if(l){
		chars = chars + lower;
	}
	if(u){
		chars = chars + upper;
	}
	if(p){
		chars = chars + punctuation;
	}
	var d_password = "";
	var l_password = "";
	var u_password = "";
	var p_password = "";
	var password = "";
	for (var i = 0; i < 16; ++i) {
		var str = hash.slice(i * 4, i * 4 + 4);
		var ox = parseInt(str, 16);
		var char = chars[ox % chars.length];
		password = password + char;
		if(digit.includes(char)){
			d_password = d_password + char;
		}else if(lower.includes(char)){
			l_password = l_password + char;
		}else if(upper.includes(char)){
			u_password = u_password + char;
		}else if(punctuation.includes(char)){
			p_password = p_password + char;
		}
	}
	var prefix = "";
	if(d && (d_password.length < 1)){
		prefix = prefix + digit[parseInt(hash.slice(56,64),16) % digit.length];
	}
	if(l && l_password.length < 1){
		prefix = prefix + lower[parseInt(hash.slice(48,56),16) % lower.length];
	}
	if(u && u_password.length < 1){
		prefix = prefix + upper[parseInt(hash.slice(40,48),16) % upper.length];
	}
	if(p && p_password.length < 1){
		prefix = prefix + punctuation[parseInt(hash.slice(32,40),16) % punctuation.length];
	}
	if(prefix.length > 0){
		password = prefix + password.slice(0,password.length - prefix.length);
	}
	return password;
}

function generate_password(pwd, key, l, u, p) {
	if (pwd && key) {
		var d = true;
		return password_z(pwd, key, d, l, u, p);
	}
}