'use client';

import * as React from 'react';
import { useUiPreferences } from '@/components/UiPreferences';

type Weather = { temp: number; code: number } | null;

// Minimal WMO weather-code → emoji + bilingual label mapping.
function describe(code: number, isArabic: boolean): { icon: string; label: string } {
  const g = (ar: string, en: string) => ({ ar, en });
  const map: Record<string, { ar: string; en: string }> = {
    clear: g('صحو', 'Clear'),
    cloud: g('غائم', 'Cloudy'),
    fog: g('ضباب', 'Fog'),
    drizzle: g('رذاذ', 'Drizzle'),
    rain: g('ممطر', 'Rain'),
    snow: g('ثلوج', 'Snow'),
    storm: g('عواصف', 'Storm'),
  };
  let key = 'clear';
  let icon = '☀️';
  if (code === 0) { key = 'clear'; icon = '☀️'; }
  else if (code <= 3) { key = 'cloud'; icon = '⛅'; }
  else if (code <= 48) { key = 'fog'; icon = '🌫️'; }
  else if (code <= 57) { key = 'drizzle'; icon = '🌦️'; }
  else if (code <= 67) { key = 'rain'; icon = '🌧️'; }
  else if (code <= 77) { key = 'snow'; icon = '❄️'; }
  else if (code <= 82) { key = 'rain'; icon = '🌧️'; }
  else { key = 'storm'; icon = '⛈️'; }
  const m = map[key];
  return { icon, label: isArabic ? m.ar : m.en };
}

export default function DateWeatherCard() {
  const { language } = useUiPreferences();
  const isArabic = language === 'ar';
  const [now, setNow] = React.useState(() => new Date());
  const [weather, setWeather] = React.useState<Weather>(null);
  const [place, setPlace] = React.useState('');

  React.useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    return () => window.clearInterval(timer);
  }, []);

  React.useEffect(() => {
    let active = true;
    async function fetchWeather(lat: number, lon: number, label: string) {
      try {
        const res = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code`, { cache: 'no-store' });
        const body = await res.json();
        if (!active || !body?.current) return;
        setWeather({ temp: Math.round(Number(body.current.temperature_2m)), code: Number(body.current.weather_code) });
        setPlace(label);
      } catch { /* weather is best-effort */ }
    }
    // Default to Cairo, Egypt; upgrade to the viewer's location when granted.
    const fallback = () => fetchWeather(30.0444, 31.2357, isArabic ? 'القاهرة' : 'Cairo');
    if (typeof navigator !== 'undefined' && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => fetchWeather(pos.coords.latitude, pos.coords.longitude, isArabic ? 'موقعك' : 'Your location'),
        () => fallback(),
        { timeout: 6000, maximumAge: 600000 },
      );
    } else {
      fallback();
    }
    return () => { active = false; };
  }, [isArabic]);

  const locale = isArabic ? 'ar-EG' : 'en-GB';
  const day = now.toLocaleDateString(locale, { weekday: 'long' });
  const date = now.toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' });
  const time = now.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const w = weather ? describe(weather.code, isArabic) : null;

  return (
    <div className="ui-datew" aria-label={isArabic ? 'التاريخ والطقس' : 'Date and weather'}>
      <div className="ui-datew-day">{day}</div>
      <div className="ui-datew-date">{date}</div>
      <div className="ui-datew-row">
        <span className="ui-datew-time">{time}</span>
        {w && (
          <span className="ui-datew-weather">
            <span aria-hidden="true">{w.icon}</span>
            <strong>{weather!.temp}°</strong>
            <span>{w.label}</span>
          </span>
        )}
      </div>
      {place && <div className="ui-datew-place">{place}</div>}
    </div>
  );
}
