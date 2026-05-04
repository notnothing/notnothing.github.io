(function () {
  "use strict";

  function hasDebugFlag() {
    var params = new URLSearchParams(window.location.search);
    var value = params.get("sky-debug") || params.get("debug-sky");

    return value !== null && value !== "0" && value !== "false";
  }

  function getTodayDayOfYear() {
    var now = new Date();
    var start = new Date(now.getFullYear(), 0, 0);

    return Math.floor((now - start) / 86400000);
  }

  function getCurrentMinutes() {
    var now = new Date();

    return now.getHours() * 60 + now.getMinutes();
  }

  function pad(value) {
    return String(value).padStart(2, "0");
  }

  function formatTime(minutes) {
    var rounded = Math.round(minutes);
    var hours = Math.floor(rounded / 60) % 24;
    var mins = rounded % 60;

    return pad(hours) + ":" + pad(mins);
  }

  function formatDay(dayOfYear) {
    var now = new Date();
    var date = new Date(now.getFullYear(), 0, dayOfYear);

    return date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric"
    });
  }

  function formatDuration(hours) {
    var wholeHours = Math.floor(hours);
    var minutes = Math.round((hours - wholeHours) * 60);

    return wholeHours + "h " + pad(minutes) + "m";
  }

  function formatAngle(degrees) {
    return degrees.toFixed(1) + "deg";
  }

  function createField(labelText, input, value) {
    var label = document.createElement("label");
    var labelSpan = document.createElement("span");

    label.className = "sky-debug-field";
    labelSpan.textContent = labelText;
    value.className = "sky-debug-value";

    label.appendChild(labelSpan);
    label.appendChild(input);
    label.appendChild(value);

    return label;
  }

  function init() {
    if (!hasDebugFlag() || !window.NotNothingSkyBackground) {
      return;
    }

    var timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    var panel = document.createElement("aside");
    var title = document.createElement("strong");
    var timeInput = document.createElement("input");
    var timeValue = document.createElement("output");
    var dayInput = document.createElement("input");
    var dayValue = document.createElement("output");
    var schemeSelect = document.createElement("select");
    var schemeValue = document.createElement("output");
    var meta = document.createElement("p");
    var nowButton = document.createElement("button");

    panel.id = "sky-debug";
    title.textContent = "Sky debug";

    timeInput.type = "range";
    timeInput.min = "0";
    timeInput.max = "1439";
    timeInput.step = "5";
    timeInput.value = String(getCurrentMinutes());

    dayInput.type = "range";
    dayInput.min = "1";
    dayInput.max = "366";
    dayInput.step = "1";
    dayInput.value = String(getTodayDayOfYear());

    ["auto", "light", "dark"].forEach(function (scheme) {
      var option = document.createElement("option");

      option.value = scheme;
      option.textContent = scheme;
      schemeSelect.appendChild(option);
    });

    nowButton.type = "button";
    nowButton.textContent = "now";
    meta.className = "sky-debug-meta";

    function render() {
      var scheme = schemeSelect.value === "auto" ? undefined : schemeSelect.value;
      var result = window.NotNothingSkyBackground.setDebugOptions({
        minutes: Number(timeInput.value),
        dayOfYear: Number(dayInput.value),
        scheme: scheme,
        timeZone: timeZone
      });

      timeValue.value = formatTime(result.minutes);
      dayValue.value = formatDay(result.dayOfYear);
      schemeValue.value = result.scheme;
      meta.textContent = [
        "astro " + formatTime(result.astronomicalDawn) + "/" + formatTime(result.astronomicalDusk),
        "nautical " + formatTime(result.nauticalDawn) + "/" + formatTime(result.nauticalDusk),
        "civil " + formatTime(result.civilDawn) + "/" + formatTime(result.civilDusk),
        "sunrise " + formatTime(result.sunrise),
        "sunset " + formatTime(result.sunset),
        "alt " + formatAngle(result.solarAltitude),
        "zenith " + result.zenith,
        "horizon " + result.horizon,
        result.timeZone,
        formatDuration(result.daylightHours) + " daylight"
      ].join(" / ");
    }

    nowButton.addEventListener("click", function () {
      timeInput.value = String(getCurrentMinutes());
      dayInput.value = String(getTodayDayOfYear());
      schemeSelect.value = "auto";
      render();
    });

    [timeInput, dayInput, schemeSelect].forEach(function (input) {
      input.addEventListener("input", render);
      input.addEventListener("change", render);
    });

    panel.appendChild(title);
    panel.appendChild(createField("time", timeInput, timeValue));
    panel.appendChild(createField("day", dayInput, dayValue));
    panel.appendChild(createField("mode", schemeSelect, schemeValue));
    panel.appendChild(meta);
    panel.appendChild(nowButton);
    document.body.appendChild(panel);

    render();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
}());
