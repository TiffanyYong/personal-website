let map;
let countiesLayer;
let markersLayer;

let habData = null;
let currentIndex = 0;
let playing = false;
let playTimer = null;

function formatMonthLabel(isoDateStr) {
  const d = new Date(isoDateStr);
  if (isNaN(d.getTime())) return isoDateStr;
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun",
                      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const m = monthNames[d.getUTCMonth()];
  const y = d.getUTCFullYear();
  return `${m}\u00a0${y}`;
}

function updateMonthDisplay() {
  if (!habData) return;

  const month = habData.months[currentIndex];
  const displayEl = document.getElementById("month-display");
  if (!displayEl) return;

  displayEl.textContent = formatMonthLabel(month);

  positionMonthBubble();
}

function positionMonthBubble() {
  const slider = document.getElementById("month-slider");
  const bubble = document.getElementById("month-display");
  const block  = document.getElementById("slider-block");
  const minLbl = document.getElementById("min-month-label");
  const maxLbl = document.getElementById("max-month-label");

  if (!slider || !bubble || !block) return;

  const sliderRect = slider.getBoundingClientRect();
  const blockRect  = block.getBoundingClientRect();

  const min = Number(slider.min);
  const max = Number(slider.max);
  const val = Number(slider.value);

  if (!isFinite(min) || !isFinite(max) || max <= min) return;

  const fraction = (val - min) / (max - min);

  const thumbWidth = 14; 
  const trackLeft   = sliderRect.left + thumbWidth / 2;
  const trackWidth  = sliderRect.width - thumbWidth;
  const thumbCenter = trackLeft + fraction * trackWidth;

  const leftInBlock = thumbCenter - blockRect.left;
  bubble.style.left = `${leftInBlock}px`;

  const hideThreshold = 0.06;

  if (minLbl) {
    minLbl.style.visibility = fraction < hideThreshold ? "hidden" : "visible";
  }
  if (maxLbl) {
    maxLbl.style.visibility = fraction > (1 - hideThreshold) ? "hidden" : "visible";
  }
}


function drawPointsForCurrentMonth() {
  if (!habData) return;

  if (!markersLayer) {
    markersLayer = L.layerGroup().addTo(map);
  } else {
    markersLayer.clearLayers();
  }

  const monthObj = habData.data[currentIndex] || {};
  const pointsArray = Object.values(monthObj);

  console.log(
    `Drawing month index ${currentIndex}, points: ${pointsArray.length}`
  );

  pointsArray.forEach((pt) => {
    const lat = pt.lat;
    const lon = pt.lon;
    if (lat == null || lon == null) return;

    L.circleMarker([lat, lon], {
      radius: 6,
      color: "black",
      weight: 1,
      fillColor: pt.fillColor || "red",
      fillOpacity: pt.fillOpacity ?? 0.8
    })
      .bindPopup(pt.popup || "")
      .addTo(markersLayer);
  });
}

function stepForward() {
  if (!habData) return;

  if (currentIndex >= habData.months.length - 1) {
    playing = false;
    if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
    }
    const iconEl = document.getElementById("play-icon");
    if (iconEl) {
      iconEl.classList.remove("fa-pause");
      iconEl.classList.add("fa-play");
    }
    return;
  }

  currentIndex += 1;
  const slider = document.getElementById("month-slider");
  if (slider) {
    slider.value = currentIndex;
  }
  updateMonthDisplay();
  drawPointsForCurrentMonth();
}

function togglePlay() {
  if (!habData) return;

  const iconEl = document.getElementById("play-icon");

  if (playing) {
    playing = false;
    if (iconEl) {
      iconEl.classList.remove("fa-pause");
      iconEl.classList.add("fa-play");
    }
    if (playTimer) {
      clearInterval(playTimer);
      playTimer = null;
    }
  } else {
    playing = true;
    if (iconEl) {
      iconEl.classList.remove("fa-play");
      iconEl.classList.add("fa-pause");
    }
    // 2 seconds per month
    playTimer = setInterval(stepForward, 1000);
  }
}

async function init() {
  console.log("hab.js loaded, init starting");

  // Map ---------------------------------------------------------
  map = L.map("map").setView([27.5, -82.5], 7);

  L.tileLayer(
    "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",
    {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors ' +
        '&copy; <a href="https://carto.com/attributions">CARTO</a> | ' +
        'Data: <a href="https://geodata.myfwc.com/search?tags=Red%2520tide" target="_blank">Florida Fish and Wildlife Conservation Commission</a>'
    }
  ).addTo(map);

  // Florida counties --------------------------------------------
  try {
    const countiesResp = await fetch("data/fl_counties.geojson");
    const countiesGeo = await countiesResp.json();

    countiesLayer = L.geoJSON(countiesGeo, {
      style: {
        color: "grey",
        weight: 0.5,
        fill: false
      }
    }).addTo(map);
  } catch (e) {
    console.error("Error loading counties:", e);
  }

  // HAB static JSON ---------------------------------------------
  try {
    const habResp = await fetch("data/hab_static.json");
    habData = await habResp.json();
  } catch (e) {
    console.error("Error loading HAB data:", e);
    return;
  }

  if (
    !habData ||
    !Array.isArray(habData.months) ||
    !Array.isArray(habData.data)
  ) {
    console.error("HAB data malformed:", habData);
    return;
  }

  console.log("HAB months:", habData.months.length);

  // Endpoint labels ---------------------------------------------
  const firstMonth = habData.months[0];
  const lastMonth  = habData.months[habData.months.length - 1];

  const minLabelEl = document.getElementById("min-month-label");
  const maxLabelEl = document.getElementById("max-month-label");
  if (minLabelEl) minLabelEl.textContent = formatMonthLabel(firstMonth);
  if (maxLabelEl) maxLabelEl.textContent = formatMonthLabel(lastMonth);

  // Year ticks spaced by time -----------------------------------
  const yearTicksEl = document.getElementById("year-ticks");
  if (yearTicksEl) {
    yearTicksEl.innerHTML = "";

    const firstMonthDate = new Date(firstMonth);
    let firstYear = firstMonthDate.getUTCFullYear();
    const lastYear  = new Date(lastMonth).getUTCFullYear();
    const nMonths   = habData.months.length;

    const firstMonthNum = firstMonthDate.getUTCMonth();  // 0 = Jan
    if (firstMonthNum > 0) {
    firstYear += 1;
    }

    const tickYears = [];
    tickYears.push(firstYear);

    const firstDecade = Math.ceil((firstYear + 1) / 10) * 10;
    for (let y = firstDecade; y < lastYear; y += 10) {
      tickYears.push(y);
    }
    if (lastYear !== firstYear) {
      tickYears.push(lastYear);
    }

    tickYears.forEach((y) => {
      const idxYear = habData.months.findIndex((m) => m.startsWith(y + "-"));
      if (idxYear === -1) return;

      const pct = (nMonths > 1) ? (idxYear / (nMonths - 1)) * 100 : 0;

      const span = document.createElement("span");
      span.textContent = y;
      span.style.left = pct + "%";
      yearTicksEl.appendChild(span);
    });
  }

  // Slider setup ------------------------------------------------
  const defaultMonthStr = "2000-01-01";
  let defaultIndex = 0;
  const idx = habData.months.indexOf(defaultMonthStr);
  if (idx !== -1) {
    defaultIndex = idx;
  }

  const slider = document.getElementById("month-slider");
  if (!slider) {
    console.error("month-slider element not found");
    return;
  }

  slider.min = 0;
  slider.max = habData.months.length - 1;
  slider.value = defaultIndex;
  currentIndex = defaultIndex;

  slider.addEventListener("input", () => {
    currentIndex = parseInt(slider.value, 10);
    updateMonthDisplay();
    drawPointsForCurrentMonth();
  });

  const playBtn = document.getElementById("play-button");
  if (playBtn) {
    playBtn.addEventListener("click", togglePlay);
  }

  // Legend ------------------------------------------------------
  const legend = L.control({ position: "bottomright" });
  legend.onAdd = function () {
    const div = L.DomUtil.create("div", "hab-legend");
    div.innerHTML =
      '<div class="hab-legend-title">Max K. brevis count at location</div>' +
      '<div class="hab-legend-row">' +
        '<span class="hab-legend-swatch swatch-0"></span>0–1,000' +
      '</div>' +
      '<div class="hab-legend-row">' +
        '<span class="hab-legend-swatch swatch-1"></span>1,000–10,000' +
      '</div>' +
      '<div class="hab-legend-row">' +
        '<span class="hab-legend-swatch swatch-2"></span>10,000–100,000' +
      '</div>' +
      '<div class="hab-legend-row">' +
        '<span class="hab-legend-swatch swatch-3"></span>100,000–1,000,000' +
      '</div>' +
      '<div class="hab-legend-row">' +
        '<span class="hab-legend-swatch swatch-4"></span>>1,000,000' +
      '</div>';
    return div;
  };
  legend.addTo(map);

  // Initial render ----------------------------------------------
  updateMonthDisplay();
  drawPointsForCurrentMonth();
}

window.addEventListener("load", init);
