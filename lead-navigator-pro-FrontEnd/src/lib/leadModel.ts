export type LeadInput = {
  prospectId: string;
  leadOrigin: string;
  leadSource: string;
  doNotEmail: boolean;
  doNotCall: boolean;
  totalVisits: number;
  totalTimeOnSite: number;
  pageViewsPerVisit: number;
  lastActivity: string;
  country: string;
  specialization: string;
  howHear: string;
  occupation: string;
  whatMatters: string;
  search: boolean;
  magazine: boolean;
  newspaperArticle: boolean;
  forums: boolean;
  newspaper: boolean;
  digitalAd: boolean;
  recommendations: boolean;
  receiveUpdates: boolean;
  tags: string;
  leadQuality: string;
  supplyChainUpdates: boolean;
  dmContentUpdates: boolean;
  leadProfile: string;
  city: string;
  activityIndex: string;
  profileIndex: string;
  activityScore: number;
  profileScore: number;
  payByCheque: boolean;
  freeCopy: boolean;
  lastNotableActivity: string;
};

export type LeadRecord = LeadInput & {
  createdAt: string;
  score: number;
  converted: 0 | 1;
  bestClassifierScore?: number;
  highProbabilityScore?: number;
  modelResults?: LeadPrediction["models"];
  processing?: LeadPrediction["processing"];
  reasons?: string[];
};

export type ModelResult = {
  name: string;
  role: string;
  available: boolean;
  probability?: number;
  score?: number;
  threshold?: number;
  converted?: boolean;
  error?: string;
};

export type LeadPrediction = {
  converted: 0 | 1;
  score: number;
  primaryModel: string;
  models: {
    bestClassifier: ModelResult;
    highProbability: ModelResult;
  };
  processing: {
    categories: Record<string, { raw: string; mapped: string; encoded: number }>;
    numericRaw: Record<string, number>;
    numericScaled: Record<string, number>;
    modelFeatures: Record<string, number>;
    featureOrder: string[];
  };
  reasons: string[];
};

const HOT_SOURCES = ["Google", "Olark Chat", "Reference", "Welingak Website"];
const HOT_OCCUPATION = ["Working Professional"];
const HOT_ACTIVITY = ["SMS Sent", "Had a Phone Conversation", "Email Opened"];

/**
 * Simple rule-based scoring (0–100).
 */
export function predictLeadScore(input: LeadInput): { score: number; converted: 0 | 1 } {
  let s = 30;
  s += Math.min(input.totalTimeOnSite / 30, 25);
  s += Math.min(input.totalVisits * 1.5, 12);
  s += Math.min(input.pageViewsPerVisit * 2, 8);
  if (HOT_SOURCES.includes(input.leadSource)) s += 10;
  if (HOT_OCCUPATION.includes(input.occupation)) s += 8;
  if (HOT_ACTIVITY.includes(input.lastActivity)) s += 6;
  if (input.doNotEmail) s -= 8;
  if (input.doNotCall) s -= 6;
  if (input.tags?.toLowerCase().includes("interest")) s += 5;
  s = Math.max(0, Math.min(100, Math.round(s)));
  return { score: s, converted: s >= 70 ? 1 : 0 };
}

const API_BASE =
  (import.meta.env.VITE_LEAD_API_URL as string | undefined)?.replace(/\/$/, "") ||
  "http://127.0.0.1:8000";

export async function predictLeadScoreFromApi(input: LeadInput): Promise<LeadPrediction> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}/predict`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        leadOrigin: input.leadOrigin,
        lastActivity: input.lastActivity,
        occupation: input.occupation,
        leadProfile: input.leadProfile,
        totalVisits: input.totalVisits,
        totalTimeOnSite: input.totalTimeOnSite,
        pageViewsPerVisit: input.pageViewsPerVisit,
      }),
    });
  } catch {
    throw new Error(`Không kết nối được API (${API_BASE}). Hãy bật backend uvicorn trên cổng 8000.`);
  }

  const data = await res.json();
  if (!res.ok) {
    const message =
      typeof data?.detail === "string"
        ? data.detail
        : data?.detail?.message || data?.message || "Không thể gọi API dự đoán.";
    throw new Error(message);
  }
  return data as LeadPrediction;
}

export const LEADS_STORAGE_KEY = "x_education_leads";

export function loadLeads(): LeadRecord[] {
  if (typeof window === "undefined") return [];
  try {
    const stored = JSON.parse(localStorage.getItem(LEADS_STORAGE_KEY) || "[]") as LeadRecord[];
    const realLeads = stored.filter((lead) => !String(lead.prospectId || "").startsWith("SEED-"));
    if (realLeads.length !== stored.length) {
      localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(realLeads));
    }
    return realLeads;
  } catch {
    return [];
  }
}

export function saveLead(rec: LeadRecord) {
  const all = loadLeads();
  all.unshift(rec);
  localStorage.setItem(LEADS_STORAGE_KEY, JSON.stringify(all.slice(0, 500)));
}
