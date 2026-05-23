import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { SiteHeader } from "@/components/SiteHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { LEADS_STORAGE_KEY, loadLeads, type LeadRecord } from "@/lib/leadModel";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  PieChart, Pie, Cell, Legend,
} from "recharts";
import { Flame, Users, TrendingUp, Target, RefreshCw } from "lucide-react";

export const Route = createFileRoute("/admin")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard — Lead Scoring | X Education" },
      { name: "description", content: "Bảng điều khiển dự đoán lead score và phân tích phân phối dữ liệu khách hàng." },
    ],
  }),
  component: AdminPage,
});

const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

function AdminPage() {
  const [leads, setLeads] = useState<LeadRecord[]>([]);
  const [tick, setTick] = useState(0);
  const [selectedLead, setSelectedLead] = useState<LeadRecord | null>(null);

  useEffect(() => {
    setLeads(loadLeads());
  }, [tick]);

  // Statistics Calculation
  const stats = useMemo(() => {
    const total = leads.length;
    const hot = leads.filter((l) => l.score >= 70).length;
    const conv = leads.filter((l) => l.converted === 1).length;
    const avg = total ? Math.round(leads.reduce((s, l) => s + l.score, 0) / total) : 0;
    return { total, hot, conv, avg, rate: total ? Math.round((conv / total) * 100) : 0 };
  }, [leads]);

  // Charts Data Logic
  const scoreHist = useMemo(() => {
    const bins = Array.from({ length: 10 }, (_, i) => ({ bin: `${i * 10}-${i * 10 + 9}`, count: 0 }));
    leads.forEach((l) => bins[Math.min(9, Math.floor(l.score / 10))].count++);
    return bins;
  }, [leads]);

  const sourceDist = useMemo(() => groupCount(leads, "leadSource"), [leads]);
  const occDist = useMemo(() => groupCount(leads, "occupation"), [leads]);
  const specDist = useMemo(() => groupCount(leads, "specialization"), [leads]);

  const visitsHist = useMemo(() => {
    const buckets = [0, 1, 2, 3, 4, 5, 6, 8, 10, 15];
    const labels = ["0", "1", "2", "3", "4", "5", "6-7", "8-9", "10-14", "15+"];
    const out = labels.map((bin) => ({ bin, count: 0 }));
    leads.forEach((l) => {
      let idx = buckets.findIndex((b, i) => l.totalVisits < (buckets[i + 1] ?? Infinity));
      if (idx === -1) idx = buckets.length - 1;
      out[idx].count++;
    });
    return out;
  }, [leads]);

  return (
    <div className="min-h-screen">
      <SiteHeader />
      <main className="mx-auto max-w-7xl px-5 py-8 space-y-6">
        <div className="flex items-end justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-3xl font-display font-semibold">Lead Scoring Dashboard</h1>
            <p className="text-muted-foreground text-sm mt-1">
              Phân tích hiệu quả mô hình và quản lý 35 thuộc tính dữ liệu.
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setTick((t) => t + 1)}>
              <RefreshCw className="w-4 h-4 mr-2" /> Làm mới
            </Button>
            <Button variant="outline" size="sm" className="text-destructive" onClick={() => { localStorage.removeItem(LEADS_STORAGE_KEY); setSelectedLead(null); setTick(t => t + 1); }}>
              Reset Dữ liệu
            </Button>
          </div>
        </div>

        {/* KPI Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KPI icon={<Users className="w-5 h-5" />} label="Tổng leads" value={stats.total} />
          <KPI icon={<Flame className="w-5 h-5" />} label="Hot leads (≥70)" value={stats.hot} accent />
          <KPI icon={<Target className="w-5 h-5" />} label="Convert dự kiến" value={stats.conv} />
          <KPI icon={<TrendingUp className="w-5 h-5" />} label="Conversion rate" value={`${stats.rate}%`} />
        </div>

        {/* Charts Section */}
        <div className="grid lg:grid-cols-2 gap-6">
          <ChartCard title="Phân phối Lead Score (Dự báo AI)" subtitle={`Điểm trung bình: ${stats.avg}`}>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={scoreHist}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="bin" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Phân phối theo Lead Source">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={sourceDist} dataKey="count" nameKey="name" outerRadius={80} innerRadius={40} paddingAngle={2}>
                  {sourceDist.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip contentStyle={tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 10 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Phân phối theo Nghề nghiệp">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={occDist} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis dataKey="name" type="category" tick={{ fontSize: 10 }} width={120} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--chart-2)" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Histogram: Số lần ghé thăm (Total Visits)">
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={visitsHist}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="bin" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Bar dataKey="count" fill="var(--chart-3)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>

        {/* Table Section */}
        <Card>
          <CardHeader>
            <CardTitle>Danh sách Lead chi tiết (Full Feature Set)</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Prospect ID</TableHead>
                  <TableHead>Source</TableHead>
                  <TableHead>Occupation</TableHead>
                  <TableHead className="text-right">Score AI</TableHead>
                  <TableHead>Quality</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Hành động</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.slice(0, 15).map((l) => (
                  <TableRow
                    key={l.prospectId + l.createdAt}
                    className="cursor-pointer hover:bg-muted/30"
                    onClick={() => setSelectedLead(l)}
                  >
                    <TableCell className="font-mono text-xs">{l.prospectId}</TableCell>
                    <TableCell>{l.leadSource}</TableCell>
                    <TableCell>{l.occupation}</TableCell>
                    <TableCell className="text-right font-bold text-primary">{l.score}%</TableCell>
                    <TableCell><Badge variant="outline" className="font-normal">{l.leadQuality}</Badge></TableCell>
                    <TableCell>
                      {l.score >= 70 ? (
                        <Badge className="bg-primary">Hot</Badge>
                      ) : l.score >= 40 ? (
                        <Badge variant="secondary">Warm</Badge>
                      ) : (
                        <Badge variant="outline">Cold</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost">Xem 35 thuộc tính</Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Full Detail Modal */}
        {selectedLead && (
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border-primary/20">
              <CardHeader className="sticky top-0 bg-background border-b z-10 flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Chi tiết Lead: {selectedLead.prospectId}</CardTitle>
                  <p className="text-xs text-muted-foreground mt-1">Dữ liệu thô kết hợp hành vi hệ thống tự sinh</p>
                </div>
                <Button variant="ghost" size="sm" onClick={() => setSelectedLead(null)}>Đóng (Esc)</Button>
              </CardHeader>
              <CardContent className="py-6 space-y-8">
                <div className="grid md:grid-cols-2 gap-8">
                   <DetailGroup title="1. Khách hàng nhập (User Input)" data={{
                      "Lead Origin": selectedLead.leadOrigin,
                      "Lead Source": selectedLead.leadSource,
                      "Country": selectedLead.country,
                      "City": selectedLead.city,
                      "Occupation": selectedLead.occupation,
                      "Specialization": selectedLead.specialization,
                      "What matters most": selectedLead.whatMatters,
                      "How hear about us": selectedLead.howHear,
                      "Do Not Email": selectedLead.doNotEmail ? "Yes" : "No",
                      "Do Not Call": selectedLead.doNotCall ? "Yes" : "No",
                      "Free Copy Interview": selectedLead.freeCopy ? "Yes" : "No",
                   }} />

                   <DetailGroup title="2. Hệ thống ghi nhận (System Generated)" data={{
                      "Total Visits": selectedLead.totalVisits,
                      "Total Time On Site": `${selectedLead.totalTimeOnSite} seconds`,
                      "Page Views Per Visit": selectedLead.pageViewsPerVisit,
                      "Last Activity": selectedLead.lastActivity,
                      "Last Notable Activity": selectedLead.lastNotableActivity,
                      "Search": selectedLead.search ? "Yes" : "No",
                      "Digital Advertisement": selectedLead.digitalAd ? "Yes" : "No",
                      "Through Recommendations": selectedLead.recommendations ? "Yes" : "No",
                   }} />

                   <DetailGroup title="3. Nhân viên / AI gán nhãn (Enriched)" data={{
                      "Tags": selectedLead.tags,
                      "Lead Quality": selectedLead.leadQuality,
                      "Lead Profile": selectedLead.leadProfile,
                      "Asymmetrique Activity Index": selectedLead.activityIndex,
                      "Asymmetrique Profile Index": selectedLead.profileIndex,
                      "Asymmetrique Activity Score": selectedLead.activityScore,
                      "Asymmetrique Profile Score": selectedLead.profileScore,
                   }} accent />

                   <DetailGroup title="4. Kết quả Mô hình AI (Inference)" data={{
                      "Final Score": `${selectedLead.score}%`,
                      "Converted Prediction": selectedLead.converted ? "Yes (Hot)" : "No",
                      "LightGBM Score": selectedLead.bestClassifierScore ? `${selectedLead.bestClassifierScore}%` : "N/A",
                      "Logistic Score": selectedLead.highProbabilityScore ? `${selectedLead.highProbabilityScore}%` : "N/A",
                   }} accent />
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}

// Helper Components
function groupCount(leads: LeadRecord[], key: keyof LeadRecord) {
  const m = new Map<string, number>();
  leads.forEach((l) => {
    const k = String(l[key] ?? "Select");
    if (k && k !== "Select") m.set(k, (m.get(k) ?? 0) + 1);
  });
  return Array.from(m.entries())
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);
}

function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}

function KPI({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: number | string; accent?: boolean }) {
  return (
    <Card className={accent ? "border-primary/40 bg-primary/5" : ""}>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
          <span className={`grid place-items-center w-8 h-8 rounded-md ${accent ? "bg-primary text-primary-foreground" : "bg-muted text-foreground"}`}>
            {icon}
          </span>
        </div>
        <div className="mt-3 text-3xl font-display font-semibold">{value}</div>
      </CardContent>
    </Card>
  );
}

function DetailGroup({ title, data, accent }: { title: string; data: Record<string, any>; accent?: boolean }) {
  return (
    <div className={`space-y-3 p-4 rounded-xl border ${accent ? "bg-primary/5 border-primary/20" : "bg-muted/20"}`}>
      <h3 className={`text-[10px] font-bold uppercase tracking-widest ${accent ? "text-primary" : "text-muted-foreground"}`}>{title}</h3>
      <div className="space-y-1.5">
        {Object.entries(data).map(([k, v]) => (
          <div key={k} className="flex justify-between items-start gap-4 border-b border-border/30 pb-1 last:border-0">
            <span className="text-[10px] font-medium text-muted-foreground shrink-0">{k}</span>
            <span className="text-xs font-semibold text-right">{v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--card)",
  border: "1px solid var(--border)",
  borderRadius: 8,
  fontSize: 11,
};
