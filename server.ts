import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const isProduction = process.env.NODE_ENV === 'production';
const PORT = Number(process.env.PORT) || 3000;

async function startServer() {
  const app = express();
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Shared Gemini client utility with telemetry header
  const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return null;
    return new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
  };

  // API Health / Status
  app.get('/api/ai/status', (_req, res) => {
    const hasKey = Boolean(process.env.GEMINI_API_KEY);
    res.json({
      active: true,
      hasGeminiKey: hasKey,
      engine: hasKey ? 'Gemini 3.8 Flash + PhotoLab Neural Engine' : 'PhotoLab Neural Synthetic Engine',
      features: [
        'generative-fill',
        'remove-background',
        'select-subject',
        'remove-tool',
        'neural-filters',
        'generative-expand',
        'text-to-image'
      ]
    });
  });

  // 1. Generative Fill with Variations
  app.post('/api/ai/generative-fill', async (req, res) => {
    try {
      const { imageBase64, prompt, bounds, canvasWidth, canvasHeight } = req.body;
      const ai = getGeminiClient();

      if (ai && imageBase64) {
        try {
          const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: [
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: cleanBase64,
                },
              },
              {
                text: `You are Adobe Photoshop Generative Fill engine. The user selected region: x=${bounds.x}, y=${bounds.y}, w=${bounds.width}, h=${bounds.height} on a ${canvasWidth}x${canvasHeight} canvas.
User Generative Fill Prompt: "${prompt}".
Analyze the image lighting, color harmony, and style, then produce 3 creative variations for generative fill synthesis.
Respond with JSON matching this structure:
{
  "variations": [
    {
      "id": 1,
      "title": "Natural Blend",
      "colors": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
      "lighting": "warm" | "cool" | "neon" | "neutral" | "dramatic",
      "texture": "smooth" | "grain" | "organic" | "geometric",
      "gradientAngle": number,
      "glowIntensity": number,
      "description": "brief description"
    },
    {
      "id": 2,
      "title": "Dynamic Contrast",
      "colors": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
      "lighting": "warm" | "cool" | "neon" | "neutral" | "dramatic",
      "texture": "smooth" | "grain" | "organic" | "geometric",
      "gradientAngle": number,
      "glowIntensity": number,
      "description": "brief description"
    },
    {
      "id": 3,
      "title": "Stylistic Accent",
      "colors": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
      "lighting": "warm" | "cool" | "neon" | "neutral" | "dramatic",
      "texture": "smooth" | "grain" | "organic" | "geometric",
      "gradientAngle": number,
      "glowIntensity": number,
      "description": "brief description"
    }
  ]
}`,
              },
            ],
            config: {
              responseMimeType: 'application/json',
            },
          });

          const rawText = response.text || '{}';
          const parsed = JSON.parse(rawText);
          if (parsed.variations && parsed.variations.length > 0) {
            return res.json({
              success: true,
              source: 'gemini',
              variations: parsed.variations,
              prompt,
            });
          }
        } catch (err: any) {
          console.warn('Gemini Generative Fill fallback:', err?.message || err);
        }
      }

      // Procedural fallback with 3 high-quality variations
      res.json({
        success: true,
        source: 'procedural',
        prompt,
        variations: [
          {
            id: 1,
            title: 'Harmonious Match',
            colors: ['#38bdf8', '#0284c7', '#0369a1', '#075985', '#0c4a6e'],
            lighting: 'cool',
            texture: 'organic',
            gradientAngle: 45,
            glowIntensity: 0.3,
            description: `Organic blend matching "${prompt}"`,
          },
          {
            id: 2,
            title: 'Vibrant Accent',
            colors: ['#f59e0b', '#ea580c', '#e11d48', '#9333ea', '#3b82f6'],
            lighting: 'warm',
            texture: 'smooth',
            gradientAngle: 120,
            glowIntensity: 0.6,
            description: `Vivid lighting inspired by "${prompt}"`,
          },
          {
            id: 3,
            title: 'High Contrast',
            colors: ['#06b6d4', '#ec4899', '#8b5cf6', '#10b981', '#ffffff'],
            lighting: 'neon',
            texture: 'geometric',
            gradientAngle: 90,
            glowIntensity: 0.8,
            description: `Dynamic highlights for "${prompt}"`,
          },
        ],
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Generative fill failed' });
    }
  });

  // 2. Select Subject (Photoshop AI Subject Segmentation)
  app.post('/api/ai/select-subject', async (req, res) => {
    try {
      const { imageBase64, canvasWidth, canvasHeight } = req.body;
      const ai = getGeminiClient();

      if (ai && imageBase64) {
        try {
          const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: [
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: cleanBase64,
                },
              },
              {
                text: `You are Adobe Photoshop AI "Select Subject" engine. Analyze this image (${canvasWidth}x${canvasHeight} px).
Detect the primary foreground subject.
Return coordinates in integer pixels:
{
  "bounds": {
    "x": number,
    "y": number,
    "width": number,
    "height": number
  },
  "subjectLabel": "Person" | "Animal" | "Vehicle" | "Product" | "Focal Object",
  "confidence": number
}
Return JSON only.`,
              },
            ],
            config: {
              responseMimeType: 'application/json',
            },
          });

          const raw = response.text || '{}';
          const parsed = JSON.parse(raw);
          if (parsed.bounds && parsed.bounds.width > 20) {
            return res.json({
              success: true,
              source: 'gemini',
              bounds: parsed.bounds,
              label: parsed.subjectLabel || 'Subject',
            });
          }
        } catch (err: any) {
          console.warn('Select Subject Gemini fallback:', err?.message || err);
        }
      }

      // Default smart center-weighted subject bounding box
      const cw = Number(canvasWidth) || 1200;
      const ch = Number(canvasHeight) || 800;
      res.json({
        success: true,
        source: 'procedural',
        bounds: {
          x: Math.round(cw * 0.2),
          y: Math.round(ch * 0.15),
          width: Math.round(cw * 0.6),
          height: Math.round(ch * 0.7),
        },
        label: 'Primary Subject',
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Select subject failed' });
    }
  });

  // 3. Neural Filters
  app.post('/api/ai/neural-filter', async (req, res) => {
    try {
      const { filterType, imageBase64 } = req.body;
      const ai = getGeminiClient();

      if (ai && imageBase64) {
        try {
          const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, '');
          const response = await ai.models.generateContent({
            model: 'gemini-3.8-flash',
            contents: [
              {
                inlineData: {
                  mimeType: 'image/png',
                  data: cleanBase64,
                },
              },
              {
                text: `You are Adobe Photoshop Neural Filters processor. Filter type requested: "${filterType}".
Provide optimal grading parameters and color harmony palette in JSON format:
{
  "filterName": "${filterType}",
  "colorPalette": ["#hex1", "#hex2", "#hex3", "#hex4"],
  "saturationBoost": number (-50 to +50),
  "contrastMultiplier": number (0.5 to 2.0),
  "vignetteStrength": number (0 to 1),
  "tintRgba": "rgba(r,g,b,a)"
}`,
              },
            ],
            config: {
              responseMimeType: 'application/json',
            },
          });

          const parsed = JSON.parse(response.text || '{}');
          return res.json({
            success: true,
            source: 'gemini',
            data: parsed,
          });
        } catch (err: any) {
          console.warn('Neural filter Gemini fallback:', err?.message || err);
        }
      }

      res.json({
        success: true,
        source: 'procedural',
        data: {
          filterName: filterType,
          colorPalette: ['#f59e0b', '#38bdf8', '#8b5cf6', '#10b981'],
          saturationBoost: 20,
          contrastMultiplier: 1.25,
          vignetteStrength: 0.35,
          tintRgba: 'rgba(255, 200, 150, 0.15)',
        },
      });
    } catch (error: any) {
      res.status(500).json({ success: false, error: error?.message || 'Neural filter failed' });
    }
  });

  // Mount Vite development middlewares or serve static build in production
  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PhotoLab Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
