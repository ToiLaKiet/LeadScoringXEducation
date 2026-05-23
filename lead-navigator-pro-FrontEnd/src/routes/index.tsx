import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast, Toaster } from "sonner";
import { predictLeadScoreFromApi, saveLead, type LeadInput, type LeadPrediction } from "@/lib/leadModel";
import { Sparkles, CheckCircle2, Gauge, BrainCircuit } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "X Education — Đăng ký nhận tư vấn khóa học" },
      { name: "description", content: "Để lại thông tin để đội ngũ X Education tư vấn khóa học phù hợp với bạn." },
    ],
  }),
  component: LeadFormPage,
});

const COUNTRIES = ["", "India", "Vietnam", "United States", "United Kingdom", "Singapore", "Australia"];
const LEAD_SOURCES = ["", "Google", "Direct Traffic", "Olark Chat", "Organic Search", "Reference", "Welingak Website", "Facebook"];
const SPECS = ["", "Finance Management", "Marketing Management", "Human Resource Management", "Operations Management", "IT Projects Management", "Business Administration", "Select"];
const OCCUPATIONS = ["", "Unemployed", "Working Professional", "Student", "Other", "Housewife", "Businessman"];
const MATTERS = ["", "Better Career Prospects", "Flexibility & Convenience", "Other"];
const CITIES = ["", "Mumbai", "Thane & Outskirts", "Other Cities", "Other Metro Cities", "Tier II Cities", "Select"];
const HEAR_OPTIONS = ["", "Online Search", "Word Of Mouth", "Student of SomeSchool", "Other", "Social Media", "Advertisements"];

const VISIT_COUNT_KEY = "x_education_visit_count";
const BLANK_OPTION = "__blank__";

function LeadFormPage() {
  const navigate = useNavigate();
  const [submitted, setSubmitted] = useState<LeadPrediction | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pageStartedAt] = useState(() => Date.now());
  const [form, setForm] = useState<LeadInput>({
    prospectId: "",
    leadOrigin: "Landing Page Submission",
    leadSource: "Google",
    doNotEmail: false,
    doNotCall: false,
    totalVisits: 0,
    totalTimeOnSite: 0,
    pageViewsPerVisit: 1,
    lastActivity: "Page Visited on Website",
    country: "Vietnam",
    specialization: "Select",
    howHear: "Select",
    occupation: "Unemployed",
    whatMatters: "Better Career Prospects",
    search: false,
    magazine: false,
    newspaperArticle: false,
    forums: false,
    newspaper: false,
    digitalAd: false,
    recommendations: false,
    receiveUpdates: false,
    tags: "",
    leadQuality: "Not Sure",
    supplyChainUpdates: false,
    dmContentUpdates: false,
    leadProfile: "Select",
    city: "Select",
    activityIndex: "02.Medium",
    profileIndex: "02.Medium",
    activityScore: 14,
    profileScore: 15,
    payByCheque: false,
    freeCopy: true,
    lastNotableActivity: "Page Visited on Website",
  });

  const set = <K extends keyof LeadInput>(k: K, v: LeadInput[K]) =>
    setForm((f) => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const fullLead = applySystemFields(form, pageStartedAt);
      const prediction = await predictLeadScoreFromApi(fullLead);
      saveLead({
        ...fullLead,
        score: prediction.score,
        converted: prediction.converted,
        bestClassifierScore: prediction.models.bestClassifier.score,
        highProbabilityScore: prediction.models.highProbability.score,
        modelResults: prediction.models,
        processing: prediction.processing,
        reasons: prediction.reasons,
        createdAt: new Date().toISOString(),
      });
      setSubmitted(prediction);
      setForm(fullLead);
      toast.success("Thông tin đã được gửi và xử lý bởi hệ thống CRM.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Không thể gọi API dự đoán.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen">
        <SiteHeader />
        <Toaster richColors />
        <main className="mx-auto max-w-2xl px-5 py-16">
          <Card className="border-primary/30">
            <CardContent className="pt-10 pb-10 text-center">
              <div className="mx-auto w-16 h-16 rounded-full bg-primary/10 grid place-items-center mb-4">
                <CheckCircle2 className="w-9 h-9 text-primary" />
              </div>
              <h1 className="text-3xl mb-2">Cảm ơn bạn!</h1>
              <p className="text-muted-foreground mb-6">Hồ sơ của bạn đã được tiếp nhận thành công.</p>
              <div className="inline-flex items-center gap-2 rounded-full bg-muted px-4 py-2 text-sm mb-6">
                <Sparkles className="w-4 h-4 text-primary" />
                Mã hồ sơ: <span className="font-mono font-semibold">{form.prospectId}</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-3 text-left">
                <ModelScore icon={<Gauge className="w-5 h-5" />} title="LightGBM Score" result={submitted.models.bestClassifier} />
                <ModelScore icon={<BrainCircuit className="w-5 h-5" />} title="Logistic Score" result={submitted.models.highProbability} />
              </div>
              <div className="mt-8 flex justify-center gap-3">
                <Button onClick={() => { setSubmitted(null); set("prospectId", ""); }}>Gửi hồ sơ khác</Button>
                <Button variant="outline" onClick={() => navigate({ to: "/admin" })}>Xem Dashboard</Button>
              </div>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <Toaster richColors />
      <section className="bg-secondary text-secondary-foreground py-12">
        <div className="mx-auto max-w-6xl px-5">
           <span className="text-xs uppercase tracking-widest text-accent mb-2 block">X Education Demo</span>
           <h1 className="text-4xl font-semibold">Tư vấn lộ trình sự nghiệp</h1>
        </div>
      </section>

      <main className="mx-auto max-w-3xl px-5 py-10">
        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Thông tin cá nhân</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-2 gap-4">
              <Field label="Quốc gia"><SelectBox value={form.country} onChange={(v) => set("country", v)} options={COUNTRIES} /></Field>
              <Field label="Thành phố"><SelectBox value={form.city} onChange={(v) => set("city", v)} options={CITIES} /></Field>
              <Field label="Nghề nghiệp"><SelectBox value={form.occupation} onChange={(v) => set("occupation", v)} options={OCCUPATIONS} /></Field>
              <Field label="Chuyên ngành"><SelectBox value={form.specialization} onChange={(v) => set("specialization", v)} options={SPECS} /></Field>
              <Field label="Biết chúng tôi qua đâu?"><SelectBox value={form.howHear} onChange={(v) => set("howHear", v)} options={HEAR_OPTIONS} /></Field>
              <Field label="Nhu cầu chính"><SelectBox value={form.whatMatters} onChange={(v) => set("whatMatters", v)} options={MATTERS} /></Field>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Nguồn và Tùy chọn liên hệ</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <Field label="Nguồn Lead (Lead Source)">
                <SelectBox value={form.leadSource} onChange={(v) => set("leadSource", v)} options={LEAD_SOURCES} />
              </Field>
              <div className="grid md:grid-cols-2 gap-3 pt-2">
                <ToggleRow label="Không gửi Email (Do Not Email)" checked={form.doNotEmail} onChange={(v) => set("doNotEmail", v)} />
                <ToggleRow label="Không gọi điện (Do Not Call)" checked={form.doNotCall} onChange={(v) => set("doNotCall", v)} />
              </div>
              <ToggleRow label="Nhận tài liệu phỏng vấn miễn phí" checked={form.freeCopy} onChange={(v) => set("freeCopy", v)} />
            </CardContent>
          </Card>

          <div className="flex justify-end pt-4">
            <Button type="submit" size="lg" className="px-10" disabled={isSubmitting}>
              {isSubmitting ? "Đang xử lý..." : "Gửi thông tin"}
            </Button>
          </div>
        </form>
      </main>
    </div>
  );
}

function applySystemFields(input: LeadInput, pageStartedAt: number): LeadInput {
  const visitCount = nextVisitCount();
  const secondsOnPage = Math.max(30, Math.round((Date.now() - pageStartedAt) / 1000));
  const randIdx = Math.floor(Math.random() * 100);

  const qualities = ["High in Relevance", "Low in Relevance", "Might be", "Not Sure", "Worst"];
  const profiles = ["Potential Lead", "Other Leads", "Lateral Student", "Select"];
  const indices = ["01.High", "02.Medium", "03.Low"];
  const tagsArr = ["Will revert after reading the email", "Ringing", "Interested in other courses", "Closed by Horizzon", "switched off", "Busy"];
  const lastActs = ["Email Opened", "SMS Sent", "Page Visited on Website", "Converted to Lead", "Had a Phone Conversation"];

  const lastActivity = lastActs[randIdx % lastActs.length];

  return {
    ...input,
    prospectId: input.prospectId || `LEAD-${Date.now().toString().slice(-6)}`,
    leadOrigin: "Landing Page Submission",
    totalVisits: visitCount,
    totalTimeOnSite: secondsOnPage,
    pageViewsPerVisit: +(visitCount > 0 ? (Math.random() * 5 + 1).toFixed(1) : 0),
    lastActivity: lastActivity,
    lastNotableActivity: lastActivity,
    tags: tagsArr[randIdx % tagsArr.length],
    leadQuality: qualities[randIdx % qualities.length],
    leadProfile: profiles[randIdx % profiles.length],
    activityIndex: indices[randIdx % indices.length],
    profileIndex: indices[(randIdx + 1) % indices.length],
    activityScore: 10 + Math.floor(Math.random() * 8),
    profileScore: 12 + Math.floor(Math.random() * 8),
    search: Math.random() < 0.05,
    digitalAd: Math.random() < 0.02,
    recommendations: Math.random() < 0.03,
  };
}

function nextVisitCount() {
  if (typeof window === "undefined") return 1;
  const previous = Number(window.localStorage.getItem(VISIT_COUNT_KEY) || "0");
  const current = Math.max(1, previous + 1);
  window.localStorage.setItem(VISIT_COUNT_KEY, String(current));
  return current;
}

function ModelScore({ icon, title, result }: { icon: React.ReactNode; title: string; result: any }) {
  return (
    <div className="rounded-lg border bg-muted/30 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-sm font-medium">{icon}{title}</div>
        <span className={result.converted ? "text-primary font-bold" : "text-muted-foreground text-xs"}>
          {result.converted ? "HOT" : "Cold"}
        </span>
      </div>
      <div className="mt-2 text-2xl font-bold">{result.score?.toFixed(1)}%</div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-[11px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</Label>
      {children}
    </div>
  );
}

function SelectBox({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: string[] }) {
  const selectValue = value === "" ? BLANK_OPTION : value;
  const handleChange = (next: string) => onChange(next === BLANK_OPTION ? "" : next);
  return (
    <Select value={selectValue} onValueChange={handleChange}>
      <SelectTrigger><SelectValue /></SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o || BLANK_OPTION} value={o || BLANK_OPTION}>
            {o || "-- Chọn --"}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

function ToggleRow({ label, checked, onChange }: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between rounded-md border bg-muted/20 px-3 py-2">
      <span className="text-xs font-medium">{label}</span>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}
