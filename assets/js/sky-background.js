(function () {
  "use strict";

  var MINUTES_IN_DAY = 24 * 60;
  var DEG_TO_RAD = Math.PI / 180;
  var RAD_TO_DEG = 180 / Math.PI;

  var ZONE_PLACES = {
    "America/Adak": [51.88, -176.66],
    "America/Anchorage": [61.22, -149.9],
    "America/Boise": [43.62, -116.2],
    "America/Chicago": [41.88, -87.63],
    "America/Denver": [39.74, -104.99],
    "America/Detroit": [42.33, -83.05],
    "America/Indiana/Indianapolis": [39.77, -86.16],
    "America/Juneau": [58.3, -134.42],
    "America/Los_Angeles": [34.05, -118.24],
    "America/New_York": [40.71, -74.01],
    "America/Phoenix": [33.45, -112.07],
    "America/Toronto": [43.65, -79.38],
    "America/Vancouver": [49.28, -123.12],
    "America/Mexico_City": [19.43, -99.13],
    "America/Sao_Paulo": [-23.55, -46.63],
    "America/Buenos_Aires": [-34.6, -58.38],
    "Europe/London": [51.51, -0.13],
    "Europe/Dublin": [53.35, -6.26],
    "Europe/Paris": [48.86, 2.35],
    "Europe/Berlin": [52.52, 13.41],
    "Europe/Rome": [41.9, 12.5],
    "Europe/Madrid": [40.42, -3.7],
    "Europe/Amsterdam": [52.37, 4.9],
    "Europe/Stockholm": [59.33, 18.07],
    "Europe/Athens": [37.98, 23.73],
    "Africa/Cairo": [30.04, 31.24],
    "Africa/Johannesburg": [-26.2, 28.04],
    "Asia/Dubai": [25.2, 55.27],
    "Asia/Kolkata": [28.61, 77.21],
    "Asia/Bangkok": [13.76, 100.5],
    "Asia/Singapore": [1.35, 103.82],
    "Asia/Shanghai": [31.23, 121.47],
    "Asia/Hong_Kong": [22.32, 114.17],
    "Asia/Tokyo": [35.68, 139.76],
    "Australia/Perth": [-31.95, 115.86],
    "Australia/Adelaide": [-34.93, 138.6],
    "Australia/Brisbane": [-27.47, 153.03],
    "Australia/Sydney": [-33.87, 151.21],
    "Pacific/Auckland": [-36.85, 174.76],
    "Pacific/Honolulu": [21.31, -157.86]
  };

  var PALETTES = {
    light: {
      midnight: [205, 207, 211],
      astral: [198, 208, 229],
      nautical: [214, 224, 250],
      violet: [226, 213, 255],
      magenta: [255, 196, 225],
      ember: [255, 114, 87],
      amber: [255, 183, 92],
      gold: [255, 225, 143],
      day: [255, 253, 248],
      dayWarm: [255, 249, 237],
      dayCool: [235, 248, 255],
      dayLate: [255, 250, 242],
      blueDay: [238, 248, 255],
      duskBlue: [217, 225, 255]
    },
    dark: {
      midnight: [1, 1, 5],
      astral: [5, 7, 22],
      nautical: [8, 13, 38],
      violet: [20, 13, 55],
      magenta: [56, 19, 66],
      ember: [120, 35, 24],
      amber: [111, 69, 14],
      gold: [70, 59, 24],
      day: [30, 42, 46],
      dayWarm: [34, 41, 39],
      dayCool: [23, 48, 64],
      dayLate: [34, 42, 40],
      blueDay: [22, 46, 62],
      duskBlue: [8, 14, 34]
    }
  };
  var debugOptions = null;

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function smoothstep(value) {
    var t = clamp(value, 0, 1);
    return t * t * (3 - 2 * t);
  }

  function mix(a, b, amount) {
    var t = smoothstep(amount);

    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }

  function blendStops(stops, position) {
    var value = clamp(position, 0, 1);
    var previous = stops[0];

    for (var index = 1; index < stops.length; index += 1) {
      var next = stops[index];

      if (value <= next.at) {
        return mix(previous.color, next.color, (value - previous.at) / (next.at - previous.at));
      }

      previous = next;
    }

    return previous.color;
  }

  function toHex(color) {
    return "#" + color.map(function (channel) {
      return channel.toString(16).padStart(2, "0");
    }).join("");
  }

  function getLocalParts(date, timeZone) {
    var formatter = new Intl.DateTimeFormat("en-US", {
      timeZone: timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      second: "numeric"
    });
    var parts = formatter.formatToParts(date).reduce(function (result, part) {
      if (part.type !== "literal") {
        result[part.type] = Number(part.value);
      }

      return result;
    }, {});

    return {
      year: parts.year,
      month: parts.month,
      day: parts.day,
      hour: parts.hour,
      minute: parts.minute,
      second: parts.second
    };
  }

  function getDayOfYear(parts) {
    var current = Date.UTC(parts.year, parts.month - 1, parts.day);
    var start = Date.UTC(parts.year, 0, 0);

    return Math.floor((current - start) / 86400000);
  }

  function getTimeZoneOffsetHours(date, timeZone) {
    try {
      var formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: timeZone,
        timeZoneName: "shortOffset"
      });
      var offsetPart = formatter.formatToParts(date).filter(function (part) {
        return part.type === "timeZoneName";
      })[0];
      var offset = offsetPart && offsetPart.value.match(/GMT([+-])(\d{1,2})(?::(\d{2}))?/);

      if (offset) {
        var sign = offset[1] === "-" ? -1 : 1;
        var hours = Number(offset[2]);
        var minutes = Number(offset[3] || 0);

        return sign * (hours + minutes / 60);
      }

      if (offsetPart && offsetPart.value === "GMT") {
        return 0;
      }
    } catch (error) {
      return -date.getTimezoneOffset() / 60;
    }

    return -date.getTimezoneOffset() / 60;
  }

  function inferPlace(timeZone, date) {
    if (ZONE_PLACES[timeZone]) {
      return {
        latitude: ZONE_PLACES[timeZone][0],
        longitude: ZONE_PLACES[timeZone][1]
      };
    }

    var offsetHours = getTimeZoneOffsetHours(date, timeZone);
    var longitude = offsetHours * 15;
    var latitude = 38;

    if (/^Europe\//.test(timeZone)) {
      latitude = 50;
    } else if (/^(Africa|Asia)\//.test(timeZone)) {
      latitude = 24;
    } else if (/^(Australia|Pacific\/Auckland)/.test(timeZone)) {
      latitude = -34;
    } else if (/^America\//.test(timeZone)) {
      latitude = 39;
    }

    return {
      latitude: latitude,
      longitude: longitude
    };
  }

  function getSolarEvent(solarNoon, declination, latitudeRad, altitude) {
    var altitudeRad = altitude * DEG_TO_RAD;
    var cosHourAngle = (Math.sin(altitudeRad) -
      Math.sin(latitudeRad) * Math.sin(declination)) /
      (Math.cos(latitudeRad) * Math.cos(declination));

    if (cosHourAngle <= -1) {
      return {
        dawn: 0,
        dusk: MINUTES_IN_DAY,
        durationHours: 24
      };
    }

    if (cosHourAngle >= 1) {
      return {
        dawn: solarNoon * 60,
        dusk: solarNoon * 60,
        durationHours: 0
      };
    }

    var hourAngle = Math.acos(cosHourAngle) * RAD_TO_DEG / 15;

    return {
      dawn: clamp((solarNoon - hourAngle) * 60, 0, MINUTES_IN_DAY),
      dusk: clamp((solarNoon + hourAngle) * 60, 0, MINUTES_IN_DAY),
      durationHours: hourAngle * 2
    };
  }

  function getSunTimes(dayOfYear, latitude, longitude, offsetHours) {
    var meanAnomaly = (360 / 365) * (dayOfYear - 81) * DEG_TO_RAD;
    var declination = 23.44 * DEG_TO_RAD * Math.sin(meanAnomaly);
    var latitudeRad = clamp(latitude, -66, 66) * DEG_TO_RAD;
    var localMeridian = offsetHours * 15;
    var equationOfTime = 9.87 * Math.sin(2 * meanAnomaly) -
      7.53 * Math.cos(meanAnomaly) -
      1.5 * Math.sin(meanAnomaly);
    var solarNoon = 12 + (localMeridian - longitude) / 15 - equationOfTime / 60;
    var horizon = getSolarEvent(solarNoon, declination, latitudeRad, -0.833);
    var civil = getSolarEvent(solarNoon, declination, latitudeRad, -6);
    var nautical = getSolarEvent(solarNoon, declination, latitudeRad, -12);
    var astronomical = getSolarEvent(solarNoon, declination, latitudeRad, -18);

    return {
      astronomicalDawn: astronomical.dawn,
      nauticalDawn: nautical.dawn,
      civilDawn: civil.dawn,
      sunrise: horizon.dawn,
      sunset: horizon.dusk,
      civilDusk: civil.dusk,
      nauticalDusk: nautical.dusk,
      astronomicalDusk: astronomical.dusk,
      solarNoon: clamp(solarNoon * 60, 0, MINUTES_IN_DAY),
      daylightHours: horizon.durationHours
    };
  }

  function chooseSkyColor(minutes, sunTimes, scheme) {
    var palette = PALETTES[scheme] || PALETTES.light;
    var astronomicalDawn = sunTimes.astronomicalDawn;
    var nauticalDawn = sunTimes.nauticalDawn;
    var civilDawn = sunTimes.civilDawn;
    var sunrise = sunTimes.sunrise;
    var sunset = sunTimes.sunset;
    var civilDusk = sunTimes.civilDusk;
    var nauticalDusk = sunTimes.nauticalDusk;
    var astronomicalDusk = sunTimes.astronomicalDusk;
    var solarNoon = sunTimes.solarNoon;
    var morningGoldEnd = sunrise + Math.min(90, Math.max(45, (solarNoon - sunrise) * 0.35));
    var eveningGoldStart = sunset - Math.min(90, Math.max(45, (sunset - solarNoon) * 0.35));

    if (minutes < astronomicalDawn) {
      return palette.midnight;
    }

    if (minutes < nauticalDawn) {
      return mix(palette.midnight, palette.astral, (minutes - astronomicalDawn) / Math.max(nauticalDawn - astronomicalDawn, 1));
    }

    if (minutes < civilDawn) {
      return blendStops([
        { at: 0, color: palette.astral },
        { at: 0.45, color: palette.nautical },
        { at: 1, color: palette.violet }
      ], (minutes - nauticalDawn) / Math.max(civilDawn - nauticalDawn, 1));
    }

    if (minutes < sunrise) {
      return blendStops([
        { at: 0, color: palette.violet },
        { at: 0.38, color: palette.magenta },
        { at: 0.72, color: palette.amber },
        { at: 1, color: palette.ember }
      ], (minutes - civilDawn) / Math.max(sunrise - civilDawn, 1));
    }

    if (minutes < morningGoldEnd) {
      return blendStops([
        { at: 0, color: palette.ember },
        { at: 0.22, color: palette.amber },
        { at: 0.5, color: palette.gold },
        { at: 1, color: palette.day }
      ], (minutes - sunrise) / Math.max(morningGoldEnd - sunrise, 1));
    }

    if (minutes < eveningGoldStart) {
      return blendStops([
        { at: 0, color: palette.dayWarm },
        { at: 0.24, color: palette.blueDay },
        { at: 0.5, color: palette.dayCool },
        { at: 0.76, color: palette.day },
        { at: 1, color: palette.dayLate }
      ], (minutes - morningGoldEnd) / Math.max(eveningGoldStart - morningGoldEnd, 1));
    }

    if (minutes < sunset) {
      return blendStops([
        { at: 0, color: palette.day },
        { at: 0.28, color: palette.gold },
        { at: 0.55, color: palette.amber },
        { at: 0.78, color: palette.ember },
        { at: 1, color: palette.magenta }
      ], (minutes - eveningGoldStart) / Math.max(sunset - eveningGoldStart, 1));
    }

    if (minutes < civilDusk) {
      return mix(palette.magenta, palette.violet, (minutes - sunset) / Math.max(civilDusk - sunset, 1));
    }

    if (minutes < nauticalDusk) {
      return blendStops([
        { at: 0, color: palette.violet },
        { at: 0.55, color: palette.duskBlue },
        { at: 1, color: palette.nautical }
      ], (minutes - civilDusk) / Math.max(nauticalDusk - civilDusk, 1));
    }

    if (minutes < astronomicalDusk) {
      return mix(palette.nautical, palette.astral, (minutes - nauticalDusk) / Math.max(astronomicalDusk - nauticalDusk, 1));
    }

    return mix(palette.astral, palette.midnight, (minutes - astronomicalDusk) / Math.max(MINUTES_IN_DAY - astronomicalDusk, 1));
  }

  function getPreferredScheme(scheme) {
    if (scheme === "light" || scheme === "dark") {
      return scheme;
    }

    if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) {
      return "dark";
    }

    return "light";
  }

  function getColor(options) {
    var settings = options || {};
    var date = settings.date || new Date();
    var timeZone = settings.timeZone ||
      (Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");
    var parts = getLocalParts(date, timeZone);
    var dayOfYear = settings.dayOfYear || getDayOfYear(parts);
    var offsetDate = settings.dayOfYear
      ? new Date(Date.UTC(parts.year, 0, settings.dayOfYear, 12))
      : date;
    var inferredPlace = inferPlace(timeZone, offsetDate);
    var place = {
      latitude: typeof settings.latitude === "number" ? settings.latitude : inferredPlace.latitude,
      longitude: typeof settings.longitude === "number" ? settings.longitude : inferredPlace.longitude
    };
    var offsetHours = getTimeZoneOffsetHours(offsetDate, timeZone);
    var sunTimes = getSunTimes(dayOfYear, place.latitude, place.longitude, offsetHours);
    var minutes = typeof settings.minutes === "number"
      ? settings.minutes
      : parts.hour * 60 + parts.minute + parts.second / 60;
    var scheme = getPreferredScheme(settings.scheme);
    var color = chooseSkyColor(minutes, sunTimes, scheme);

    return {
      color: toHex(color),
      scheme: scheme,
      timeZone: timeZone,
      dayOfYear: dayOfYear,
      minutes: minutes,
      astronomicalDawn: sunTimes.astronomicalDawn,
      nauticalDawn: sunTimes.nauticalDawn,
      civilDawn: sunTimes.civilDawn,
      sunrise: sunTimes.sunrise,
      sunset: sunTimes.sunset,
      civilDusk: sunTimes.civilDusk,
      nauticalDusk: sunTimes.nauticalDusk,
      astronomicalDusk: sunTimes.astronomicalDusk,
      daylightHours: sunTimes.daylightHours,
      latitude: place.latitude,
      longitude: place.longitude
    };
  }

  function apply(options) {
    var result = getColor(options || debugOptions);

    document.documentElement.style.setProperty("--page-bg", result.color);
    document.documentElement.dataset.skyPhase = result.scheme;

    return result;
  }

  function setDebugOptions(options) {
    debugOptions = options || null;

    return apply();
  }

  function clearDebugOptions() {
    debugOptions = null;

    return apply();
  }

  function scheduleUpdates() {
    var media = window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)");

    apply();
    window.setInterval(function () {
      apply();
    }, 5 * 60 * 1000);

    if (media && media.addEventListener) {
      media.addEventListener("change", function () {
        apply();
      });
    }
  }

  window.NotNothingSkyBackground = {
    getColor: getColor,
    apply: apply,
    setDebugOptions: setDebugOptions,
    clearDebugOptions: clearDebugOptions
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", scheduleUpdates);
  } else {
    scheduleUpdates();
  }
}());
