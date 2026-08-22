# 🌦️ Modern Weather Dashboard

A sleek, responsive, and real-time weather application built with HTML, CSS, JavaScript, and powered by Vite & the OpenWeatherMap API.

---

## 📌 Features

- 🔍 **Instant City Search**: Search current weather conditions for any city worldwide with real-time feedback.
- 🌡️ **Comprehensive Weather Metrics**:
  - Live Temperature & Dynamic "Feels Like" reading
  - Min / Max daily temperature range
  - Humidity percentage & Atmospheric pressure
  - Wind speed (converted to km/h) & Visibility distance
- 🎨 **Dynamic Visuals**: Adaptive weather icons based on weather conditions (Clear, Clouds, Rain, Snow, Mist, etc.).
- 📱 **Responsive Design**: Polished glassmorphism UI styled for desktop, tablet, and mobile displays.
- ⚡ **Lightning Fast**: Built on modern Vite for instant local development and optimized production builds.

---

## 🛠️ Tech Stack

- **Frontend**: HTML5, Vanilla CSS3 (Custom Glassmorphism Design System), JavaScript (ES6+)
- **Build Tool**: [Vite](https://vitejs.dev/)
- **API Provider**: [OpenWeatherMap API](https://openweathermap.org/) (Current Weather Data endpoint)

---

## 🚀 Getting Started

### 1. Prerequisites

Make sure you have [Node.js](https://nodejs.org/) installed (v18 or higher recommended).

### 2. Installation

Clone the repository and install dependencies:

```bash
# Clone the repository
git clone https://github.com/Harshgajre/Weather-App.git

# Navigate into the project folder
cd Weather-App

# Install dependencies
npm install
```

---

## 🔑 Weather API & Environment Variables

This application uses the OpenWeatherMap Current Weather API.

### Option A: Using `.env` (Recommended for Security)

1. Create a `.env` file in the root directory (copied from [`.env.example`](.env.example)):
   ```bash
   cp .env.example .env
   ```
2. Open `.env` and paste your OpenWeather API key:
   ```env
   VITE_OPENWEATHER_API_KEY=your_actual_api_key_here
   ```
3. Get a free API key at [OpenWeatherMap](https://home.openweathermap.org/api_keys).

> ⚠️ **Security Tip**: Never commit `.env` or your personal API keys to public repositories. The `.env` file is already listed in `.gitignore`.

---

## 💻 Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Starts the local development server at `http://localhost:5173` |
| `npm run build` | Bundles and optimizes the app into `dist/` for production |
| `npm run preview` | Previews the production build locally |

---

## 📂 Project Structure

```text
Weather-App/
├── weather/               # Static image assets & fallbacks
│   ├── bg.jpg
│   ├── clear.jpg
│   ├── cloud.png
│   ├── mist.jpg
│   ├── rain.jpg
│   └── snow.jpg
├── .env.example           # Example environment template
├── .gitignore             # Git ignore rules for node_modules, build, & secrets
├── index.html             # Main application HTML markup
├── package.json           # Project dependencies & Vite scripts
├── README.md              # Project documentation
├── script.js              # Application logic, state management & API integration
└── style.css              # Custom styling & glassmorphism theme
```

---

## 📄 License

This project is licensed under the [ISC License](LICENSE).
