var TUAN = new Array("Ch\u1EE7 Nh\u1EADt", "Th\u1EE9 Hai", "Th\u1EE9 Ba", "Th\u1EE9 T\u01B0", "Th\u1EE9 N\u0103m", "Th\u1EE9 S\341u", "Th\u1EE9 B\u1EA3y");
var THANG = new Array("Gi\u00EAng", "Hai", "Ba", "T\u01B0", "N\u0103m", "S\u00E1u", "B\u1EA3y", "T\u00E1m", "Ch\u00EDn", "M\u01B0\u1EDDi", "M\u1ED9t", "Ch\u1EA1p");
var CAN = new Array("Gi\341p", "\u1EA4t", "B\355nh", "\u0110inh", "M\u1EADu", "K\u1EF7", "Canh", "T\342n", "Nh\342m", "Qu\375");
var CHI = new Array("T\375", "S\u1EEDu", "D\u1EA7n", "M\343o", "Th\354n", "T\u1EF5", "Ng\u1ECD", "M\371i", "Th\342n", "D\u1EADu", "Tu\u1EA5t", "H\u1EE3i");
var GIO_HD = new Array("110100101100", "001101001011", "110011010010", "101100110100", "001011001101", "010010110011");
var TIETKHI = new Array("Xu\u00E2n ph\u00E2n", "Thanh minh", "C\u1ED1c v\u0169", "L\u1EADp h\u1EA1", "Ti\u1EC3u m\u00E3n", "Mang ch\u1EE7ng",
	"H\u1EA1 ch\u00ED", "Ti\u1EC3u th\u1EED", "\u0110\u1EA1i th\u1EED", "L\u1EADp thu", "X\u1EED th\u1EED", "B\u1EA1ch l\u1ED9",
	"Thu ph\u00E2n", "H\u00E0n l\u1ED9", "S\u01B0\u01A1ng gi\u00E1ng", "L\u1EADp \u0111\u00F4ng", "Ti\u1EC3u tuy\u1EBFt", "\u0110\u1EA1i tuy\u1EBFt",
	"\u0110\u00F4ng ch\u00ED", "Ti\u1EC3u h\u00E0n", "\u0110\u1EA1i h\u00E0n", "L\u1EADp xu\u00E2n", "V\u0169 Th\u1EE7y", "Kinh tr\u1EADp"
);

function YearlyEvent(dd, mm, info) {
	this.day = dd;
	this.month = mm;
	this.info = info;
}

var YEARLY_EVENTS = new Array(
  new YearlyEvent(1,1,'T\u1EBFt Nguy\u00EAn \u0110\u00E1n'),
  new YearlyEvent(15,1,'R\u1EB1m th\u00E1ng Gi\u00EAng'),
  new YearlyEvent(10,3,'Gi\u1ED7 T\u1ED5 H\u00F9ng V\u01B0\u01A1ng (10/3 \u00C2L)'),
  new YearlyEvent(15,4,'Ph\u1EADt \u0110\u1EA3n (15/4 \u00C2L)'),
  new YearlyEvent(5,5,'L\u1EC5 \u0110oan Ng\u1ECD (5/5 \u00C2L)'),
  new YearlyEvent(15,7,'Vu Lan (15/7 \u00C2L)'),
  new YearlyEvent(15,8,'T\u1EBFt Trung Thu (R\u1EB1m th\u00E1ng 8)'),
  new YearlyEvent(23,12,'\u00D4ng T\u00E1o ch\u1EA7u tr\u1EDDi (23/12 \u00C2L)')
);

function findEvents(dd, mm) {
	var ret = new Array();
	for (var i = 0; i < YEARLY_EVENTS.length; i++) {
		evt = YEARLY_EVENTS[i];
		if (evt.day == dd && evt.month == mm) {
			ret.push(evt);
		}
	}
	return ret;
}

function getDayInfo(dd, mm) {
	var events = findEvents(dd, mm);
	var ret = '';
	for (var i = 0; i < events.length; i++) {
		ret += events[i].info+' ';
	}
	ret += '&nbsp;';
	return ret;
}

function showDayInfo(cellId, dd, mm, yy, leap, length, jd, sday, smonth, syear) {
	selectCell(cellId);
	//alert('Cell '+cellId+': '+dd+'/'+mm+'/'+yy+" AL = "+sday+"/"+smonth+"/"+syear);
	document.NaviForm.dd.value = sday;
	//document.getElementById("thangduong").innerHTML = 'Tháng '+smonth+' năm '+syear;
	document.getElementById("ngayduong").innerHTML = sday;
	var dayOfWeek = TUAN[(jd + 1) % 7];
	document.getElementById("thuduong").innerHTML = dayOfWeek;
	document.getElementById("ngayam").innerHTML = dd;
	var nhuan = (leap == 1) ? ' nhu\u1EADn' : '';
	var tenthang = 'Th\u00E1ng '+THANG[mm-1]+nhuan+(length == 30 ? ' (\u0110)' : ' (T)');
	document.getElementById("thangam").innerHTML = tenthang;
	document.getElementById("namam").innerHTML = 'N\u0103m '+getYearCanChi(yy);
	var thang = CAN[(yy*12+mm+3) % 10] + " " + CHI[(mm+1)%12];
	document.getElementById("canchithang").innerHTML = 'Th\u00E1ng '+thang;
	var ngay = CAN[(jd + 9) % 10] + " " + CHI[(jd+1)%12];
	document.getElementById("canchingay").innerHTML = 'Ng\u00E0y '+ngay;
	document.getElementById("canchigio").innerHTML = 'Gi\u1EDD '+getCanHour0(jd)+' '+CHI[0];
	document.getElementById("tietkhi").innerHTML = 'Ti\u1EBFt '+TIETKHI[getSolarTerm(jd+1, 7.0)];
	document.getElementById("dayinfo").innerHTML = getDayInfo(dd, mm);
	document.getElementById("hoangdao").innerHTML = 'Gi\u1EDD ho\u00E0ng \u0111\u1EA1o: '+getGioHoangDao(jd);
	//document.NaviForm.submit();
}

function selectCell(cellId) {
	for (var i=0; i<42; i++) {
		document.getElementById("cell"+i).className = 'ngaythang';
	}
	document.getElementById("cell"+cellId).className = 'homnay';
}

function getYearCanChi(year) {
	return CAN[(year+6) % 10] + " " + CHI[(year+8) % 12];
}

/*
 * Can cua gio Chinh Ty (00:00) cua ngay voi JDN nay
 */
function getCanHour0(jdn) {
	return CAN[(jdn-1)*2 % 10];
}

function getGioHoangDao(jd) {
	var chiOfDay = (jd+1) % 12;
	var gioHD = GIO_HD[chiOfDay % 6]; // same values for Ty' (1) and Ngo. (6), for Suu and Mui etc.
	var ret = "";
	var count = 0;
	for (var i = 0; i < 12; i++) {
		if (gioHD.charAt(i) == '1') {
			ret += CHI[i];
			ret += ' ('+(i*2+23)%24+'-'+(i*2+1)%24+')';
			if (count++ < 5) ret += ', ';
			//if (count == 3) ret += '\n';
		}
	}
	return ret;
}

var PI = Math.PI;

/* Discard the fractional part of a number, e.g., INT(3.2) = 3 */
function INT(d) {
	return Math.floor(d);
}

/* Compute the longitude of the sun at any time.
 * Parameter: floating number jdn, the number of days since 1/1/4713 BC noon
 * Algorithm from: "Astronomical Algorithms" by Jean Meeus, 1998
 */
function SunLongitude(jdn) {
	var T, T2, dr, M, L0, DL, lambda, theta, omega;
	T = (jdn - 2451545.0 ) / 36525; // Time in Julian centuries from 2000-01-01 12:00:00 GMT
	T2 = T*T;
	dr = PI/180; // degree to radian
	M = 357.52910 + 35999.05030*T - 0.0001559*T2 - 0.00000048*T*T2; // mean anomaly, degree
	L0 = 280.46645 + 36000.76983*T + 0.0003032*T2; // mean longitude, degree
	DL = (1.914600 - 0.004817*T - 0.000014*T2)*Math.sin(dr*M);
	DL = DL + (0.019993 - 0.000101*T)*Math.sin(dr*2*M) + 0.000290*Math.sin(dr*3*M);
    theta = L0 + DL; // true longitude, degree
    // obtain apparent longitude by correcting for nutation and aberration
    omega = 125.04 - 1934.136 * T;
    lambda = theta - 0.00569 - 0.00478 * Math.sin(omega * dr);
    // Convert to radians
    lambda = lambda*dr;
	lambda = lambda - PI*2*(INT(lambda/(PI*2))); // Normalize to (0, 2*PI)
    return lambda;
}

/* Compute the sun segment at start (00:00) of the day with the given integral Julian day number.
 * The time zone if the time difference between local time and UTC: 7.0 for UTC+7:00.
 * The function returns a number between 0 and 23.
 * From the day after March equinox and the 1st major term after March equinox, 0 is returned.
 * After that, return 1, 2, 3 ...
 */
function getSolarTerm(dayNumber, timeZone) {
	return INT(SunLongitude(dayNumber - 0.5 - timeZone/24.0) / PI * 12);
}

