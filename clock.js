/* 
 * Tablet desk clock
 * 
 * Copyright (c) Project Nayuki
 * All rights reserved. Contact Nayuki for licensing.
 * https://www.nayuki.io/page/tablet-desk-clock
 */

"use strict";


/*---- Shared constants and functions ----*/

// Useful Unicode characters
var DEGREE_CHAR      = "\u00B0";
var QUARTER_EM_SPACE = "\u2005";
var EN_SPACE         = "\u2002";
var EN_DASH          = "\u2013";
var MINUS_CHAR       = "\u2212";
var SUN_CHAR         = "\u263C";
var MOON_CHAR        = "\u263D";


// Returns a text node that should be the only child of the given DOM element.
// If the DOM element already has a text node child then it is returned; otherwise a new blank child is added and returned.
// The element must not have sub-elements or multiple text nodes.
function getChildTextNode(elemId) {
	var elem = document.getElementById(elemId);
	if (elem.firstChild == null || elem.firstChild.nodeType != Node.TEXT_NODE)
		elem.insertBefore(document.createTextNode(""), elem.firstChild);
	return elem.firstChild;
}


// Returns the given integer as an exactly two-digit string.
// e.g. twoDigits(0) -> "00", twoDigits(8) -> "08", twoDigits(52) -> "52".
function twoDigits(n) {
	if (typeof n != "number" || n < 0 || n >= 100 || Math.floor(n) != n)
		throw "Integer expected";
	return (n < 10 ? "0" : "") + n;
}

// Monkey patching
Date.prototype.clone = function() {
	return new Date(this.getTime());
};


// Performs an XHR on the given URL, and calls the given function with the parsed JSON data if data was successful obtained.
function getAndProcessJson(url, timeout, func, retryCount) {
	
	if (retryCount === undefined)
		retryCount = 0;

	if (url.includes("weather")) 
	{
		Weather.getCurrent( "Ha noi, VN", function( current ) {
			func(current);
		});
	}
	else {

		var xhr = new XMLHttpRequest();
		xhr.onload = function() {
			func(JSON.parse(xhr.response));
		};
		xhr.ontimeout = function() {
			if (retryCount < 9)  // Exponential back-off
				setTimeout(function() { getAndProcessJson(url, timeout, func, retryCount + 1); }, Math.pow(2, retryCount) * 1000);
		};
		xhr.open("GET", url, true);
		xhr.responseType = "text";
		xhr.timeout = timeout;
		xhr.send();
	}
}


/*---- Time module ----*/

var timeModule = new function() {
	
	var self = this;
	
	// Represents the best known correct time minus the web browser's time, in milliseconds.
	// The time source may be the web server itself or from NTP (passed through the web server).
	var timeOffset = 0;
	
	// Returns a new Date object represented the current date and time, with corrections applied based on the server's time.
	this.getCorrectedDatetime = function() {
		return new Date(Date.now() + timeOffset);
	};
	
	// Calls the given function at or after the given wakeup datetime (i.e. getCorrectedDatetime().getTime() >= wake.getTime()).
	// The given function may be called immediately synchronously or asynchronously later.
	this.scheduleCall = function(func, wake) {
		var delay = wake.getTime() - self.getCorrectedDatetime().getTime();
		if (delay <= 0)
			func();
		else
			setTimeout(function() { self.scheduleCall(func, wake); }, delay);
	};
	
	function autoUpdateTimeOffset() {
		getAndProcessJson("/get-time.json", 1000, function(data) {
			timeOffset = data[1] - Date.now();
			if (data[0] == "ntp")
				document.getElementById("clock-status-no-clock").style.display = "none";
			else if (data[0] == "server") {
				document.getElementById("clock-status-no-clock").style.removeProperty("display");
				if (Math.abs(timeOffset) < 50)  // Heuristic for detecting local server
					timeOffset = 0;  // Don't correct if source is local, because it's counter-productive
			}
		});
		setTimeout(autoUpdateTimeOffset, 60 * 60 * 1000 * (0.9 + 0.2 * Math.random()));
	}
	
	autoUpdateTimeOffset();
};


/*---- Clock module ----*/

var clockModule = new function() {
	var PI = Math.PI;
	// Private variables
	var hourTextNode   = new MemoizingTextNode("clock-hour"  );
	var minuteTextNode = new MemoizingTextNode("clock-minute");
	var secondTextNode = new MemoizingTextNode("clock-second");
	var utcTextNode    = new MemoizingTextNode("clock-utcbox");
	var dateTextNode   = new MemoizingTextNode("clock-date"  );
	var ngaygioTextNode   = new MemoizingTextNode("sukien-ngaygio"  );
	
	var DAYS_OF_WEEK = ["Chủ nhật", "Thứ hai", "Thứ ba", "Thứ tư", "Thứ năm", "Thứ sáu", "Thứ bảy"];
	var prevClockUpdate = null;  // In Unix seconds
	var dimmingState = 0;
	
	// Updates the date and time texts every second.
	function autoUpdateClockDisplay() {
		var d = timeModule.getCorrectedDatetime();

		/*----------------*/
		var k, dayNumber, monthStart, a11, b11, lunarDay, lunarMonth, lunarYear, lunarLeap, dd, yy, mm,timeZone, prevLunarDay, prevLunarMonth, prevLunarYear
		dd = d.getDate();
		
		mm = d.getMonth() + 1;
		yy = d.getFullYear();
		timeZone = 7;

		
		dayNumber = jdFromDate(dd, mm, yy);
		k = INT((dayNumber - 2415021.076998695) / 29.530588853);
		monthStart = getNewMoonDay(k+1, timeZone);
		if (monthStart > dayNumber) {
			monthStart = getNewMoonDay(k, timeZone);
		}
		//alert(dayNumber+" -> "+monthStart);
		a11 = getLunarMonth11(yy, timeZone);
		b11 = a11;
		if (a11 >= monthStart) {
			lunarYear = yy;
			a11 = getLunarMonth11(yy-1, timeZone);
		} else {
			lunarYear = yy+1;
			b11 = getLunarMonth11(yy+1, timeZone);
		}
		lunarDay = dayNumber-monthStart+1;
		var diff = INT((monthStart - a11)/29);
		lunarLeap = 0;
		lunarMonth = diff+11;
		if (b11 - a11 > 365) {
			var leapMonthDiff = getLeapMonthOffset(a11, timeZone);
			if (diff >= leapMonthDiff) {
				lunarMonth = diff + 10;
				if (diff == leapMonthDiff) {
					lunarLeap = 1;
				}
			}
		}
		if (lunarMonth > 12) {
			lunarMonth = lunarMonth - 12;
		}
		if (lunarMonth >= 11 && diff < 4) {
			lunarYear -= 1;
		}

		/*----------------*/


		var curClockUpdate = Math.floor(d.getTime() / 1000);
		if (prevClockUpdate == null || curClockUpdate != prevClockUpdate) {
			hourTextNode.setText(twoDigits(d.getHours  ()));  // Local hour  : "14"
			minuteTextNode.setText(twoDigits(d.getMinutes()));  // Local minute: "32"
			secondTextNode.setText(twoDigits(d.getSeconds()));  // Local second: "19"
			dateTextNode.setText(DAYS_OF_WEEK[d.getDay()] + " " + twoDigits(d.getDate()) + EN_DASH + twoDigits(d.getMonth() + 1) + EN_DASH + d.getFullYear());
			utcTextNode.setText(lunarDay + EN_DASH + lunarMonth + EN_DASH + lunarYear + EN_SPACE + "Âm lịch");
			prevClockUpdate = curClockUpdate;
			
			//------------Ngay gio------------
			if (lunarDay != prevLunarDay) {
				/*lunarDay = 1;
				lunarMonth = 1;
				*/
				var DbConnection = new JsStore.Instance();
				var DbName = "Ngaygio";
				var ngay = twoDigits(lunarDay)+"/"+twoDigits(lunarMonth) + "%";

				JsStore.isDbExist(DbName, function (isExist) {
					if (isExist) {
						DbConnection.openDb(DbName);
						DbConnection.select({
							From: "Ngaygio"
							,Where: 	{
										Ngaymat: {Like:ngay}
									}
							}, function (cacngaygio) {
								var HtmlString = "";
								cacngaygio.forEach(function (ngaygio) {
									HtmlString += "Giỗ cụ: " + ngaygio.Name;
								}, function (error) {
									console.log(error);
								})
								//$('#tblGrid tbody').html(HtmlString);
								ngaygioTextNode.setText(HtmlString);
						});
					} 
				});
				
				prevLunarDay = lunarDay;
				prevLunarMonth = lunarMonth;
				prevLunarYear = lunarYear;				
			}
			//------------Ngay gio------------
		}
		setTimeout(autoUpdateClockDisplay, 1000 - timeModule.getCorrectedDatetime().getTime() % 1000);
	}
	
	// Updates the clock wallpaper once. Type is either "get" or "random".
	var changeWallpaper = this.changeWallpaper = function(type) {
		getAndProcessJson("/" + type + "-wallpaper.json", 3000, function(data) {
			if (typeof data == "string")
				document.documentElement.style.backgroundImage = "url('wallpaper/" + data + "')";
		});
	};
	
	// Updates the clock wallpaper at startup and thereafter every day at 05:00.
	function autoUpdateWallpaper() {
		changeWallpaper("get");
		
		// Schedule next update at 05:00 local time
		var now = timeModule.getCorrectedDatetime();
		var next = now.clone();
		next.setHours(5);
		next.setMinutes(0);
		next.setSeconds(0);
		next.setMilliseconds(0);
		if (next.getTime() <= now.getTime())
			next.setDate(next.getDate() + 1);
		timeModule.scheduleCall(autoUpdateWallpaper, next);
	}
	
	function autoUpdateNetworkStatus() {
		getAndProcessJson("/network-status.json", 60000, function(data) {
			if (data[0] === true)
				document.getElementById("clock-status-no-internet").style.display = "none";
			else if (data[0] === false)
				document.getElementById("clock-status-no-internet").style.removeProperty("display");
			
			var containerElem = document.getElementById("clock-status-computers");
			while (containerElem.firstChild != null)
				containerElem.removeChild(containerElem.firstChild);
			data.forEach(function(val, i) {
				if (i >= 1) {
					var imgElem = document.createElement("img");
					imgElem.src = "icon/" + val + "-computer.svg";
					containerElem.appendChild(imgElem);
				}
			});
		});
		setTimeout(autoUpdateNetworkStatus, 10 * 60 * 1000 * (0.9 + 0.2 * Math.random()));
	}
	
	function initDimmingHandler() {
		var clockElem = document.getElementById("clock");
		clockElem.onclick = function() {
			dimmingState = (dimmingState + 1) % 3;
			var bodyStyle = document.querySelector("body").style;
			var clockStyle = clockElem.style;
			switch (dimmingState) {
				case 0:
					bodyStyle.backgroundColor = "rgba(0,0,0,0.65)";
					clockStyle.opacity = "1.0";
					break;
				case 1:
					bodyStyle.backgroundColor = "rgba(0,0,0,0.0)";
					clockStyle.opacity = "0.0";
					break;
				case 2:
					bodyStyle.backgroundColor = "rgba(0,0,0,0.2)";
					clockStyle.opacity = "0.7";
					break;
				default:
					throw "Assertion error";
			}
		};
	}
	
	// A wrapper class around a DOM text node to avoid pushing unnecessary value updates to the DOM.
	function MemoizingTextNode(elemId) {
		var textNode = getChildTextNode(elemId);
		var value = textNode.data;
		this.setText = function(str) {
			if (str != value) {
				textNode.data = str;
				value = str;
			}
		};
	}

	/*--------_Am LICH---------*/
	/* Discard the fractional part of a number, e.g., INT(3.2) = 3 */
	function INT(d) {
		return Math.floor(d);
	}

	/* Compute the (integral) Julian day number of day dd/mm/yyyy, i.e., the number 
	* of days between 1/1/4713 BC (Julian calendar) and dd/mm/yyyy. 
	* Formula from http://www.tondering.dk/claus/calendar.html
	*/
	function jdFromDate(dd, mm, yy) {
		var a, y, m, jd;
		a = INT((14 - mm) / 12);
		y = yy+4800-a;
		m = mm+12*a-3;
		jd = dd + INT((153*m+2)/5) + 365*y + INT(y/4) - INT(y/100) + INT(y/400) - 32045;
		if (jd < 2299161) {
			jd = dd + INT((153*m+2)/5) + 365*y + INT(y/4) - 32083;
		}
		return jd;
	}

	/* Convert a Julian day number to day/month/year. Parameter jd is an integer */
	function jdToDate(jd) {
		var a, b, c, d, e, m, day, month, year;
		if (jd > 2299160) { // After 5/10/1582, Gregorian calendar
			a = jd + 32044;
			b = INT((4*a+3)/146097);
			c = a - INT((b*146097)/4);
		} else {
			b = 0;
			c = jd + 32082;
		}
		d = INT((4*c+3)/1461);
		e = c - INT((1461*d)/4);
		m = INT((5*e+2)/153);
		day = e - INT((153*m+2)/5) + 1;
		month = m + 3 - 12*INT(m/10);
		year = b*100 + d - 4800 + INT(m/10);
		return new Array(day, month, year);
	}

	/* Compute the time of the k-th new moon after the new moon of 1/1/1900 13:52 UCT 
	* (measured as the number of days since 1/1/4713 BC noon UCT, e.g., 2451545.125 is 1/1/2000 15:00 UTC).
	* Returns a floating number, e.g., 2415079.9758617813 for k=2 or 2414961.935157746 for k=-2
	* Algorithm from: "Astronomical Algorithms" by Jean Meeus, 1998
	*/
	function NewMoon(k) {
		var T, T2, T3, dr, Jd1, M, Mpr, F, C1, deltat, JdNew;
		T = k/1236.85; // Time in Julian centuries from 1900 January 0.5
		T2 = T * T;
		T3 = T2 * T;
		dr = PI/180;
		Jd1 = 2415020.75933 + 29.53058868*k + 0.0001178*T2 - 0.000000155*T3;
		Jd1 = Jd1 + 0.00033*Math.sin((166.56 + 132.87*T - 0.009173*T2)*dr); // Mean new moon
		M = 359.2242 + 29.10535608*k - 0.0000333*T2 - 0.00000347*T3; // Sun's mean anomaly
		Mpr = 306.0253 + 385.81691806*k + 0.0107306*T2 + 0.00001236*T3; // Moon's mean anomaly
		F = 21.2964 + 390.67050646*k - 0.0016528*T2 - 0.00000239*T3; // Moon's argument of latitude
		C1=(0.1734 - 0.000393*T)*Math.sin(M*dr) + 0.0021*Math.sin(2*dr*M);
		C1 = C1 - 0.4068*Math.sin(Mpr*dr) + 0.0161*Math.sin(dr*2*Mpr);
		C1 = C1 - 0.0004*Math.sin(dr*3*Mpr);
		C1 = C1 + 0.0104*Math.sin(dr*2*F) - 0.0051*Math.sin(dr*(M+Mpr));
		C1 = C1 - 0.0074*Math.sin(dr*(M-Mpr)) + 0.0004*Math.sin(dr*(2*F+M));
		C1 = C1 - 0.0004*Math.sin(dr*(2*F-M)) - 0.0006*Math.sin(dr*(2*F+Mpr));
		C1 = C1 + 0.0010*Math.sin(dr*(2*F-Mpr)) + 0.0005*Math.sin(dr*(2*Mpr+M));
		if (T < -11) {
			deltat= 0.001 + 0.000839*T + 0.0002261*T2 - 0.00000845*T3 - 0.000000081*T*T3;
		} else {
			deltat= -0.000278 + 0.000265*T + 0.000262*T2;
		};
		JdNew = Jd1 + C1 - deltat;
		return JdNew;
	}

	/* Compute the longitude of the sun at any time. 
	* Parameter: floating number jdn, the number of days since 1/1/4713 BC noon
	* Algorithm from: "Astronomical Algorithms" by Jean Meeus, 1998
	*/
	function SunLongitude(jdn) {
		var T, T2, dr, M, L0, DL, L;
		T = (jdn - 2451545.0 ) / 36525; // Time in Julian centuries from 2000-01-01 12:00:00 GMT
		T2 = T*T;
		dr = PI/180; // degree to radian
		M = 357.52910 + 35999.05030*T - 0.0001559*T2 - 0.00000048*T*T2; // mean anomaly, degree
		L0 = 280.46645 + 36000.76983*T + 0.0003032*T2; // mean longitude, degree
		DL = (1.914600 - 0.004817*T - 0.000014*T2)*Math.sin(dr*M);
		DL = DL + (0.019993 - 0.000101*T)*Math.sin(dr*2*M) + 0.000290*Math.sin(dr*3*M);
		L = L0 + DL; // true longitude, degree
		L = L*dr;
		L = L - PI*2*(INT(L/(PI*2))); // Normalize to (0, 2*PI)
		return L;
	}

	/* Compute sun position at midnight of the day with the given Julian day number. 
	* The time zone if the time difference between local time and UTC: 7.0 for UTC+7:00.
	* The function returns a number between 0 and 11. 
	* From the day after March equinox and the 1st major term after March equinox, 0 is returned. 
	* After that, return 1, 2, 3 ... 
	*/
	function getSunLongitude(dayNumber, timeZone) {
		return INT(SunLongitude(dayNumber - 0.5 - timeZone/24)/PI*6);
	}

	/* Compute the day of the k-th new moon in the given time zone.
	* The time zone if the time difference between local time and UTC: 7.0 for UTC+7:00
	*/
	function getNewMoonDay(k, timeZone) {
		return INT(NewMoon(k) + 0.5 + timeZone/24);
	}

	/* Find the day that starts the luner month 11 of the given year for the given time zone */
	function getLunarMonth11(yy, timeZone) {
		var k, off, nm, sunLong;
		//off = jdFromDate(31, 12, yy) - 2415021.076998695;
		off = jdFromDate(31, 12, yy) - 2415021;
		k = INT(off / 29.530588853);
		nm = getNewMoonDay(k, timeZone);
		sunLong = getSunLongitude(nm, timeZone); // sun longitude at local midnight
		if (sunLong >= 9) {
			nm = getNewMoonDay(k-1, timeZone);
		}
		return nm;
	}

	/* Find the index of the leap month after the month starting on the day a11. */
	function getLeapMonthOffset(a11, timeZone) {
		var k, last, arc, i;
		k = INT((a11 - 2415021.076998695) / 29.530588853 + 0.5);
		last = 0;
		i = 1; // We start with the month following lunar month 11
		arc = getSunLongitude(getNewMoonDay(k+i, timeZone), timeZone);
		do {
			last = arc;
			i++;
			arc = getSunLongitude(getNewMoonDay(k+i, timeZone), timeZone);
		} while (arc != last && i < 14);
		return i-1;
	}

	/* Comvert solar date dd/mm/yyyy to the corresponding lunar date */
	function convertSolar2Lunar(dd, mm, yy, timeZone) {
		var k, dayNumber, monthStart, a11, b11, lunarDay, lunarMonth, lunarYear, lunarLeap;
		dayNumber = jdFromDate(dd, mm, yy);
		k = INT((dayNumber - 2415021.076998695) / 29.530588853);
		monthStart = getNewMoonDay(k+1, timeZone);
		if (monthStart > dayNumber) {
			monthStart = getNewMoonDay(k, timeZone);
		}
		//alert(dayNumber+" -> "+monthStart);
		a11 = getLunarMonth11(yy, timeZone);
		b11 = a11;
		if (a11 >= monthStart) {
			lunarYear = yy;
			a11 = getLunarMonth11(yy-1, timeZone);
		} else {
			lunarYear = yy+1;
			b11 = getLunarMonth11(yy+1, timeZone);
		}
		lunarDay = dayNumber-monthStart+1;
		diff = INT((monthStart - a11)/29);
		lunarLeap = 0;
		lunarMonth = diff+11;
		if (b11 - a11 > 365) {
			leapMonthDiff = getLeapMonthOffset(a11, timeZone);
			if (diff >= leapMonthDiff) {
				lunarMonth = diff + 10;
				if (diff == leapMonthDiff) {
					lunarLeap = 1;
				}
			}
		}
		if (lunarMonth > 12) {
			lunarMonth = lunarMonth - 12;
		}
		if (lunarMonth >= 11 && diff < 4) {
			lunarYear -= 1;
		}
		return new Array(lunarDay, lunarMonth, lunarYear, lunarLeap);
	}

	/* Convert a lunar date to the corresponding solar date */
	function convertLunar2Solar(lunarDay, lunarMonth, lunarYear, lunarLeap, timeZone) {
		var k, a11, b11, off, leapOff, leapMonth, monthStart;
		if (lunarMonth < 11) {
			a11 = getLunarMonth11(lunarYear-1, timeZone);
			b11 = getLunarMonth11(lunarYear, timeZone);
		} else {
			a11 = getLunarMonth11(lunarYear, timeZone);
			b11 = getLunarMonth11(lunarYear+1, timeZone);
		}
		k = INT(0.5 + (a11 - 2415021.076998695) / 29.530588853);
		off = lunarMonth - 11;
		if (off < 0) {
			off += 12;
		}
		if (b11 - a11 > 365) {
			leapOff = getLeapMonthOffset(a11, timeZone);
			leapMonth = leapOff - 2;
			if (leapMonth < 0) {
				leapMonth += 12;
			}
			if (lunarLeap != 0 && lunarMonth != leapMonth) {
				return new Array(0, 0, 0);
			} else if (lunarLeap != 0 || off >= leapOff) {
				off += 1;
			}
		}
		monthStart = getNewMoonDay(k+off, timeZone);
		return jdToDate(monthStart+lunarDay-1);
	}
	/*--------_Am LICH---------*/

	
	// Initialization
	initDimmingHandler();
	autoUpdateClockDisplay();
	autoUpdateWallpaper();
	setTimeout(autoUpdateNetworkStatus, 5000);
};


/*---- Admin module ----*/

var adminModule = new function() {
	var adminContentElem = document.getElementById("admin-content");
	var isAnimating = false;
	
	// Toggles whether the admin pane is shown or hidden.
	function togglePane() {
		if (isAnimating)
			return;
		isAnimating = true;
		if (adminContentElem.style.display == "none") {
			adminContentElem.classList.add("showing");
			adminContentElem.style.removeProperty("display");
		} else {
			adminContentElem.classList.add("hiding");
		}
	}
	
	document.getElementById("admin-menu").onclick = function(ev) {
		togglePane();
		ev.stopPropagation();
	}
	
	adminContentElem.addEventListener("animationend", function(ev) {
		if (ev.animationName == "fadein") {
			if (adminContentElem.classList.contains("hiding"))
				adminContentElem.style.display = "none";
			adminContentElem.classList.remove("showing");
			adminContentElem.classList.remove("hiding");
			isAnimating = false;
		}
	});
	
	// For clicking outside the admin box
	adminContentElem.onclick = function(e) {
		if (e.target == adminContentElem)
			togglePane();  // Hiding
	};
	
	document.getElementById("admin-reload-page-button").onclick = function() {
		window.location.reload(true);
	};
	
	document.getElementById("admin-refresh-weather-button").onclick = function() {
		weatherModule.sunrisesetTextNode .data = "";
		weatherModule.conditionTextNode  .data = "";
		weatherModule.temperatureTextNode.data = "(Weather loading...)";
		weatherModule.doWeatherRequest();
	};
	
	document.getElementById("admin-change-wallpaper-button").onclick = function() {
		clockModule.changeWallpaper("random");
		togglePane();
	};
	
	// Fullscreen API
	(function() {
		function prefixifyFullscreenMember(obj, name) {
			if (name in obj)
				return name;
			name = name.charAt(0).toUpperCase() + name.substring(1);
			var result = null;
			["webkit", "moz", "ms"].forEach(function(prefix) {
				var temp = prefix + name;
				if (prefix == "moz")
					temp = temp.replace(/screen/i, "Screen").replace(/exit/i, "Cancel");
				if (temp in obj)
					result = temp;
			});
			return result;
		}
		
		function updateButtons() {
			if (document[prefixifyFullscreenMember(document, "fullscreenElement")] == null) {
				document.getElementById("admin-enter-full-screen-item").style.removeProperty("display");
				document.getElementById("admin-exit-full-screen-item").style.display = "none";
			} else {
				document.getElementById("admin-enter-full-screen-item").style.display = "none";
				document.getElementById("admin-exit-full-screen-item").style.removeProperty("display");
			}
		}
		
		document.querySelector("#admin-enter-full-screen-item a").onclick = function() {
			document.documentElement[prefixifyFullscreenMember(document.documentElement, "requestFullscreen")]();
		};
		document.querySelector("#admin-exit-full-screen-item a").onclick = function() {
			document[prefixifyFullscreenMember(document, "exitFullscreen")]();
		};
		["webkit", "moz", "ms"].forEach(function(prefix) {
			document["on" + prefix + "fullscreenchange"] = function() {
				togglePane();
				updateButtons();
			}
		});
		updateButtons();
	})();
};


/*---- Weather module ----*/
var weatherModule = new function() {
	var sunrisesetTextNode  = this.sunrisesetTextNode  = getChildTextNode("morning-sunriseset");
	var conditionTextNode   = this.conditionTextNode   = getChildTextNode("clock-weather-condition");
	var temperatureTextNode = this.temperatureTextNode = getChildTextNode("clock-weather-temperature");
	var weatherTextIsSet;
	
	// Updates the weather display once.
	var doWeatherRequest = this.doWeatherRequest = function() {
		getAndProcessJson("/weather.json", 10000, function(data) {
			document.getElementById("clock-weatherbox").title = "Thời tiết";
			conditionTextNode.data = data.conditions();
			temperatureTextNode.data = Weather.kelvinToCelsius(data.temperature() ) + "C";
			var d = timeModule.getCorrectedDatetime();
			getChildTextNode("admin-last-weather").data = twoDigits(d.getHours()) + ":" + twoDigits(d.getMinutes());	
			weatherTextIsSet = true;
		});
	};
	
	// Updates the weather and sunrise displays at startup and thereafter at around 4 minutes past each hour
	function autoUpdateWeather() {
		// Set delayed placeholder text
		weatherTextIsSet = false;
		setTimeout(function() {
			if (!weatherTextIsSet) {
				sunrisesetTextNode.data = "";
				temperatureTextNode.data = "";
				conditionTextNode.data = "(Weather loading...)"; }}, 3000);
		doWeatherRequest();
		
		// Schedule next update at about 5 minutes past the hour
		var now = timeModule.getCorrectedDatetime();
		var next = now.clone();
		next.setMinutes(4);
		next.setSeconds(0);
		next.setMilliseconds(Math.random() * 2 * 60 * 1000);  // Deliberate jitter of 2 minutes
		if (next.getTime() < now.getTime() || next.getHours() == now.getHours() && now.getMinutes() >= 4)
			next.setHours(next.getHours() + 1);	
		timeModule.scheduleCall(autoUpdateWeather, next);
	}
	
	// Initialization
	autoUpdateWeather();
};



