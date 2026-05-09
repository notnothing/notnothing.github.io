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

  var SKY_COLORS = {
    nightZenith: [1, 3, 10],
    nightHorizon: [4, 6, 18],
    astronomicalZenith: [5, 12, 35],
    astronomicalHorizon: [18, 24, 48],
    nauticalZenith: [16, 31, 96],
    nauticalHorizon: [68, 70, 128],
    civilZenith: [66, 76, 158],
    civilHorizon: [255, 124, 84],
    lowSunZenith: [74, 136, 210],
    lowSunHorizon: [255, 205, 108],
    dayZenith: [48, 126, 205],
    dayHorizon: [198, 224, 241],
    highSunZenith: [43, 117, 196],
    highSunHorizon: [207, 231, 245]
  };

  var CONTRAST_SCHEMES = {
    light: {
      pageText: "#000000",
      frameBg: "#000000",
      frameText: "#ffffff",
      coverBorder: "#000000",
      darkCoverBorder: "transparent",
      purpleBorder: "purple",
      logoFilter: "none",
      logoBlendMode: "darken"
    },
    dark: {
      pageText: "#f1f1f1",
      frameBg: "#f1f1f1",
      frameText: "#050505",
      coverBorder: "transparent",
      darkCoverBorder: "#f1f1f1",
      purpleBorder: "#c08cff",
      logoFilter: "invert(1)",
      logoBlendMode: "lighten"
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

  function range(value, min, max) {
    return (value - min) / (max - min);
  }

  function mix(a, b, amount) {
    var t = smoothstep(amount);

    return [
      Math.round(a[0] + (b[0] - a[0]) * t),
      Math.round(a[1] + (b[1] - a[1]) * t),
      Math.round(a[2] + (b[2] - a[2]) * t)
    ];
  }

  function toHex(color) {
    return "#" + color.map(function (channel) {
      return clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0");
    }).join("");
  }

  function toDisplayP3(color) {
    return "color(display-p3 " + color.map(function (channel) {
      return (clamp(channel, 0, 255) / 255).toFixed(4);
    }).join(" ") + ")";
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
      solarNoonExact: solarNoon * 60,
      daylightHours: horizon.durationHours,
      declination: declination,
      latitudeRad: latitudeRad
    };
  }

  function getSolarAltitude(minutes, sunTimes) {
    var hourAngle = ((minutes - sunTimes.solarNoonExact) / 4) * DEG_TO_RAD;
    var altitude = Math.asin(
      Math.sin(sunTimes.latitudeRad) * Math.sin(sunTimes.declination) +
      Math.cos(sunTimes.latitudeRad) * Math.cos(sunTimes.declination) * Math.cos(hourAngle)
    );

    return altitude * RAD_TO_DEG;
  }

  function makeSky(zenith, horizon, solarAltitude, phase) {
    return {
      zenith: zenith,
      horizon: horizon,
      page: mix(zenith, horizon, 0.58),
      solarAltitude: solarAltitude,
      phase: phase
    };
  }

  function chooseSkyColors(minutes, sunTimes) {
    var solarAltitude = getSolarAltitude(minutes, sunTimes);
    var zenith = SKY_COLORS.nightZenith;
    var horizon = SKY_COLORS.nightHorizon;
    var phase = "night";
    var amount;

    if (solarAltitude < -18) {
      return makeSky(zenith, horizon, solarAltitude, phase);
    }

    if (solarAltitude < -12) {
      amount = range(solarAltitude, -18, -12);
      zenith = mix(SKY_COLORS.nightZenith, SKY_COLORS.astronomicalZenith, amount);
      horizon = mix(SKY_COLORS.nightHorizon, SKY_COLORS.astronomicalHorizon, amount);
      return makeSky(zenith, horizon, solarAltitude, "astronomical");
    }

    if (solarAltitude < -6) {
      amount = range(solarAltitude, -12, -6);
      zenith = mix(SKY_COLORS.astronomicalZenith, SKY_COLORS.nauticalZenith, amount);
      horizon = mix(SKY_COLORS.astronomicalHorizon, SKY_COLORS.nauticalHorizon, amount);
      return makeSky(zenith, horizon, solarAltitude, "nautical");
    }

    if (solarAltitude < -0.833) {
      amount = range(solarAltitude, -6, -0.833);
      zenith = mix(SKY_COLORS.nauticalZenith, SKY_COLORS.civilZenith, amount);
      horizon = mix(SKY_COLORS.nauticalHorizon, SKY_COLORS.civilHorizon, amount);
      return makeSky(zenith, horizon, solarAltitude, "civil");
    }

    if (solarAltitude < 4) {
      amount = range(solarAltitude, -0.833, 4);
      zenith = mix(SKY_COLORS.civilZenith, SKY_COLORS.lowSunZenith, amount);
      horizon = mix(SKY_COLORS.civilHorizon, SKY_COLORS.lowSunHorizon, amount);
      return makeSky(zenith, horizon, solarAltitude, "low-sun");
    }

    if (solarAltitude < 30) {
      amount = range(solarAltitude, 4, 30);
      zenith = mix(SKY_COLORS.lowSunZenith, SKY_COLORS.dayZenith, amount);
      horizon = mix(SKY_COLORS.lowSunHorizon, SKY_COLORS.dayHorizon, amount);
      return makeSky(zenith, horizon, solarAltitude, "day");
    }

    amount = range(solarAltitude, 30, 70);
    zenith = mix(SKY_COLORS.dayZenith, SKY_COLORS.highSunZenith, amount);
    horizon = mix(SKY_COLORS.dayHorizon, SKY_COLORS.highSunHorizon, amount);

    return makeSky(zenith, horizon, solarAltitude, "high-sun");
  }

  function getRelativeLuminance(color) {
    var channels = color.map(function (channel) {
      var normalized = channel / 255;

      return normalized <= 0.03928
        ? normalized / 12.92
        : Math.pow((normalized + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  function getReadableScheme(sky) {
    return getRelativeLuminance(sky.page) > 0.34 ? "light" : "dark";
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
    var sky = chooseSkyColors(minutes, sunTimes);
    var scheme = getReadableScheme(sky);

    return {
      color: toDisplayP3(sky.page),
      colorHex: toHex(sky.page),
      zenith: toDisplayP3(sky.zenith),
      zenithHex: toHex(sky.zenith),
      horizon: toDisplayP3(sky.horizon),
      horizonHex: toHex(sky.horizon),
      scheme: scheme,
      phase: sky.phase,
      solarAltitude: sky.solarAltitude,
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

  function applyContrastScheme(result) {
    var colors = CONTRAST_SCHEMES[result.scheme] || CONTRAST_SCHEMES.light;
    var root = document.documentElement;

    root.style.colorScheme = result.scheme;
    root.style.setProperty("--page-text", colors.pageText);
    root.style.setProperty("--frame-bg", colors.frameBg);
    root.style.setProperty("--frame-text", colors.frameText);
    root.style.setProperty("--cover-border", colors.coverBorder);
    root.style.setProperty("--dark-cover-border", colors.darkCoverBorder);
    root.style.setProperty("--purple-border", colors.purpleBorder);
    root.style.setProperty("--logo-filter", colors.logoFilter);
    root.style.setProperty("--logo-blend-mode", colors.logoBlendMode);
  }

  function apply(options) {
    var result = getColor(options || debugOptions);
    var root = document.documentElement;

    root.style.setProperty("--page-bg", result.color);
    root.style.setProperty("--sky-zenith", result.zenith);
    root.style.setProperty("--sky-horizon", result.horizon);
    root.dataset.skyPhase = result.phase;
    root.dataset.skyTone = result.scheme;
    applyContrastScheme(result);

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
