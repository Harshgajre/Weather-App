/**
 * Weather App - Open-Meteo Integration
 * Features:
 * - Default location: Ahmedabad, Gujarat, India (lat: 23.0225, lon: 72.5714)
 * - Open-Meteo Forecast & Geocoding APIs (No API key required)
 * - 60-second automatic refresh with manual refresh control
 * - Location-aware timezone formatting (HH:MM:SS)
 * - Full WMO weather code translation
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

// DOM Elements
const searchBtn = document.getElementById('search-btn');
const cityInput = document.getElementById('city-input');
const refreshBtn = document.getElementById('refresh-btn');

const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const weatherCard = document.getElementById('weather-card');
const weatherToast = document.getElementById('weather-toast');
const toastText = document.getElementById('toast-text');

// Data Display Elements
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
 * Set UI State: 'loading' | 'error' | 'content'
 */
function setUIState(state, message = '') {
    if (state === 'loading') {
        loadingState.classList.remove('hidden');
        errorState.classList.add('hidden');
        weatherCard.classList.add('hidden');
    } else if (state === 'error') {
        loadingState.classList.add('hidden');
        errorState.classList.remove('hidden');
        weatherCard.classList.add('hidden');
        if (message && errorMessage) {
            errorMessage.textContent = message;
        }
    } else if (state === 'content') {
        loadingState.classList.add('hidden');
        errorState.classList.add('hidden');
        weatherCard.classList.remove('hidden');
    }
}

/**
 * Fetch real weather data from Open-Meteo for a given location object
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
    }

    try {
        const { latitude, longitude, timezone } = location;
        const tzParam = timezone ? encodeURIComponent(timezone) : 'auto';
        const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,precipitation,weather_code,cloud_cover,pressure_msl,surface_pressure,wind_speed_10m,wind_direction_10m,wind_gusts_10m,visibility&daily=temperature_2m_max,temperature_2m_min&timezone=${tzParam}`;

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

        renderWeather(data, currentLocation);
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
 * Render real weather data into the UI
 */
function renderWeather(data, location) {
    const current = data.current;
    const daily = data.daily;

    // 1. Location Header (Ahmedabad, Gujarat, India)
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
    // 1. Immediately fetch weather for default location (Ahmedabad)
    fetchWeatherData(DEFAULT_LOCATION, false);
    // 2. Start the 60-second automatic refresh timer
    startAutoRefresh();
});