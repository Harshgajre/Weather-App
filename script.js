// OpenWeather API configuration
const API_KEY = '8a3b585171838f95a9c10460e3ea51e4';
const DEFAULT_CITY = 'London';

// DOM Elements
const searchBtn = document.getElementById('search-btn');
const cityInput = document.getElementById('city-input');

const loadingState = document.getElementById('loading-state');
const errorState = document.getElementById('error-state');
const errorMessage = document.getElementById('error-message');
const weatherCard = document.getElementById('weather-card');

// Data display elements
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
 * Format string to Capitalized Words
 */
function formatCondition(text) {
    if (!text) return 'Clear Sky';
    return text
        .toLowerCase()
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Format timestamp to 12-hour / 24-hour localized time string
 */
function getFormattedTime() {
    const now = new Date();
    return now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
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
 * Resolve Weather Icon URL with fallback
 */
function resolveWeatherIcon(iconCode, mainCondition) {
    if (iconCode) {
        return `https://openweathermap.org/img/wn/${iconCode}@4x.png`;
    }

    // Fallback to local assets if available
    switch (mainCondition) {
        case 'Clear':
            return 'weather/clear.jpg';
        case 'Rain':
        case 'Drizzle':
            return 'weather/rain.jpg';
        case 'Snow':
            return 'weather/snow.jpg';
        case 'Clouds':
            return 'weather/cloud.png';
        case 'Mist':
        case 'Haze':
        case 'Fog':
            return 'weather/mist.jpg';
        default:
            return 'weather/cloud.png';
    }
}

/**
 * Fetch and render weather data for a city
 */
async function fetchWeather(city) {
    const query = city.trim();
    if (!query) return;

    setUIState('loading');

    try {
        const response = await fetch(
            `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(query)}&units=metric&appid=${API_KEY}`
        );
        const data = await response.json();

        if (data.cod === '404' || data.cod === 404) {
            setUIState('error', `We couldn't find "${query}". Please check the spelling and try again.`);
            return;
        }

        if (!response.ok) {
            setUIState('error', data.message ? formatCondition(data.message) : 'Unable to retrieve weather data.');
            return;
        }

        renderWeather(data);
        setUIState('content');
    } catch (error) {
        console.error('Weather fetch error:', error);
        setUIState('error', 'Network error or connection issue. Please try again.');
    }
}

/**
 * Render weather data into the dashboard UI
 */
function renderWeather(data) {
    // 1. Location
    cityNameEl.textContent = data.name || 'Unknown Location';
    
    if (data.sys && data.sys.country) {
        countryCodeEl.textContent = data.sys.country;
        countryCodeEl.style.display = 'inline-block';
    } else {
        countryCodeEl.style.display = 'none';
    }

    // 2. Last updated time
    lastUpdatedEl.textContent = `Last updated: ${getFormattedTime()}`;

    // 3. Weather condition & Icon
    const weatherInfo = data.weather && data.weather[0] ? data.weather[0] : null;
    const conditionMain = weatherInfo ? weatherInfo.main : 'Clear';
    const conditionDesc = weatherInfo ? weatherInfo.description : 'Clear';

    weatherConditionEl.textContent = formatCondition(conditionDesc);

    const iconUrl = resolveWeatherIcon(weatherInfo?.icon, conditionMain);
    weatherIconEl.src = iconUrl;
    weatherIconEl.alt = `${conditionDesc} icon`;
    weatherIconEl.onerror = () => {
        weatherIconEl.src = 'weather/cloud.png';
    };

    // 4. Main Temperatures
    const temp = data.main?.temp !== undefined ? Math.round(data.main.temp) : '--';
    const feelsLike = data.main?.feels_like !== undefined ? Math.round(data.main.feels_like) : temp;
    const tempMin = data.main?.temp_min !== undefined ? Math.round(data.main.temp_min) : temp;
    const tempMax = data.main?.temp_max !== undefined ? Math.round(data.main.temp_max) : temp;

    currentTempEl.textContent = temp;
    feelsLikeEl.textContent = `${feelsLike}°C`;
    tempMinEl.textContent = `${tempMin}°C`;
    tempMaxEl.textContent = `${tempMax}°C`;

    // 5. Details Section
    // Humidity
    humidityValEl.textContent = data.main?.humidity !== undefined ? `${data.main.humidity}%` : 'N/A';

    // Wind speed (convert m/s to km/h for standard readability: 1 m/s = 3.6 km/h)
    if (data.wind?.speed !== undefined) {
        const windKmH = (data.wind.speed * 3.6).toFixed(1);
        windValEl.textContent = `${windKmH} km/h`;
    } else {
        windValEl.textContent = 'N/A';
    }

    // Pressure
    pressureValEl.textContent = data.main?.pressure !== undefined ? `${data.main.pressure} hPa` : 'N/A';

    // Visibility (meters to km)
    if (data.visibility !== undefined) {
        const visKm = (data.visibility / 1000).toFixed(1);
        visibilityValEl.textContent = `${visKm} km`;
    } else {
        visibilityValEl.textContent = 'N/A';
    }
}

/**
 * Event Handlers
 */
function handleSearch() {
    const city = cityInput.value;
    if (city.trim() !== '') {
        fetchWeather(city);
    }
}

searchBtn.addEventListener('click', handleSearch);

cityInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
        handleSearch();
    }
});

// Initialize on page load with default city
window.addEventListener('DOMContentLoaded', () => {
    fetchWeather(DEFAULT_CITY);
});