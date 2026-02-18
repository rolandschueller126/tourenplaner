export default async function handler(req, res) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Only POST allowed' });
  }

  const { start, end, vehicle, days, vibe } = req.body;

  if (!start || !end) {
    return res.status(400).json({ error: 'Start und Ziel sind Pflichtfelder' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'API Key nicht konfiguriert' });
  }

  const vehicleInfo = {
    vespa: { name: 'Vespa 125cc', maxSpeed: '90 km/h', routing: 'keine Autobahn, nur Landstraßen und kleine Straßen', fuelRange: '~200km pro Tankfüllung', special: 'Passstraßen möglich aber Steigungen beachten, Wind auf Brücken gefährlich' },
    wohnmobil: { name: 'Wohnmobil 7.20m / 4.8t', maxSpeed: '100 km/h', routing: 'Autobahn erlaubt, aber Höhenbeschränkungen beachten (max 3.5m), Gewichtsbeschränkungen auf Brücken', fuelRange: '~500km pro Tank', special: 'Stellplätze statt Campingplätze bevorzugen, enge Bergstraßen meiden' },
    auto: { name: 'Auto', maxSpeed: '130 km/h', routing: 'alle Straßen erlaubt', fuelRange: '~600km pro Tank', special: 'Keine besonderen Einschränkungen' },
    fahrrad: { name: 'Fahrrad/E-Bike', maxSpeed: '25 km/h', routing: 'Radwege bevorzugen, keine Autobahn, keine Schnellstraßen', fuelRange: 'E-Bike ~80km Reichweite', special: 'Tagesetappen max 80-100km, Höhenmeter stark begrenzen, Ladestationen für E-Bike' }
  };

  const v = vehicleInfo[vehicle] || vehicleInfo.vespa;

  const prompt = `Du bist ein erfahrener Reise- und Tourenplaner. Erstelle eine detaillierte ${days}-Tage Tour mit dem Fahrzeug: ${v.name}.

ROUTE: ${start} → ${end}
FAHRZEUG: ${v.name} (max ${v.maxSpeed}, ${v.routing})
REICHWEITE: ${v.fuelRange}
BESONDERHEITEN: ${v.special}
TAGE: ${days}
STIMMUNG/VIBE: ${vibe || 'Entspannt mit Genuss'}

WICHTIG: Antworte NUR mit validem JSON, kein Text davor oder danach. Kein Markdown, keine Backticks.

Erstelle die Tour im folgenden JSON-Format:
{
  "tourTitle": "Kurzer Tourname",
  "totalKm": 487,
  "totalBudget": 530,
  "days": {
    "1": {
      "title": "Startort → Zielort",
      "meta": "142 km · ~4h · 4 Stopps",
      "countries": "🇩🇪 → 🇦🇹",
      "budget": { "fuel": 12, "food": 35, "sleep": 65 },
      "mapStops": [
        { "name": "Ortsname", "lng": 11.576, "lat": 48.137 }
      ],
      "stops": [
        {
          "name": "Ortsname",
          "km": "83 km",
          "time": "10:30 Uhr",
          "duration": "45 min Pause",
          "desc": "Beschreibung des Ortes und warum man hier halten sollte.",
          "tips": [
            { "type": "insider", "text": "Konkreter Insider-Tipp", "links": { "maps": "https://maps.google.com/?q=...", "wiki": "https://de.wikipedia.org/wiki/..." } },
            { "type": "foto-spot", "text": "Beschreibung Foto-Spot", "links": { "maps": "https://maps.google.com/?q=..." } },
            { "type": "einkehr", "text": "Restaurant/Café Empfehlung", "links": { "maps": "https://maps.google.com/?q=...", "tripadvisor": "https://tripadvisor.com/..." } }
          ]
        }
      ],
      "hints": [
        { "icon": "⛽", "title": "Hinweis-Titel", "text": "Detaillierter Streckenhinweis", "severity": "info" }
      ],
      "countries_detail": [
        { "flag": "🇩🇪", "name": "Deutschland", "maut": "Keine Maut" }
      ]
    }
  },
  "highlights": [
    { "day": 1, "route": "Startort → Zielort", "text": "Highlight-Beschreibung" }
  ],
  "packingList": [
    "Gegenstand 1", "Gegenstand 2"
  ],
  "overallTips": [
    { "icon": "🛵", "title": "Tipp-Titel", "text": "Detaillierter übergreifender Tipp" }
  ]
}

REGELN:
- Verwende ECHTE Ortsnamen, echte GPS-Koordinaten (lng/lat), echte Straßen
- Google Maps Links müssen echte Koordinaten enthalten
- Wikipedia Links müssen zu echten Artikeln führen
- Tipps müssen konkret und hilfreich sein, keine generischen Phrasen
- Hints/Streckenhinweise: Tankstellen, Steigungen, Maut, Wetter, Gefahren
- severity kann sein: "info", "warnung", "achtung"
- Jeder Tag braucht 3-5 Stops mit je 2-4 Tips
- Jeder Tag braucht 3-5 Hints
- Budget realistisch für ${v.name} in Europa
- Für ${v.name}: ${v.special}
- mapStops müssen echte GPS-Koordinaten haben
- Tipp-Types: "insider", "foto-spot", "einkehr", "kultur", "natur", "warnung"
- Packliste passend zum Fahrzeug ${v.name}`;

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 8000,
        messages: [
          { role: 'user', content: prompt }
        ]
      })
    });

    if (!response.ok) {
      const errData = await response.text();
      console.error('Claude API error:', response.status, errData);
      return res.status(500).json({ error: `Claude API Fehler: ${response.status}` });
    }

    const data = await response.json();
    const text = data.content[0].text;

    // Parse JSON from Claude's response
    let tourData;
    try {
      // Try direct parse first
      tourData = JSON.parse(text);
    } catch (e) {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        tourData = JSON.parse(jsonMatch[1].trim());
      } else {
        // Try to find JSON object in text
        const start = text.indexOf('{');
        const end = text.lastIndexOf('}');
        if (start !== -1 && end !== -1) {
          tourData = JSON.parse(text.substring(start, end + 1));
        } else {
          throw new Error('Kein JSON in Claude-Antwort gefunden');
        }
      }
    }

    return res.status(200).json(tourData);

  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: `Fehler: ${error.message}` });
  }
}
