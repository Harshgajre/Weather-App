/**
 * Weather App - Open-Meteo Integration with 7-Day Real Forecast
 * Features:
 * - Default location: Ahmedabad, Gujarat, India (lat: 23.0225, lon: 72.5714)
 * - Open-Meteo Forecast & Geocoding APIs (No API key required)
 * - Unified single request for current weather + 7-day daily forecast
 * - 60-second automatic refresh with manual refresh control
 * - Location-aware timezone formatting for time & forecast days
 * - Full WMO weather code translation with visual icons
 * - Resilient error handling retaining prior valid data
 */

// Default configuration for Ahmedabad, Gujarat, India
const DEFAULT_LOCATION = {
    name: 'Ahmedabad',
    admin1: 'Gujarat',
    country: 'India',
    countryCode: 'IN',
    latitude: 23.0225,
    longitude: 72.5714,
    timezone: 'Asia/Kolkata'
};

// Auto-refresh interval duration in milliseconds (60 seconds)
const REFRESH_INTERVAL_MS = 60000;

// Application State
let currentLocation = { ...DEFAULT_LOCATION };
let refreshTimerId = null;
let isFetching = false;
let hasLoadedData = false;
let toastTimeoutId = null;
let isForecastVisible = false;

// DOM Elements - Search & Control
const searchBtn = document.getElementById('search-btn');
const cityInput = document.getElementById('city-input');
const refreshBtn = document.getElementById('refresh-btn');
const toggleForecastBtn = document.getElementById('toggle-forecast-btn');
const toggleForecastText = document.getElementById('toggle-forecast-text');

// DOM Elements - States & Containers
const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const weatherCard = document.getElementById('weather-card');
const weatherToast = document.getElementById('weather-toast');
const toastText = document.getElementById('toast-text');

// DOM Elements - Current Weather Display
const cityNameEl = document.getElementById('city-name');
const countryCodeEl = document.getElementById('country-code');
const lastUpdatedEl = document.getElementById('last-updated');

const weatherIconEl = document.getElementById('weather-icon');
const currentTempEl = document.getElementById('current-temp');
const weatherConditionEl = document.getElementById('weather-condition');

const feelsLikeEl = document.getElementById('feels-like');
const tempMinEl = document.getElementById('temp-min');
const tempMaxEl = document.getElementById('temp-max');

const humidityValEl = document.getElementById('humidity-val');
const windValEl = document.getElementById('wind-val');
const pressureValEl = document.getElementById('pressure-val');
const visibilityValEl = document.getElementById('visibility-val');

// DOM Elements - 7-Day Forecast Section
const forecastSection = document.getElementById('forecast-section');
const forecastCityNameEl = document.getElementById('forecast-city-name');
const forecastGrid = document.getElementById('forecast-grid');
const forecastError = document.getElementById('forecast-error');
const forecastRetryBtn = document.getElementById('forecast-retry-btn');

// DOM Elements - Hourly Forecast Section
const hourlySection = document.getElementById('hourly-section');
const hourlyGrid = document.getElementById('hourly-grid');
const hourlyError = document.getElementById('hourly-error');

/**
 * WMO Weather Interpretation Code Table
 * Maps WMO code to human-readable condition and visual assets
 */
const WMO_CODE_MAP = {
    0: { label: 'Clear Sky', fallback: 'weather/clear.jpg', iconDay: '01d', iconNight: '01n' },
    1: { label: 'Mainly Clear', fallback: 'weather/clear.jpg', iconDay: '02d', iconNight: '02n' },
    2: { label: 'Partly Cloudy', fallback: 'weather/cloud.png', iconDay: '03d', iconNight: '03n' },
    3: { label: 'Overcast', fallback: 'weather/cloud.png', iconDay: '04d', iconNight: '04n' },
    45: { label: 'Fog', fallback: 'weather/mist.jpg', iconDay: '50d', iconNight: '50n' },
    48: { label: 'Depositing Rime Fog', fallback: 'weather/mist.jpg', iconDay: '50d', iconNight: '50n' },
    51: { label: 'Light Drizzle', fallback: 'weather/rain.jpg', iconDay: '09d', iconNight: '09n' },
    53: { label: 'Moderate Drizzle', fallback: 'weather/rain.jpg', iconDay: '09d', iconNight: '09n' },
    55: { label: 'Dense Drizzle', fallback: 'weather/rain.jpg', iconDay: '09d', iconNight: '09n' },
    56: { label: 'Light Freezing Drizzle', fallback: 'weather/snow.jpg', iconDay: '13d', iconNight: '13n' },
    57: { label: 'Dense Freezing Drizzle', fallback: 'weather/snow.jpg', iconDay: '13d', iconNight: '13n' },
    61: { label: 'Slight Rain', fallback: 'weather/rain.jpg', iconDay: '10d', iconNight: '10n' },
    63: { label: 'Moderate Rain', fallback: 'weather/rain.jpg', iconDay: '10d', iconNight: '10n' },
    65: { label: 'Heavy Rain', fallback: 'weather/rain.jpg', iconDay: '10d', iconNight: '10n' },
    66: { label: 'Light Freezing Rain', fallback: 'weather/snow.jpg', iconDay: '13d', iconNight: '13n' },
    67: { label: 'Heavy Freezing Rain', fallback: 'weather/snow.jpg', iconDay: '13d', iconNight: '13n' },
    71: { label: 'Slight Snow Fall', fallback: 'weather/snow.jpg', iconDay: '13d', iconNight: '13n' },
    73: { label: 'Moderate Snow Fall', fallback: 'weather/snow.jpg', iconDay: '13d', iconNight: '13n' },
    75: { label: 'Heavy Snow Fall', fallback: 'weather/snow.jpg', iconDay: '13d', iconNight: '13n' },
    77: { label: 'Snow Grains', fallback: 'weather/snow.jpg', iconDay: '13d', iconNight: '13n' },
    80: { label: 'Slight Rain Showers', fallback: 'weather/rain.jpg', iconDay: '09d', iconNight: '09n' },
    81: { label: 'Moderate Rain Showers', fallback: 'weather/rain.jpg', iconDay: '09d', iconNight: '09n' },
    82: { label: 'Violent Rain Showers', fallback: 'weather/rain.jpg', iconDay: '09d', iconNight: '09n' },
    85: { label: 'Slight Snow Showers', fallback: 'weather/snow.jpg', iconDay: '13d', iconNight: '13n' },
    86: { label: 'Heavy Snow Showers', fallback: 'weather/snow.jpg', iconDay: '13d', iconNight: '13n' },
    95: { label: 'Thunderstorm', fallback: 'weather/rain.jpg', iconDay: '11d', iconNight: '11n' },
    96: { label: 'Thunderstorm With Slight Hail', fallback: 'weather/rain.jpg', iconDay: '11d', iconNight: '11n' },
    99: { label: 'Thunderstorm With Heavy Hail', fallback: 'weather/rain.jpg', iconDay: '11d', iconNight: '11n' },
};

/**
 * Resolve WMO code to human readable label & icon URLs
 */
function resolveWeatherCondition(weatherCode, isDay = 1) {
    const codeInfo = WMO_CODE_MAP[weatherCode] || {
        label: 'Scattered Clouds',
        fallback: 'weather/cloud.png',
        iconDay: '03d',
        iconNight: '03n'
    };

    const iconCode = isDay ? codeInfo.iconDay : codeInfo.iconNight;
    const remoteIconUrl = `https://openweathermap.org/img/wn/${iconCode}@4x.png`;

    return {
        label: codeInfo.label,
        remoteIconUrl,
        fallbackIconUrl: codeInfo.fallback
    };
}

/**
 * Format timestamp into HH:MM:SS using the location's local timezone
 */
function getFormattedTime(timeZone) {
    const now = new Date();
    try {
        return new Intl.DateTimeFormat('en-GB', {
            timeZone: timeZone || 'UTC',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        }).format(now);
    } catch {
        return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    }
}

/**
 * Format day label in location's timezone:
 * - 1st day (index 0) => "Today"
 * - 2nd day (index 1) => "Tomorrow"
 * - Remaining days => Short weekday name (e.g. "Mon", "Tue", "Wed")
 */
function formatForecastDay(dateString, index, timeZone) {
    if (index === 0) {
        return { label: 'Today', isToday: true };
    }
    if (index === 1) {
        return { label: 'Tomorrow', isToday: false };
    }

    try {
        // Appending T12:00:00Z ensures the date doesn't shift unexpectedly across timezones
        const dateObj = new Date(`${dateString}T12:00:00Z`);
        const weekday = new Intl.DateTimeFormat('en-US', {
            timeZone: timeZone || 'UTC',
            weekday: 'short'
        }).format(dateObj);
        return { label: weekday, isToday: false };
    } catch {
        return { label: `Day ${index + 1}`, isToday: false };
    }
}

/**
 * Format short date (e.g., "24 Aug") in location's timezone
 */
function formatForecastDate(dateString, timeZone) {
    try {
        const dateObj = new Date(`${dateString}T12:00:00Z`);
        return new Intl.DateTimeFormat('en-US', {
            timeZone: timeZone || 'UTC',
            day: 'numeric',
            month: 'short'
        }).format(dateObj);
    } catch {
        return dateString.slice(5);
    }
}

/**
 * Display non-intrusive toast notification for errors during background refreshes
 */
function showToast(message, duration = 4000) {
    if (!weatherToast || !toastText) return;
    toastText.textContent = message;
    weatherToast.classList.remove('hidden');

    if (toastTimeoutId) {
        clearTimeout(toastTimeoutId);
    }
    toastTimeoutId = setTimeout(() => {
        weatherToast.classList.add('hidden');
    }, duration);
}

function hideToast() {
    if (weatherToast) {
        weatherToast.classList.add('hidden');
    }
}

/**
 * Set Main UI State: 'loading' | 'error' | 'content'
 */
function setUIState(state, message = '') {
    if (state === 'loading') {
        loadingState.classList.remove('hidden');
        errorState.classList.add('hidden');
        weatherCard.classList.add('hidden');
        if (hourlySection) hourlySection.classList.add('hidden');
        if (forecastSection) forecastSection.classList.add('hidden');
    } else if (state === 'error') {
        loadingState.classList.add('hidden');
        errorState.classList.remove('hidden');
        weatherCard.classList.add('hidden');
        if (hourlySection) hourlySection.classList.add('hidden');
        if (forecastSection) forecastSection.classList.add('hidden');
        if (message && errorMessage) {
            errorMessage.textContent = message;
        }
    } else if (state === 'content') {
        loadingState.classList.add('hidden');
        errorState.classList.add('hidden');
        weatherCard.classList.remove('hidden');
        if (hourlySection) hourlySection.classList.remove('hidden');
        if (forecastSection) {
            if (isForecastVisible) {
                forecastSection.classList.remove('hidden');
            } else {
                forecastSection.classList.add('hidden');
            }
        }
    }
}

/**
 * Toggle 7-Day Forecast visibility
 */
function toggleForecast() {
    isForecastVisible = !isForecastVisible;
    if (forecastSection) {
        if (isForecastVisible) {
            forecastSection.classList.remove('hidden');
            if (toggleForecastText) toggleForecastText.textContent = 'Hide 7 Days Weather';
            if (toggleForecastBtn) {
                toggleForecastBtn.classList.add('active');
                toggleForecastBtn.setAttribute('aria-expanded', 'true');
            }
        } else {
            forecastSection.classList.add('hidden');
            if (toggleForecastText) toggleForecastText.textContent = 'Check 7 Days Weather';
            if (toggleForecastBtn) {
                toggleForecastBtn.classList.remove('active');
                toggleForecastBtn.setAttribute('aria-expanded', 'false');
            }
        }
    }
}

/**
 * Render 8 Skeleton Placeholder Cards while Hourly Forecast is loading
 */
function renderHourlySkeleton() {
    if (!hourlyGrid) return;
    let skeletonHtml = '';
    for (let i = 0; i < 8; i++) {
        skeletonHtml += `
            <div class="hourly-skeleton" aria-hidden="true">
                <div class="skeleton-shimmer"></div>
                <div class="skeleton-line time"></div>
                <div class="skeleton-circle"></div>
                <div class="skeleton-line temp"></div>
                <div class="skeleton-line cond"></div>
                <div class="skeleton-line rain"></div>
            </div>
        `;
    }
    hourlyGrid.innerHTML = skeletonHtml;
    if (hourlyError) hourlyError.classList.add('hidden');
}

/**
 * Show Hourly Error banner while preserving current weather display
 */
function showHourlyError() {
    if (hourlyError) hourlyError.classList.remove('hidden');
    if (hourlyGrid) hourlyGrid.innerHTML = '';
}

/**
 * Render 7 Skeleton Placeholder Cards while Forecast is loading
 */
function renderForecastSkeleton() {
    if (!forecastGrid) return;
    let skeletonHtml = '';
    for (let i = 0; i < 7; i++) {
        skeletonHtml += `
            <div class="forecast-skeleton" aria-hidden="true">
                <div class="skeleton-shimmer"></div>
                <div class="skeleton-line day"></div>
                <div class="skeleton-line date"></div>
                <div class="skeleton-circle"></div>
                <div class="skeleton-line cond"></div>
                <div class="skeleton-line temp"></div>
                <div class="skeleton-line stat"></div>
                <div class="skeleton-line stat"></div>
            </div>
        `;
    }
    forecastGrid.innerHTML = skeletonHtml;
    if (forecastError) forecastError.classList.add('hidden');
}

/**
 * Show Forecast Error banner while preserving current weather display
 */
function showForecastError() {
    if (forecastError) forecastError.classList.remove('hidden');
    if (forecastGrid) forecastGrid.innerHTML = '';
}

/**
 * Fetch real weather data from Open-Meteo for a given location object
 * Unified request fetching current weather + 24-hour hourly forecast + 7-day daily forecast
 * @param {Object} location - Location metadata with coordinates and timezone
 * @param {boolean} isBackground - If true, performs non-destructive background update
 */
async function fetchWeatherData(location = currentLocation, isBackground = false) {
    if (isFetching) return;
    isFetching = true;

    if (refreshBtn) {
        refreshBtn.classList.add('spinning');
    }

    // Only switch to full-screen loading state if we have no prior data or during a new search
    if (!isBackground && !hasLoadedData) {
        setUIState('loading');
    } else if (!isBackground) {
        renderHourlySkeleton();
        renderForecastSkeleton();
    }

    try {
        const { latitude, longitude, timezone } = location;
        const tzParam = timezone ? encodeURIComponent(timezone) : 'auto';

        // Unified Open-Meteo Forecast endpoint requesting current weather + hourly (24h) + daily (7d)
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility&hourly=temperature_2m,weather_code,precipitation_probability,is_day&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,precipitation_sum,wind_speed_10m_max&timezone=${tzParam}`;

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Open-Meteo API returned HTTP status ${response.status}`);
        }

        const data = await response.json();
        if (!data || !data.current) {
            throw new Error('Invalid weather data structure returned by API');
        }

        // Update current active location and render
        currentLocation = {
            ...location,
            timezone: data.timezone || location.timezone || 'UTC'
        };

        // Render current weather
        renderWeather(data, currentLocation);

        // Render hourly forecast
        if (data.hourly && Array.isArray(data.hourly.time) && data.hourly.time.length > 0) {
            renderHourly(data.hourly, currentLocation);
        } else {
            showHourlyError();
        }

        // Render 7-day forecast
        if (data.daily && Array.isArray(data.daily.time) && data.daily.time.length > 0) {
            renderForecast(data.daily, currentLocation);
        } else {
            showForecastError();
        }

        hasLoadedData = true;
        hideToast();
        setUIState('content');
    } catch (error) {
        console.error('Weather fetch error:', error);
        if (hasLoadedData) {
            // Keep previous weather data visible and notify user
            showToast('Unable to fetch the latest weather data.');
        } else {
            setUIState('error', 'Unable to fetch weather data. Please check your network connection and retry.');
        }
    } finally {
        isFetching = false;
        if (refreshBtn) {
            refreshBtn.classList.remove('spinning');
        }
    }
}

/**
 * Render real current weather data into the UI
 */
function renderWeather(data, location) {
    const current = data.current;
    const daily = data.daily;

    // 1. Location Header
    cityNameEl.textContent = location.name || 'Ahmedabad';

    // Format subtitle/badge: "State, Country" or "Country"
    let locationSubtitle = '';
    if (location.admin1 && location.country && location.admin1 !== location.name) {
        locationSubtitle = `${location.admin1}, ${location.country}`;
    } else if (location.country) {
        locationSubtitle = location.country;
    } else if (location.countryCode) {
        locationSubtitle = location.countryCode;
    }

    if (locationSubtitle) {
        countryCodeEl.textContent = locationSubtitle;
        countryCodeEl.style.display = 'inline-block';
    } else {
        countryCodeEl.style.display = 'none';
    }

    // 2. Location-aware Last Updated timestamp (HH:MM:SS)
    const formattedTime = getFormattedTime(location.timezone);
    lastUpdatedEl.textContent = `Last updated: ${formattedTime}`;

    // 3. Condition & Icon
    const weatherCode = current.weather_code !== undefined ? current.weather_code : 0;
    const isDay = current.is_day !== undefined ? current.is_day : 1;
    const conditionInfo = resolveWeatherCondition(weatherCode, isDay);

    weatherConditionEl.textContent = conditionInfo.label;
    weatherIconEl.src = conditionInfo.remoteIconUrl;
    weatherIconEl.alt = `${conditionInfo.label} icon`;
    weatherIconEl.onerror = () => {
        weatherIconEl.src = conditionInfo.fallbackIconUrl;
    };

    // 4. Main Temperatures & Daily Min/Max
    const tempVal = current.temperature_2m !== undefined ? Math.round(current.temperature_2m) : '--';
    const feelsLikeVal = current.apparent_temperature !== undefined ? Math.round(current.apparent_temperature) : tempVal;

    // Daily min/max from API response
    const tempMinVal = (daily && daily.temperature_2m_min && daily.temperature_2m_min[0] !== undefined)
        ? Math.round(daily.temperature_2m_min[0])
        : tempVal;
    const tempMaxVal = (daily && daily.temperature_2m_max && daily.temperature_2m_max[0] !== undefined)
        ? Math.round(daily.temperature_2m_max[0])
        : tempVal;

    currentTempEl.textContent = tempVal;
    feelsLikeEl.textContent = `${feelsLikeVal}°C`;
    tempMinEl.textContent = `${tempMinVal}°C`;
    tempMaxEl.textContent = `${tempMaxVal}°C`;

    // 5. Details Section (All from real API values)
    // Humidity (%)
    humidityValEl.textContent = current.relative_humidity_2m !== undefined
        ? `${current.relative_humidity_2m}%`
        : 'N/A';

    // Wind Speed (km/h)
    windValEl.textContent = current.wind_speed_10m !== undefined
        ? `${Math.round(current.wind_speed_10m)} km/h`
        : 'N/A';

    // Atmospheric Pressure (hPa)
    const pressure = current.pressure_msl ?? current.surface_pressure;
    pressureValEl.textContent = pressure !== undefined
        ? `${Math.round(pressure)} hPa`
        : 'N/A';

    // Visibility (Convert meters to km)
    if (current.visibility !== undefined) {
        const visKm = (current.visibility / 1000).toFixed(1);
        visibilityValEl.textContent = `${visKm} km`;
    } else {
        visibilityValEl.textContent = 'N/A';
    }
}

/**
 * Find the starting index for current hour in location's timezone
 */
function findCurrentHourIndex(times, timeZone) {
    if (!times || times.length === 0) return 0;
    try {
        const now = new Date();
        const formatter = new Intl.DateTimeFormat('en-CA', {
            timeZone: timeZone || 'UTC',
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            hour12: false
        });
        const parts = formatter.formatToParts(now);
        const year = parts.find(p => p.type === 'year')?.value;
        const month = parts.find(p => p.type === 'month')?.value;
        const day = parts.find(p => p.type === 'day')?.value;
        let hour = parts.find(p => p.type === 'hour')?.value;
        if (hour === '24') hour = '00';

        const currentPrefix = `${year}-${month}-${day}T${hour}`;
        const index = times.findIndex(t => t.startsWith(currentPrefix));
        return index >= 0 ? index : 0;
    } catch {
        return 0;
    }
}

/**
 * Format hourly time: "Now" for current hour, or "10 AM", "11 AM", "12 PM"
 */
function formatHourlyTime(isoString, isFirst, timeZone) {
    if (isFirst) return 'Now';
    try {
        const dateObj = new Date(`${isoString}:00Z`);
        return new Intl.DateTimeFormat('en-US', {
            timeZone: 'UTC', // ISO string already corresponds to local time in that timezone
            hour: 'numeric',
            hour12: true
        }).format(dateObj);
    } catch {
        return isoString.slice(11, 16);
    }
}

/**
 * Render Hourly Forecast Cards (next 24 hours) from real Open-Meteo hourly dataset
 * @param {Object} hourly - Open-Meteo hourly forecast dataset
 * @param {Object} location - Active location metadata
 */
function renderHourly(hourly, location) {
    if (!hourlyGrid) return;
    if (hourlyError) hourlyError.classList.add('hidden');

    const times = hourly.time || [];
    if (times.length === 0) {
        showHourlyError();
        return;
    }

    const startIndex = findCurrentHourIndex(times, location.timezone);
    const endIndex = Math.min(startIndex + 24, times.length);
    const cards = [];

    for (let i = startIndex; i < endIndex; i++) {
        const isFirst = (i === startIndex);
        const timeStr = times[i];
        const displayTime = formatHourlyTime(timeStr, isFirst, location.timezone);

        const weatherCode = hourly.weather_code ? hourly.weather_code[i] : 0;
        const isDay = hourly.is_day ? hourly.is_day[i] : 1;
        const conditionInfo = resolveWeatherCondition(weatherCode, isDay);

        const tempVal = (hourly.temperature_2m && hourly.temperature_2m[i] !== undefined)
            ? `${Math.round(hourly.temperature_2m[i])}°C`
            : '--';

        const rainProbVal = (hourly.precipitation_probability && hourly.precipitation_probability[i] !== undefined && hourly.precipitation_probability[i] !== null)
            ? `${hourly.precipitation_probability[i]}%`
            : '0%';

        const card = document.createElement('div');
        card.className = `hourly-card${isFirst ? ' is-now' : ''}`;
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `${displayTime}: ${conditionInfo.label}, ${tempVal}, Rain chance ${rainProbVal}`);

        card.innerHTML = `
            <span class="hourly-time">${displayTime}</span>
            <div class="hourly-icon-wrap">
                <img class="hourly-icon" src="${conditionInfo.remoteIconUrl}" alt="${conditionInfo.label}" loading="lazy" />
            </div>
            <span class="hourly-temp">${tempVal}</span>
            <span class="hourly-condition" title="${conditionInfo.label}">${conditionInfo.label}</span>
            <div class="hourly-rain" title="Rain probability">
                <span class="material-symbols-outlined hourly-rain-icon">water_drop</span>
                <span>${rainProbVal}</span>
            </div>
        `;

        const img = card.querySelector('.hourly-icon');
        if (img) {
            img.onerror = () => {
                img.src = conditionInfo.fallbackIconUrl;
            };
        }

        cards.push(card);
    }

    hourlyGrid.innerHTML = '';
    cards.forEach(card => hourlyGrid.appendChild(card));
}

/**
 * Render 7-Day Forecast Cards from real Open-Meteo daily arrays
 * @param {Object} daily - Open-Meteo daily forecast dataset
 * @param {Object} location - Active location metadata
 */
function renderForecast(daily, location) {
    if (!forecastGrid) return;

    if (forecastCityNameEl) {
        forecastCityNameEl.textContent = location.name || 'Ahmedabad';
    }

    if (forecastError) {
        forecastError.classList.add('hidden');
    }

    const times = daily.time || [];
    const totalDays = Math.min(times.length, 7);

    if (totalDays === 0) {
        showForecastError();
        return;
    }

    const cardElements = [];

    for (let i = 0; i < totalDays; i++) {
        const dateStr = times[i];
        const dayInfo = formatForecastDay(dateStr, i, location.timezone);
        const formattedDate = formatForecastDate(dateStr, location.timezone);

        const weatherCode = daily.weather_code ? daily.weather_code[i] : 0;
        const conditionInfo = resolveWeatherCondition(weatherCode, 1); // Daytime iconography for daily overview

        const maxTemp = (daily.temperature_2m_max && daily.temperature_2m_max[i] !== undefined)
            ? Math.round(daily.temperature_2m_max[i])
            : '--';
        const minTemp = (daily.temperature_2m_min && daily.temperature_2m_min[i] !== undefined)
            ? Math.round(daily.temperature_2m_min[i])
            : '--';

        const rainProb = (daily.precipitation_probability_max && daily.precipitation_probability_max[i] !== undefined && daily.precipitation_probability_max[i] !== null)
            ? `${daily.precipitation_probability_max[i]}%`
            : '0%';

        const precipSum = (daily.precipitation_sum && daily.precipitation_sum[i] !== undefined && daily.precipitation_sum[i] !== null)
            ? daily.precipitation_sum[i]
            : 0;

        const windSpeed = (daily.wind_speed_10m_max && daily.wind_speed_10m_max[i] !== undefined && daily.wind_speed_10m_max[i] !== null)
            ? `${Math.round(daily.wind_speed_10m_max[i])} km/h`
            : 'N/A';

        // Additional precipitation sum badge if rainfall is present
        const precipLabel = precipSum > 0 ? ` (${precipSum.toFixed(1)}mm)` : '';

        const card = document.createElement('div');
        card.className = `forecast-card${dayInfo.isToday ? ' is-today' : ''}`;
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `${dayInfo.label}, ${formattedDate}: ${conditionInfo.label}, High ${maxTemp}°C, Low ${minTemp}°C`);

        card.innerHTML = `
            <div class="forecast-day-wrap">
                <span class="forecast-day">${dayInfo.label}</span>
                <span class="forecast-date">${formattedDate}</span>
            </div>

            <div class="forecast-icon-box">
                <div class="forecast-icon-glow"></div>
                <img 
                    class="forecast-icon" 
                    src="${conditionInfo.remoteIconUrl}" 
                    alt="${conditionInfo.label}" 
                    loading="lazy"
                />
            </div>

            <p class="forecast-condition" title="${conditionInfo.label}">${conditionInfo.label}</p>

            <div class="forecast-temps">
                <span class="forecast-temp-max">${maxTemp}°</span>
                <span class="forecast-temp-min">${minTemp}°</span>
            </div>

            <div class="forecast-metrics">
                <div class="forecast-metric-item" title="Precipitation Probability & Amount">
                    <span class="material-symbols-outlined forecast-metric-icon rain">water_drop</span>
                    <span class="forecast-metric-val">${rainProb}${precipLabel}</span>
                </div>
                <div class="forecast-metric-item" title="Max Wind Speed">
                    <span class="material-symbols-outlined forecast-metric-icon wind">air</span>
                    <span class="forecast-metric-val">${windSpeed}</span>
                </div>
            </div>
        `;

        // Handle image loading error with fallback asset
        const imgEl = card.querySelector('.forecast-icon');
        if (imgEl) {
            imgEl.onerror = () => {
                imgEl.src = conditionInfo.fallbackIconUrl;
            };
        }

        cardElements.push(card);
    }

    forecastGrid.innerHTML = '';
    cardElements.forEach(card => forecastGrid.appendChild(card));
}

/**
 * Search city coordinates using Open-Meteo Geocoding API
 */
async function searchCity(cityName) {
    const query = cityName.trim();
    if (!query) return;

    // Check if user searched specifically for Ahmedabad
    if (query.toLowerCase() === 'ahmedabad') {
        currentLocation = { ...DEFAULT_LOCATION };
        await fetchWeatherData(currentLocation, false);
        return;
    }

    setUIState('loading');
    if (refreshBtn) {
        refreshBtn.classList.add('spinning');
    }

    try {
        const geocodeUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=1&language=en&format=json`;
        const response = await fetch(geocodeUrl);
        if (!response.ok) {
            throw new Error(`Geocoding failed with status ${response.status}`);
        }

        const data = await response.json();
        if (!data.results || data.results.length === 0) {
            setUIState('error', `We couldn't find "${query}". Please check the spelling and try again.`);
            return;
        }

        const firstResult = data.results[0];
        const newLocation = {
            name: firstResult.name,
            admin1: firstResult.admin1 || '',
            country: firstResult.country || '',
            countryCode: firstResult.country_code || '',
            latitude: firstResult.latitude,
            longitude: firstResult.longitude,
            timezone: firstResult.timezone || 'auto'
        };

        currentLocation = newLocation;
        await fetchWeatherData(currentLocation, false);
    } catch (error) {
        console.error('Geocoding search error:', error);
        setUIState('error', `Unable to search for "${query}". Please verify your network and try again.`);
    } finally {
        if (refreshBtn) {
            refreshBtn.classList.remove('spinning');
        }
    }
}

/**
 * Start or restart the 60-second automatic refresh timer
 */
function startAutoRefresh() {
    if (refreshTimerId) {
        clearInterval(refreshTimerId);
    }

    refreshTimerId = setInterval(() => {
        // Automatically refresh in the background every 60 seconds
        fetchWeatherData(currentLocation, true);
    }, REFRESH_INTERVAL_MS);
}

/**
 * Event Listeners & Initialization
 */
function setupEventListeners() {
    // Search Button Click
    searchBtn?.addEventListener('click', () => {
        searchCity(cityInput.value);
    });

    // Enter Key in Search Input
    cityInput?.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            searchCity(cityInput.value);
        }
    });

    // Manual Refresh Button Click
    refreshBtn?.addEventListener('click', () => {
        fetchWeatherData(currentLocation, hasLoadedData);
        // Reset timer on manual refresh so next auto-refresh is in 60s
        startAutoRefresh();
    });

    // Forecast Error Retry Button Click
    forecastRetryBtn?.addEventListener('click', () => {
        fetchWeatherData(currentLocation, false);
    });

    // Toggle 7-Day Forecast Button Click
    toggleForecastBtn?.addEventListener('click', toggleForecast);

    // Clean up timer on window unload
    window.addEventListener('beforeunload', () => {
        if (refreshTimerId) {
            clearInterval(refreshTimerId);
            refreshTimerId = null;
        }
        if (toastTimeoutId) {
            clearTimeout(toastTimeoutId);
            toastTimeoutId = null;
        }
    });
}

// Initial application bootstrap
window.addEventListener('DOMContentLoaded', () => {
    setupEventListeners();
    // 1. Immediately fetch weather and 7-day forecast for default location (Ahmedabad)
    fetchWeatherData(DEFAULT_LOCATION, false);
    // 2. Start the 60-second automatic refresh timer
    startAutoRefresh();
});