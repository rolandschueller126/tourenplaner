# 🛵 Tourenplaner – Dein KI Agent für feine Touren

**by rosch-lab**

KI-gestützter Tourenplaner für Vespa, Wohnmobil, Auto und Fahrrad. Claude generiert Insider-Tipps, Streckenhinweise und echtes Routing.

## Features
- 🤖 KI-Tourgenerierung via Claude API
- 🗺️ Echte Kartenansicht mit Mapbox (Outdoor-Style)
- 🛵 Fahrzeugspezifisches Routing (z.B. Vespa: keine Autobahn)
- ⚠️ Streckenhinweise: Tankreichweite, Steigungen, Maut, Temperatur
- 💡 Insider-Tipps, Geheimtipps, Foto-Spots, Einkehr-Tipps
- 🔗 WebLinks bei jedem Tipp (Google Maps, Wikipedia, Tripadvisor)
- 📊 Total-Reiter mit Gesamtübersicht, Budget, Packliste
- ↔️ Verschiebbare Kacheln (Drag-Resize)

## Tech Stack
- Frontend: HTML/CSS/JS
- Backend: Vercel Serverless Functions
- KI: Claude API (Anthropic)
- Karte: Mapbox GL JS 3.9 + Directions API
