export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Only POST' });

  const { start, end, vehicle, days, vibe } = req.body;
  if (!start || !end) return res.status(400).json({ error: 'Start und Ziel fehlen' });

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return res.status(500).json({ error: 'ANTHROPIC_API_KEY nicht konfiguriert' });

  const vehicleInfo = {
    vespa: 'Vespa 125cc, max 90 km/h, nur Landstraßen, keine Autobahn, Tankreichweite ~200km',
    wohnmobil: 'Wohnmobil 7.20m/4.8t, max 100 km/h, Höhe max 3.5m, enge Bergstraßen meiden',
    auto: 'Auto, alle Straßen erlaubt, flexibel',
    fahrrad: 'Fahrrad/E-Bike, max 25 km/h, nur Radwege, Tagesetappen max 80km'
  };

  const prompt = `Du bist ein Reise-Experte. Erstelle eine ${days}-Tage Tour: ${start} nach ${end}.
Fahrzeug: ${vehicleInfo[vehicle] || vehicleInfo.vespa}
Stimmung: ${vibe || 'Entspannt mit Genuss'}

ANTWORTE NUR MIT VALIDEM JSON. Kein Text, kein Markdown, keine Backticks. Nur das JSON-Objekt.

Format:
{
  "tourTitle": "Name der Tour",
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
          "desc": "Warum man hier halten sollte.",
          "tips": [
            { "type": "insider", "text": "Konkreter Tipp", "links": ["Google Maps:https://maps.google.com/?q=Ortsname", "Wikipedia:https://de.wikipedia.org/wiki/Ortsname"] },
            { "type": "einkehr", "text": "Restaurant-Empfehlung", "links": ["Google Maps:https://maps.google.com/?q=Restaurant+Ortsname"] }
          ]
        }
      ],
      "hints": [
        { "icon": "⛽", "title": "Tankstopp", "text": "Details", "severity": "info" }
      ],
      "countries_detail": [
        { "flag": "🇩🇪", "name": "Deutschland", "maut": "Keine Maut" }
      ]
    }
  },
  "highlights": [
    { "day": 1, "route": "Start → Ziel", "text": "Highlight-Text" }
  ],
  "packingList": ["Item 1", "Item 2"],
  "overallTips": [
    { "icon": "🛵", "title": "Tipp", "text": "Details" }
  ]
}

REGELN:
- Echte Ortsnamen und echte GPS-Koordinaten (lng/lat)
- Echte Google Maps und Wikipedia Links
- 3-5 Stops pro Tag mit je 2-3 Tips
- 3-5 Hints pro Tag
- Realistisches Budget
- severity: "info", "warnung" oder "achtung"
- tip types: "insider", "foto-spot", "einkehr", "kultur", "natur", "warnung"`;

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
        messages: [{ role: 'user', content: prompt }]
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error('Claude API Error:', response.status, errText);
      return res.status(500).json({ error: 'Claude API Fehler: ' + response.status });
    }

    const data = await response.json();
    const text = data.content[0].text;

    // Parse JSON
    let tourData;
    try {
      tourData = JSON.parse(text);
    } catch (e) {
      const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        tourData = JSON.parse(jsonMatch[1].trim());
      } else {
        const s = text.indexOf('{');
        const e2 = text.lastIndexOf('}');
        if (s !== -1 && e2 !== -1) {
          tourData = JSON.parse(text.substring(s, e2 + 1));
        } else {
          return res.status(500).json({ error: 'Claude hat kein gültiges JSON geliefert' });
        }
      }
    }

    return res.status(200).json(tourData);
  } catch (error) {
    console.error('Error:', error);
    return res.status(500).json({ error: error.message });
  }
}
