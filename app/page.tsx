"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "../lib/supabase";
import {
  AlertTriangle,
  BarChart3,
  BookOpen,
  Brain,
  BrainCircuit,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  Circle,
  Clock3,
  Flame,
  Layers3,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  Search,
  Sparkles,
  Target,
  Timer,
  Trash2,
  Trophy,
  User,
  X,
} from "lucide-react";

type CardProps = React.HTMLAttributes<HTMLDivElement>;
type ReviewState = "aprendizagem" | "em revisão" | "crítico" | "consolidado";
type ReviewGrade = "again" | "hard" | "good" | "easy";
type ReviewStage = "R0" | "R1" | "R2" | "R3" | "R4" | "R5";
type ReviewStatus = "pending" | "completed" | "overdue";
type ActiveTab = "dashboard" | "review" | "library" | "agenda" | "metrics" | "focus" | "settings";

type SessionUser = {
  id: string;
  email: string;
  name: string;
};


function toTitleCase(value: string) {
  return value
    .split(/[^a-zA-ZÀ-ÿ0-9]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function getDisplayNameFromEmail(email: string) {
  const local = email.split("@")[0] ?? "";
  return toTitleCase(local) || "Estudante";
}

function mapAuthUser(user: { id: string; email?: string | null; user_metadata?: Record<string, unknown> } | null): SessionUser | null {
  if (!user) return null;
  const email = user.email ?? "";
  const metadataName = typeof user.user_metadata?.name === "string"
    ? user.user_metadata.name
    : typeof user.user_metadata?.full_name === "string"
      ? user.user_metadata.full_name
      : "";

  return {
    id: user.id,
    email,
    name: metadataName.trim() || getDisplayNameFromEmail(email),
  };
}

type PeerComparisonMetrics = {
  email: string;
  averageAccuracy: number;
  totalRecords: number;
  dueToday: number;
  strongSubjects: string[];
  weakSubjects: string[];
};

type PeerMetricsRow = {
  peer_email: string;
  average_accuracy: number;
  total_records: number;
  due_today: number;
  strong_subjects: string[] | null;
  weak_subjects: string[] | null;
};

type ReviewCard = {
  id: string;
  discipline: string;
  theme: string;
  front: string;
  subtitle: string | null;
  description: string | null;
  recallPrompts: string[];
  supportSummary: string;
  lastAccuracy: number;
  studyDate: string;
  nextReviewAt: string | null;
  reviewStage: ReviewStage;
  state: ReviewState;
  easeFactor: number;
  interval: number;
  repetitions: number;
  lapses: number;
};

type ThemeItem = {
  id: string;
  discipline: string;
  front: string;
  name: string;
  subtitle: string | null;
  description: string | null;
  domain: number;
  nextReview: string;
  risk: string;
  deck: string;
  cards: number;
};

type StudyRecord = {
  id: string;
  userId: string;
  subject: string;
  front: string;
  theme: string;
  subtitle: string | null;
  description: string | null;
  questions: number;
  correct: number;
  accuracy: number;
  studyDate: string;
  scheduledFor: string;
  nextReviewAt: string | null;
  isReview: boolean;
  reviewStage: ReviewStage;
  reviewStatus: ReviewStatus;
  intervalDays: number;
  easeFactor: number;
  createdAt: string;
};

type AgendaItem = {
  id: string;
  subject: string;
  front: string;
  theme: string;
  subtitle: string | null;
  scheduledFor: string;
  nextReviewAt: string | null;
  reviewStage: ReviewStage;
  accuracy: number;
  risk: string;
  status: ReviewStatus;
  intervalDays: number;
  isReview: boolean;
};

type PlannedTopic = {
  id: number;
  discipline: string;
  theme: string;
  source: string;
  scheduled: string;
};

type StudyRecordRow = {
  id: string;
  user_id: string;
  subject: string;
  front: string;
  theme: string;
  subtitle: string | null;
  description: string | null;
  questions: number;
  correct: number;
  accuracy: number;
  study_date: string;
  scheduled_for: string;
  next_review_at: string | null;
  is_review: boolean;
  review_stage: ReviewStage;
  review_status: ReviewStatus;
  interval_days: number;
  ease_factor: number;
  created_at: string;
};

type StudyRecordInsert = Omit<StudyRecordRow, "id" | "created_at">;

type NewStudyFormState = {
  subject: string;
  front: string;
  customSubject: string;
  customFront: string;
  theme: string;
  subtitle: string;
  description: string;
  questions: string;
  correct: string;
  isReview: boolean;
  sessionDate: string;
};

const SUBJECT_FRONTS: Record<string, string[]> = {
  Biologia: ["B1", "B2", "B3"],
  Física: ["F1", "F2", "F3"],
  Geografia: ["GB", "GG", "Atualidades"],
  História: ["HB", "HG", "Filo/Socio"],
  Matemática: ["M1", "M2", "M3"],
  Português: ["Gramática", "Int. Texto", "Literatura", "Redação"],
  Química: ["Q1", "Q2", "Q3"],
  Inglês: ["Inglês"],
};

const uiTheme = {
  panel: "bg-slate-900/70",
  border: "border-slate-800",
};

const HEATMAP = [72, 68, 79, 81, 66, 74, 83, 70, 64, 77, 85, 89];
const STAGE_SEQUENCE: ReviewStage[] = ["R0", "R1", "R2", "R3", "R4", "R5"];
const STAGE_INTERVALS: Record<ReviewStage, number> = {
  R0: 1,
  R1: 2,
  R2: 4,
  R3: 7,
  R4: 15,
  R5: 30,
};

const EMPTY_FORM: NewStudyFormState = {
  subject: "Biologia",
  front: "B1",
  customSubject: "",
  customFront: "",
  theme: "",
  subtitle: "",
  description: "",
  questions: "30",
  correct: "24",
  isReview: false,
  sessionDate: formatDateToInput(new Date()),
};

function classNames(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function Card({ className, ...props }: CardProps) {
  return <div className={classNames("rounded-3xl", className)} {...props} />;
}

function CardHeader({ className, ...props }: CardProps) {
  return <div className={classNames("p-6 pb-0", className)} {...props} />;
}

function CardContent({ className, ...props }: CardProps) {
  return <div className={classNames("p-6", className)} {...props} />;
}

function CardTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={classNames("text-lg font-semibold", className)} {...props} />;
}

function CardDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={classNames("text-sm", className)} {...props} />;
}

function Button({
  className,
  variant,
  type = "button",
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "outline" | "ghost" }) {
  const variants: Record<"outline" | "ghost", string> = {
    outline: "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800",
    ghost: "bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white",
  };

  return (
    <button
      type={type}
      className={classNames(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-60",
        variant ? variants[variant] : "bg-cyan-600 text-white hover:bg-cyan-500",
        className,
      )}
      {...props}
    />
  );
}

function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return <span className={classNames("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", className)} {...props} />;
}

function Progress({ value = 0, className }: { value?: number; className?: string }) {
  return (
    <div className={classNames("h-2 w-full overflow-hidden rounded-full bg-slate-800", className)}>
      <div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={classNames("w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500", className)} {...props} />;
}

function Textarea({ className, ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={classNames("w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-slate-100 outline-none placeholder:text-slate-500", className)} {...props} />;
}

function Tabs({ children }: { value: string; onValueChange: (value: string) => void; children: React.ReactNode }) {
  return <div>{children}</div>;
}

function TabsList({ className, ...props }: CardProps) {
  return <div className={classNames(className)} {...props} />;
}

function TabsTrigger({ className, onClick, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  return <button type="button" className={classNames("px-3 py-2 text-sm text-slate-200", className)} onClick={onClick} {...props} />;
}

function Modal({ open, title, onClose, children }: { open: boolean; title: string; onClose: () => void; children: React.ReactNode }) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="max-h-[90vh] w-full max-w-4xl overflow-auto rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950/40">
        <div className="sticky top-0 flex items-center justify-between border-b border-slate-800 bg-slate-900 p-5">
          <h3 className="text-lg font-semibold text-white">{title}</h3>
          <button onClick={onClose} className="rounded-xl p-2 text-slate-400 hover:bg-slate-800 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <label className="mb-2 block text-sm font-medium text-slate-200">{children}</label>;
}

function InfoBox({ title, text, tone = "default" }: { title: string; text: string; tone?: "default" | "error" | "success" }) {
  const toneClass =
    tone === "error"
      ? "border-red-500/30 bg-red-500/10 text-red-200"
      : tone === "success"
        ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-200"
        : "border-slate-700 bg-slate-950/70 text-slate-300";

  return (
    <div className={classNames("rounded-2xl border p-4", toneClass)}>
      <p className="text-sm font-medium">{title}</p>
      <p className="mt-1 text-sm opacity-90">{text}</p>
    </div>
  );
}

function formatDateToInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseDate(value: string | null | undefined) {
  if (!value) return null;

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split("-").map(Number);
    const parsed = new Date(year, month - 1, day);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function startOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function addDays(date: Date, days: number) {
  const d = new Date(date);
  d.setDate(d.getDate() + days);
  return d;
}

function getRiskBadge(risk: string) {
  switch (risk) {
    case "Crítico":
      return "bg-red-500/15 text-red-300 border-red-500/30";
    case "Alto":
      return "bg-orange-500/15 text-orange-300 border-orange-500/30";
    case "Médio":
      return "bg-yellow-500/15 text-yellow-300 border-yellow-500/30";
    default:
      return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  }
}

function getRiskFromAccuracy(accuracy: number) {
  if (accuracy >= 85) return "Baixo";
  if (accuracy >= 70) return "Médio";
  if (accuracy >= 50) return "Alto";
  return "Crítico";
}

function formatNextReviewLabel(dateValue: string | null) {
  const nextDate = parseDate(dateValue);
  if (!nextDate) return "Sem data";

  const today = startOfDay(new Date());
  const target = startOfDay(nextDate);
  const diff = Math.round((target.getTime() - today.getTime()) / 86400000);

  if (diff < 0) return "Atrasado";
  if (diff === 0) return "Hoje";
  if (diff === 1) return "Amanhã";
  return `Em ${diff} dias`;
}

function formatDateLabel(value: string | null) {
  const date = parseDate(value);
  if (!date) return "Sem data";
  return date.toLocaleDateString("pt-BR");
}

function getDateKey(value: string | Date | null | undefined) {
  const date = value instanceof Date ? value : parseDate(value);
  if (!date) return "";
  return formatDateToInput(date);
}

function isSameDate(value: string | null | undefined, target: Date) {
  return getDateKey(value) === getDateKey(target);
}

function generateRecallPrompts(record: Pick<StudyRecord, "subject" | "front" | "theme" | "subtitle">) {
  const base = [
    `Explique ${record.theme} com suas próprias palavras, sem consultar o material.`,
    `Quais foram os 3 pontos mais importantes de ${record.theme}?`,
    `Se isso caísse em prova agora, qual raciocínio você usaria primeiro?`,
  ];

  if (record.subtitle) {
    base[1] = `Recupere mentalmente os pontos centrais de ${record.subtitle}.`;
  }

  return base;
}

function buildSupportSummary(record: StudyRecord) {
  const parts = [
    record.subtitle ? `Subtítulo: ${record.subtitle}` : null,
    record.description ? `Resumo da sessão: ${record.description}` : null,
    `Desempenho anterior: ${record.correct}/${record.questions} questões (${record.accuracy}%).`,
    `Última sessão: ${formatDateLabel(record.studyDate)}.`,
    `Próxima revisão prevista: ${formatDateLabel(record.nextReviewAt)}.`,
  ].filter(Boolean);

  return parts.join(" ");
}

function average(values: number[]) {
  if (!values.length) return 0;
  return Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function buildSubjectInsights(records: StudyRecord[]) {
  const latest = getLatestTopicRecords(records);
  const map = new Map<string, { subject: string; records: StudyRecord[] }>();

  for (const record of latest) {
    const current = map.get(record.subject) ?? { subject: record.subject, records: [] };
    current.records.push(record);
    map.set(record.subject, current);
  }

  return Array.from(map.values())
    .map(({ subject, records: bucket }) => ({
      subject,
      averageAccuracy: average(bucket.map((item) => item.accuracy)),
      dueToday: bucket.filter((item) => isSameDate(item.nextReviewAt, new Date())).length,
      overdue: bucket.filter((item) => {
        const due = parseDate(item.nextReviewAt);
        return due ? due < startOfDay(new Date()) : false;
      }).length,
      topics: bucket.length,
    }))
    .sort((a, b) => b.averageAccuracy - a.averageAccuracy);
}

function buildFrontInsights(records: StudyRecord[]) {
  const latest = getLatestTopicRecords(records);
  const map = new Map<string, { label: string; records: StudyRecord[] }>();

  for (const record of latest) {
    const label = `${record.subject} · ${record.front}`;
    const current = map.get(label) ?? { label, records: [] };
    current.records.push(record);
    map.set(label, current);
  }

  return Array.from(map.values())
    .map(({ label, records: bucket }) => ({
      label,
      averageAccuracy: average(bucket.map((item) => item.accuracy)),
      topics: bucket.length,
      critical: bucket.filter((item) => item.accuracy < 60).length,
    }))
    .sort((a, b) => a.averageAccuracy - b.averageAccuracy);
}

function getInsightCopy(averageAccuracy: number) {
  if (averageAccuracy >= 82) return "Ponto forte consolidado. Mantenha o ritmo e aumente a profundidade.";
  if (averageAccuracy >= 68) return "Boa tração. Vale reforçar detalhes para subir a consistência.";
  if (averageAccuracy >= 55) return "Zona de atenção. Priorize revisões curtas e recorrentes.";
  return "Ponto fraco atual. Reestude a base, simplifique e repita com mais frequência.";
}

function normalizePeerMetrics(row: PeerMetricsRow): PeerComparisonMetrics {
  return {
    email: row.peer_email,
    averageAccuracy: Math.round(Number(row.average_accuracy ?? 0)),
    totalRecords: Number(row.total_records ?? 0),
    dueToday: Number(row.due_today ?? 0),
    strongSubjects: row.strong_subjects ?? [],
    weakSubjects: row.weak_subjects ?? [],
  };
}

function getTopicKey(record: Pick<StudyRecord, "subject" | "front" | "theme">) {
  return `${record.subject}||${record.front}||${record.theme}`.toLowerCase();
}

function getLatestTopicRecords(records: StudyRecord[]) {
  const map = new Map<string, StudyRecord>();
  for (const record of records) {
    const key = getTopicKey(record);
    const existing = map.get(key);
    if (!existing || new Date(record.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
      map.set(key, record);
    }
  }
  return Array.from(map.values());
}

function mapRowToStudyRecord(row: StudyRecordRow): StudyRecord {
  return {
    id: row.id,
    userId: row.user_id,
    subject: row.subject,
    front: row.front,
    theme: row.theme,
    subtitle: row.subtitle,
    description: row.description,
    questions: row.questions,
    correct: row.correct,
    accuracy: row.accuracy,
    studyDate: row.study_date,
    scheduledFor: row.scheduled_for,
    nextReviewAt: row.next_review_at,
    isReview: row.is_review,
    reviewStage: row.review_stage,
    reviewStatus: row.review_status,
    intervalDays: row.interval_days,
    easeFactor: Number(row.ease_factor),
    createdAt: row.created_at,
  };
}

function mapStudyRecordToTheme(record: StudyRecord): ThemeItem {
  return {
    id: record.id,
    discipline: record.subject,
    front: record.front,
    name: record.theme,
    subtitle: record.subtitle,
    description: record.description,
    domain: record.accuracy,
    nextReview: formatNextReviewLabel(record.nextReviewAt),
    risk: getRiskFromAccuracy(record.accuracy),
    deck: `${record.subject} · ${record.front}`,
    cards: Math.max(10, record.questions),
  };
}

function scheduleCard(card: ReviewCard, grade: ReviewGrade): ReviewCard {
  const qualityMap: Record<ReviewGrade, number> = {
    again: 1,
    hard: 3,
    good: 4,
    easy: 5,
  };

  const q = qualityMap[grade];
  const easeFactor = Math.max(1.3, card.easeFactor + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02)));
  const repetitions = q < 3 ? 0 : card.repetitions + 1;
  let interval: number;

  if (q < 3) {
    interval = 1;
  } else if (repetitions === 1) {
    interval = 1;
  } else if (repetitions === 2) {
    interval = 3;
  } else {
    interval = Math.round(card.interval * easeFactor * (grade === "easy" ? 1.15 : grade === "hard" ? 0.85 : 1));
  }

  return {
    ...card,
    easeFactor: Number(easeFactor.toFixed(2)),
    repetitions,
    interval: Math.max(1, interval),
    lapses: grade === "again" ? card.lapses + 1 : card.lapses,
    state: grade === "again" ? "crítico" : repetitions >= 5 ? "consolidado" : repetitions >= 2 ? "em revisão" : "aprendizagem",
  };
}

function getReviewStateFromRecord(record: StudyRecord): ReviewState {
  if (record.accuracy < 50) return "crítico";
  if (record.reviewStage === "R5" || record.reviewStage === "R4") return "consolidado";
  if (record.reviewStage === "R0") return "aprendizagem";
  return "em revisão";
}

function calculateReviewPlan({
  accuracy,
  previousStage,
  previousEaseFactor,
  isReview,
  sessionDate,
}: {
  accuracy: number;
  previousStage?: ReviewStage;
  previousEaseFactor?: number;
  isReview: boolean;
  sessionDate: string;
}) {
  const currentIndex = previousStage ? Math.max(STAGE_SEQUENCE.indexOf(previousStage), 0) : 0;
  let nextIndex = currentIndex;

  if (!isReview) {
    if (accuracy >= 90) nextIndex = 1;
    else if (accuracy >= 70) nextIndex = 0;
    else nextIndex = 0;
  } else if (accuracy >= 90) {
    nextIndex = Math.min(currentIndex + 2, STAGE_SEQUENCE.length - 1);
  } else if (accuracy >= 75) {
    nextIndex = Math.min(currentIndex + 1, STAGE_SEQUENCE.length - 1);
  } else if (accuracy >= 60) {
    nextIndex = currentIndex;
  } else if (accuracy >= 40) {
    nextIndex = Math.max(currentIndex - 1, 0);
  } else {
    nextIndex = 0;
  }

  const nextStage = STAGE_SEQUENCE[nextIndex];
  const previousEase = previousEaseFactor ?? 2.3;
  const easeDelta = accuracy >= 90 ? 0.18 : accuracy >= 75 ? 0.08 : accuracy >= 60 ? 0 : accuracy >= 40 ? -0.12 : -0.22;
  const easeFactor = Number(Math.max(1.3, Math.min(3, previousEase + easeDelta)).toFixed(2));

  let intervalDays: number;
  let nextReviewAt: string;

  if (!isReview) {
    intervalDays = 0;
    nextReviewAt = sessionDate;
  } else {
    const baseInterval = STAGE_INTERVALS[nextStage];
    const difficultyMultiplier = accuracy >= 90 ? 1.2 : accuracy >= 75 ? 1.05 : accuracy >= 60 ? 0.9 : accuracy >= 40 ? 0.65 : 0.45;
    intervalDays = Math.max(1, Math.round(baseInterval * (easeFactor / 2.3) * difficultyMultiplier));
    nextReviewAt = formatDateToInput(addDays(parseDate(sessionDate) ?? new Date(), intervalDays));
  }

  return {
    reviewStage: nextStage,
    intervalDays,
    easeFactor,
    nextReviewAt,
  };
}

function getStatusFromSchedule(nextReviewAt: string | null): ReviewStatus {
  const nextDate = parseDate(nextReviewAt);
  if (!nextDate) return "pending";
  if (nextDate < startOfDay(new Date())) return "overdue";
  return "pending";
}

function buildReviewQueue(records: StudyRecord[]): ReviewCard[] {
  const latest = getLatestTopicRecords(records)
    .filter((record) => {
      const due = parseDate(record.nextReviewAt);
      return due && due <= endOfDay(addDays(new Date(), 7));
    })
    .sort((a, b) => {
      const da = parseDate(a.nextReviewAt)?.getTime() ?? 0;
      const db = parseDate(b.nextReviewAt)?.getTime() ?? 0;
      return da - db;
    });

  return latest.map((record) => ({
    id: record.id,
    discipline: record.subject,
    theme: record.theme,
    front: record.front,
    subtitle: record.subtitle,
    description: record.description,
    recallPrompts: generateRecallPrompts(record),
    supportSummary: buildSupportSummary(record),
    lastAccuracy: record.accuracy,
    studyDate: record.studyDate,
    nextReviewAt: record.nextReviewAt,
    reviewStage: record.reviewStage,
    state: getReviewStateFromRecord(record),
    easeFactor: record.easeFactor,
    interval: record.intervalDays,
    repetitions: Math.max(0, STAGE_SEQUENCE.indexOf(record.reviewStage)),
    lapses: record.accuracy < 50 ? 1 : 0,
  }));
}

function getInitialFront(subject: string) {
  return SUBJECT_FRONTS[subject]?.[0] ?? "";
}

function getResolvedSubject(form: NewStudyFormState) {
  return form.subject === "__new__" ? form.customSubject.trim() : form.subject;
}

function getResolvedFront(form: NewStudyFormState) {
  return form.front === "__new__" ? form.customFront.trim() : form.front;
}

function validateStudyForm(form: NewStudyFormState) {
  const subject = getResolvedSubject(form);
  const front = getResolvedFront(form);
  const theme = form.theme.trim();
  const questions = Number(form.questions);
  const correct = Number(form.correct);

  if (!subject) return "Escolha ou crie uma matéria.";
  if (!front) return "Escolha ou crie uma frente.";
  if (!theme) return "Preencha o tema estudado.";
  if (!form.sessionDate) return "Preencha a data da sessão / revisão.";
  if (!Number.isFinite(questions) || questions <= 0) return "Digite uma quantidade válida de questões.";
  if (!Number.isFinite(correct) || correct < 0) return "Digite uma quantidade válida de acertos.";
  if (correct > questions) return "Os acertos não podem ser maiores que a quantidade de questões.";

  return null;
}

function StatCard({
  icon: Icon,
  title,
  value,
  helper,
  accent,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  helper: string;
  accent: string;
  onClick?: () => void;
}) {
  return (
    <Card
      onClick={onClick}
      className={classNames(
        uiTheme.panel,
        uiTheme.border,
        "border backdrop-blur-xl shadow-2xl shadow-slate-950/30",
        onClick && "cursor-pointer hover:border-cyan-500/30",
      )}
    >
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-sm text-slate-400">{title}</p>
            <h3 className="mt-2 text-3xl font-semibold tracking-tight text-slate-50">{value}</h3>
            <p className="mt-2 text-xs text-slate-400">{helper}</p>
          </div>
          <div className={classNames("rounded-2xl p-3", accent)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function AuthGate({ onAuthenticated }: { onAuthenticated: (user: SessionUser | null) => void }) {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let mounted = true;

    async function init() {
      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;
      if (mounted) {
        onAuthenticated(user ? mapAuthUser(user) : null);
        setLoading(false);
      }
    }

    void init();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      const user = session?.user;
      onAuthenticated(user ? mapAuthUser(user) : null);
      setLoading(false);
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [onAuthenticated]);

  async function handleLogin() {
    if (!email.trim()) return;
    setSending(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined,
      },
    });

    setMessage(error ? "Não foi possível enviar o link de acesso." : `Pronto. Enviamos seu link de acesso para ${email.trim()}. Bons estudos.`);
    setSending(false);
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-300">Carregando Memora...</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4 text-slate-50">
      <div className="w-full max-w-md rounded-3xl border border-slate-800 bg-slate-900/70 p-8 shadow-2xl shadow-slate-950/30">
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 p-3">
            <Brain className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold">Memora</h1>
            <p className="text-sm text-slate-400">Acesse sua área pessoal de revisão.</p>
          </div>
        </div>
        <div className="space-y-4">
          <Input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Seu e-mail" type="email" />
          <Button className="w-full" onClick={handleLogin} disabled={sending}>
            <User className="h-4 w-4" /> {sending ? "Enviando..." : "Entrar com link mágico"}
          </Button>
          {message && <p className="text-sm text-slate-400">{message}</p>}
        </div>
      </div>
    </div>
  );
}

function Sidebar({ active, onChange, userEmail, onSignOut }: { active: ActiveTab; onChange: (value: ActiveTab) => void; userEmail: string; onSignOut: () => void }) {
  const items: Array<[ActiveTab, string, React.ComponentType<{ className?: string }>]> = [
    ["dashboard", "Dashboard", BarChart3],
    ["review", "Central de Revisão", BrainCircuit],
    ["library", "Biblioteca", BookOpen],
    ["agenda", "Agenda Inteligente", CalendarDays],
    ["metrics", "Estatísticas", Target],
    ["focus", "Pomodoro", Timer],
    ["settings", "Método", Layers3],
  ];

  return (
    <aside className="hidden w-72 shrink-0 lg:block">
      <div className="sticky top-0 flex h-screen flex-col border-r border-slate-800 bg-slate-950/90 px-5 py-6 backdrop-blur-xl">
        <div className="rounded-3xl border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-5">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-gradient-to-br from-cyan-400 to-blue-600 p-3 shadow-lg shadow-cyan-500/20">
              <Brain className="h-6 w-6 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-white">Memora</h1>
              <p className="text-xs text-slate-400">Sistema operacional de revisão</p>
            </div>
          </div>
          <div className="mt-5 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Usuário</p>
            <p className="mt-2 truncate text-sm font-medium text-slate-100">{userEmail}</p>
            <div className="mt-4 flex items-center justify-between gap-2 text-xs text-slate-400">
              <span>Vestibular de Medicina</span>
              <button onClick={onSignOut} className="rounded-lg border border-slate-700 px-2 py-1 hover:bg-slate-800">
                Sair
              </button>
            </div>
          </div>
        </div>

        <nav className="mt-6 space-y-2">
          {items.map(([key, label, IconCmp]) => (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={classNames(
                "flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm transition",
                active === key ? "bg-slate-800 text-white shadow-lg shadow-slate-950/20" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100",
              )}
            >
              <IconCmp className="h-4 w-4" />
              <span>{label}</span>
            </button>
          ))}
        </nav>

        <div className="mt-auto rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
          <div className="flex items-center gap-3">
            <div className="rounded-xl bg-emerald-500/15 p-2 text-emerald-300">
              <Flame className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium text-slate-100">Consistência em alta</p>
              <p className="text-xs text-slate-400">Organização individual e segura</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function PendingModal({ open, onClose, items, onDelete }: { open: boolean; onClose: () => void; items: AgendaItem[]; onDelete: (id: string) => void }) {
  const today = startOfDay(new Date());
  const weekEnd = endOfDay(addDays(today, 7));

  const overdue = items.filter((item) => {
    const date = parseDate(item.nextReviewAt);
    return date && date < today;
  });
  const dueToday = items.filter((item) => {
    const date = parseDate(item.nextReviewAt);
    return date && date >= today && date <= endOfDay(today);
  });
  const nextDays = items.filter((item) => {
    const date = parseDate(item.nextReviewAt);
    return date && date > endOfDay(today) && date <= weekEnd;
  });

  return (
    <Modal open={open} onClose={onClose} title="Macro de pendentes e próximas revisões">
      <div className="space-y-6">
        {[
          { title: "Atrasadas", data: overdue },
          { title: "Hoje", data: dueToday },
          { title: "Próximos 7 dias", data: nextDays },
        ].map((section) => (
          <div key={section.title} className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-semibold text-slate-100">{section.title}</h4>
              <span className="text-xs text-slate-500">{section.data.length} itens</span>
            </div>
            {section.data.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-sm text-slate-500">Nenhum item nesta faixa.</div>
            ) : (
              section.data.map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-100">{item.subject} · {item.front} · {item.theme}</p>
                      <p className="text-xs text-slate-500">{item.subtitle || "Sem subtítulo"}</p>
                      <p className="mt-1 text-xs text-slate-400">Revisão prevista: {formatDateLabel(item.nextReviewAt)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={classNames("border", getRiskBadge(item.risk))}>{item.risk}</Badge>
                      <button onClick={() => onDelete(item.id)} className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:bg-slate-800 hover:text-red-300">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        ))}
      </div>
    </Modal>
  );
}

function DashboardPage({
  reviewQueue,
  agendaItems,
  themes,
  onOpenNewStudy,
  onDeleteRecord,
  userName,
}: {
  reviewQueue: ReviewCard[];
  agendaItems: AgendaItem[];
  themes: ThemeItem[];
  onOpenNewStudy: () => void;
  onDeleteRecord: (id: string) => void;
  userName: string;
}) {
  const [manualTopic, setManualTopic] = useState("");
  const [manualDiscipline, setManualDiscipline] = useState("Biologia");
  const [plannedTopics, setPlannedTopics] = useState<PlannedTopic[]>([]);
  const [isPendingOpen, setIsPendingOpen] = useState(false);

  const today = startOfDay(new Date());
  const todayEnd = endOfDay(today);
  const todayItems = agendaItems.filter((item) => {
    const due = parseDate(item.nextReviewAt);
    return due && due >= today && due <= todayEnd;
  });

  const overdueCount = agendaItems.filter((item) => {
    const due = parseDate(item.nextReviewAt);
    return due && due < today;
  }).length;

  const upcomingCount = agendaItems.filter((item) => {
    const due = parseDate(item.nextReviewAt);
    return due && due > todayEnd && due <= endOfDay(addDays(today, 7));
  }).length;

  const criticalThemes = themes.filter((item) => item.risk === "Crítico" || item.risk === "Alto").length;
  const mature = reviewQueue.filter((c) => c.state === "consolidado").length;

  function addPlannedTopic() {
    if (!manualTopic.trim()) return;
    setPlannedTopics((prev) => [
      {
        id: Date.now(),
        discipline: manualDiscipline,
        theme: manualTopic.trim(),
        source: "Planejado manualmente",
        scheduled: "Aguardando agenda",
      },
      ...prev,
    ]);
    setManualTopic("");
  }

  return (
    <div className="space-y-6">
      <PendingModal open={isPendingOpen} onClose={() => setIsPendingOpen(false)} items={agendaItems} onDelete={onDeleteRecord} />

      <section className="overflow-hidden rounded-[32px] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 shadow-2xl shadow-slate-950/30 md:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" /> Experiência personalizada
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">Olá, {userName}. O que vamos estudar hoje?</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
              Agora o dashboard, a biblioteca e a agenda olham para a mesma base. O que foi salvo entra automaticamente na trilha de revisão.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs text-slate-500">Pendentes hoje</p>
                <p className="mt-2 text-2xl font-semibold text-white">{todayItems.length}</p>
                <p className="mt-1 text-xs text-slate-400">Revisões realmente vencendo hoje</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs text-slate-500">Atrasadas</p>
                <p className="mt-2 text-2xl font-semibold text-white">{overdueCount}</p>
                <p className="mt-1 text-xs text-slate-400">Precisam de recuperação imediata</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs text-slate-500">Próximos 7 dias</p>
                <p className="mt-2 text-2xl font-semibold text-white">{upcomingCount}</p>
                <p className="mt-1 text-xs text-slate-400">Carga prevista para a semana</p>
              </div>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button className="h-11 rounded-2xl px-5" onClick={onOpenNewStudy}>
                <Plus className="h-4 w-4" /> Registrar estudo de hoje
              </Button>
              <Button variant="outline" className="h-11 rounded-2xl" onClick={() => setIsPendingOpen(true)}>
                <Clock3 className="h-4 w-4" /> Ver macro de pendentes
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5">
              <div className="flex items-center gap-3 text-red-300">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-sm font-medium">Comece por aqui</p>
              </div>
              <h3 className="mt-3 text-2xl font-semibold text-white">{agendaItems[0]?.subject || "Sem pendências"}</h3>
              <p className="mt-1 text-sm text-slate-300">{agendaItems[0] ? `${agendaItems[0].front} · ${agendaItems[0].theme}` : "Sua agenda está sob controle por enquanto."}</p>
            </div>
            <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-5">
              <div className="flex items-center gap-3 text-cyan-300">
                <Target className="h-5 w-5" />
                <p className="text-sm font-medium">Temas ativos</p>
              </div>
              <h3 className="mt-3 text-2xl font-semibold text-white">{themes.length}</h3>
              <p className="mt-1 text-sm text-slate-300">Base cognitiva do usuário logado.</p>
            </div>
            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
              <div className="flex items-center gap-3 text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
                <p className="text-sm font-medium">Cards maduros</p>
              </div>
              <h3 className="mt-3 text-2xl font-semibold text-white">{mature}</h3>
              <p className="mt-1 text-sm text-slate-300">Sua sessão de revisão reflete a base salva.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Brain} title="Revisões do dia" value={String(todayItems.length)} helper="Itens realmente vencendo hoje" accent="bg-cyan-500/20" />
        <StatCard icon={AlertTriangle} title="Atrasadas" value={String(overdueCount)} helper="Clique para abrir o macro" accent="bg-red-500/20" onClick={() => setIsPendingOpen(true)} />
        <StatCard icon={Trophy} title="Temas em atenção" value={String(criticalThemes)} helper="Precisam de reforço" accent="bg-amber-500/20" />
        <StatCard icon={RefreshCcw} title="Próxima semana" value={String(upcomingCount)} helper="Carga prevista de revisão" accent="bg-violet-500/20" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
          <CardHeader>
            <CardTitle className="text-slate-50">Revisões do dia</CardTitle>
            <CardDescription className="text-slate-400">Agenda viva baseada nas revisões vencidas e previstas.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {todayItems.length === 0 ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5 text-sm text-slate-400">Nenhuma revisão vence hoje.</div>
            ) : (
              todayItems.map((task) => (
                <div key={task.id} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="border border-slate-700 bg-slate-800 text-slate-300">{task.subject}</Badge>
                        <Badge className="border border-slate-700 bg-slate-800 text-slate-300">{task.front}</Badge>
                        <Badge className={classNames("border", getRiskBadge(task.risk))}>{task.risk}</Badge>
                      </div>
                      <h3 className="mt-3 text-xl font-semibold text-white">{task.theme}</h3>
                      <p className="mt-1 text-sm text-slate-300">{task.subtitle || "Sem subtítulo"}</p>
                    </div>
                    <div className="flex flex-col items-end gap-3">
                      <p className="text-sm text-slate-400">Próxima revisão: {formatDateLabel(task.nextReviewAt)}</p>
                      <button onClick={() => onDeleteRecord(task.id)} className="rounded-xl border border-slate-700 px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-red-300">
                        <Trash2 className="mr-2 inline h-4 w-4" /> Excluir item
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
          <CardHeader>
            <CardTitle className="text-slate-50">Planejar próximos temas</CardTitle>
            <CardDescription className="text-slate-400">Espaço auxiliar para registrar o que deve entrar na próxima rodada.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <select value={manualDiscipline} onChange={(e) => setManualDiscipline(e.target.value)} className="h-11 rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 outline-none">
                {Object.keys(SUBJECT_FRONTS).map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
              <Input value={manualTopic} onChange={(e) => setManualTopic(e.target.value)} placeholder="Ex: Sistema endócrino" className="h-11 rounded-2xl border-slate-800 bg-slate-900 text-slate-100" />
              <Button className="h-11 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white" onClick={addPlannedTopic}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar para próximas revisões
              </Button>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-sm font-medium text-slate-100">Próximas planejadas manualmente</p>
              <div className="mt-4 space-y-3">
                {plannedTopics.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3 text-sm text-slate-500">Nenhum tema planejado manualmente.</div>
                ) : (
                  plannedTopics.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="text-sm font-medium text-slate-100">{item.theme}</p>
                          <p className="text-xs text-slate-500">{item.discipline} · {item.source}</p>
                        </div>
                        <Badge className="border border-slate-700 bg-slate-800 text-slate-300">{item.scheduled}</Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ReviewPage({
  reviewQueue,
  onReviewAnswer,
}: {
  reviewQueue: ReviewCard[];
  onReviewAnswer: (recordId: string, grade: ReviewGrade) => Promise<void>;
}) {
  const [index, setIndex] = useState(0);
  const [showSupport, setShowSupport] = useState(false);
  const [submittingGrade, setSubmittingGrade] = useState<ReviewGrade | null>(null);
  const current = reviewQueue[index] ?? null;

  const stats = useMemo(
    () => ({
      total: reviewQueue.length,
      critical: reviewQueue.filter((c) => c.state === "crítico").length,
      mature: reviewQueue.filter((c) => c.state === "consolidado").length,
    }),
    [reviewQueue],
  );

  useEffect(() => {
    if (index > 0 && index >= reviewQueue.length) {
      setIndex(0);
      setShowSupport(false);
    }
  }, [index, reviewQueue.length]);

  async function answerCard(grade: ReviewGrade) {
    if (!current || reviewQueue.length === 0) return;
    try {
      setSubmittingGrade(grade);
      await onReviewAnswer(current.id, grade);
      setShowSupport(false);
      setIndex((prev) => {
        const nextLength = Math.max(reviewQueue.length - 1, 1);
        return prev >= nextLength - 1 ? 0 : prev;
      });
    } finally {
      setSubmittingGrade(null);
    }
  }

  if (!current) {
    return (
      <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
        <CardContent className="p-10 text-center text-slate-400">Nenhum card disponível na sua fila de revisão.</CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card className={classNames(uiTheme.panel, uiTheme.border, "border overflow-hidden")}>
        <CardHeader className="border-b border-slate-800 bg-slate-900/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-slate-50">Central de Revisão</CardTitle>
              <CardDescription className="text-slate-400">Revisão ativa guiada: recupere mentalmente, depois confira o apoio da sessão.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="border border-slate-700 bg-slate-800 text-slate-200">{current.discipline}</Badge>
              <Badge className="border border-slate-700 bg-slate-800 text-slate-200">{current.front}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between text-sm text-slate-400">
            <span>Card {index + 1} de {reviewQueue.length}</span>
            <span>Estado: <span className="text-slate-200">{current.state}</span></span>
          </div>
          <motion.div key={`${current.id}-${showSupport ? "support" : "prompt"}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.25 }} className="min-h-[380px] rounded-[28px] border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-8">
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-300">
              <Brain className="h-4 w-4" /> Recall ativo guiado
            </div>
            <div className="flex h-full flex-col justify-between gap-8">
              <div>
                <p className="text-sm text-slate-500">Tema</p>
                <h3 className="mt-4 text-2xl font-semibold leading-tight text-slate-50 md:text-3xl">{current.theme}</h3>
                <p className="mt-3 text-sm text-slate-400">{current.subtitle || "Recupere os conceitos, passos e conexões principais antes de abrir o apoio."}</p>
              </div>
              {showSupport ? (
                <div className="space-y-4 rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                  <div>
                    <p className="text-sm text-slate-500">Apoio da revisão</p>
                    <p className="mt-3 text-base leading-7 text-slate-200">{current.supportSummary}</p>
                  </div>
                  <div className="grid gap-3 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <p className="text-xs text-slate-500">Última acurácia</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{current.lastAccuracy}%</p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <p className="text-xs text-slate-500">Estágio atual</p>
                      <p className="mt-2 text-2xl font-semibold text-white">{current.reviewStage}</p>
                    </div>
                    <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
                      <p className="text-xs text-slate-500">Próxima revisão</p>
                      <p className="mt-2 text-lg font-semibold text-white">{formatDateLabel(current.nextReviewAt)}</p>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-3 rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-5">
                  {current.recallPrompts.map((prompt) => (
                    <div key={prompt} className="rounded-2xl border border-slate-800 bg-slate-950/60 p-4 text-slate-300">{prompt}</div>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
          {!showSupport ? (
            <Button className="mt-5 h-12 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 text-white hover:opacity-95" onClick={() => setShowSupport(true)}>
              Mostrar apoio da revisão
            </Button>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <Button variant="outline" className="h-12 rounded-2xl border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/15" onClick={() => answerCard("again")} disabled={!!submittingGrade}>Errei</Button>
              <Button variant="outline" className="h-12 rounded-2xl border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/15" onClick={() => answerCard("hard")} disabled={!!submittingGrade}>Lembrei com dificuldade</Button>
              <Button variant="outline" className="h-12 rounded-2xl border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/15" onClick={() => answerCard("good")} disabled={!!submittingGrade}>Acertei bem</Button>
              <Button variant="outline" className="h-12 rounded-2xl border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15" onClick={() => answerCard("easy")} disabled={!!submittingGrade}>Muito fácil</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
          <CardHeader>
            <CardTitle className="text-slate-50">Painel da sessão</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs text-slate-500">Cards da sessão</p><p className="mt-2 text-3xl font-semibold text-white">{stats.total}</p></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs text-slate-500">Críticos</p><p className="mt-2 text-3xl font-semibold text-red-300">{stats.critical}</p></div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4"><p className="text-xs text-slate-500">Consolidados</p><p className="mt-2 text-3xl font-semibold text-emerald-300">{stats.mature}</p></div>
          </CardContent>
        </Card>

        <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
          <CardHeader>
            <CardTitle className="text-slate-50">Como interpretar</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">Primeiro tente lembrar sozinha. Só depois abra o apoio para checar se a estrutura mental bateu.</div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">"Errei" e "Lembrei com dificuldade" encurtam a próxima revisão. "Acertei bem" e "Muito fácil" ampliam o intervalo.</div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">A sessão atualiza agenda, dashboard e estatísticas na mesma base.</div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LibraryPage({ themes, onDeleteRecord }: { themes: ThemeItem[]; onDeleteRecord: (id: string) => void }) {
  const [query, setQuery] = useState("");
  const filtered = themes.filter((t) => `${t.discipline} ${t.front} ${t.name} ${t.subtitle ?? ""} ${t.deck}`.toLowerCase().includes(query.toLowerCase()));

  const disciplineStats = useMemo(() => {
    return Object.keys(SUBJECT_FRONTS).map((name, index) => {
      const items = themes.filter((item) => item.discipline === name);
      const average = items.length ? Math.round(items.reduce((acc, item) => acc + item.domain, 0) / items.length) : 0;
      const colors = ["bg-emerald-500", "bg-sky-500", "bg-violet-500", "bg-amber-500", "bg-cyan-500", "bg-orange-500", "bg-pink-500", "bg-indigo-500"];
      return {
        id: index + 1,
        name,
        color: colors[index % colors.length],
        cards: items.reduce((acc, item) => acc + item.cards, 0),
        mastery: average,
      };
    });
  }, [themes]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Biblioteca de Conteúdos</h2>
          <p className="mt-1 text-sm text-slate-400">Matéria, frente, tema, subtítulo e descrição do que foi registrado.</p>
        </div>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar matéria, frente ou tema" className="h-11 w-72 rounded-2xl border-slate-800 bg-slate-900 pl-10 text-slate-100" />
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {disciplineStats.map((d) => (
          <Card key={d.id} className={classNames(uiTheme.panel, uiTheme.border, "border")}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-400">{d.name}</p>
                  <h3 className="mt-2 text-2xl font-semibold text-white">{d.cards}</h3>
                  <p className="text-xs text-slate-500">cards ativos</p>
                </div>
                <div className={classNames("h-3 w-3 rounded-full", d.color)} />
              </div>
              <div className="mt-4">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-400"><span>Domínio médio</span><span>{d.mastery}%</span></div>
                <Progress value={d.mastery} className="h-2 bg-slate-800" />
              </div>
            </CardContent>
          </Card>
        ))}
      </section>

      <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
        <CardHeader>
          <CardTitle className="text-slate-50">Mapeamento de temas</CardTitle>
          <CardDescription className="text-slate-400">Cada unidade cognitiva com risco, domínio e próxima revisão.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {filtered.length === 0 ? (
            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5 text-sm text-slate-500">Nenhum tema encontrado.</div>
          ) : (
            filtered.map((item) => (
              <div key={item.id} className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge className="border border-slate-700 bg-slate-800 text-slate-300">{item.discipline}</Badge>
                    <Badge className="border border-slate-700 bg-slate-800 text-slate-300">{item.front}</Badge>
                    <Badge className={classNames("border", getRiskBadge(item.risk))}>{item.risk}</Badge>
                  </div>
                  <h3 className="mt-3 text-lg font-medium text-slate-100">{item.name}</h3>
                  <p className="mt-1 text-sm text-slate-400">{item.subtitle || "Sem subtítulo"}</p>
                  {item.description && <p className="mt-2 text-xs leading-6 text-slate-500">{item.description}</p>}
                </div>
                <div className="w-full max-w-md">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-400"><span>Domínio</span><span>{item.domain}%</span></div>
                  <Progress value={item.domain} className="h-2 bg-slate-800" />
                  <p className="mt-3 text-xs text-slate-500">Próxima revisão: {item.nextReview}</p>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" className="justify-between rounded-2xl text-slate-300 hover:bg-slate-800 hover:text-white">
                    Tema ativo <ChevronRight className="h-4 w-4" />
                  </Button>
                  <button onClick={() => onDeleteRecord(item.id)} className="rounded-xl border border-slate-700 p-2 text-slate-400 hover:bg-slate-800 hover:text-red-300">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function AgendaPage({ agendaItems, onDeleteRecord }: { agendaItems: AgendaItem[]; onDeleteRecord: (id: string) => void }) {
  const today = startOfDay(new Date());
  const todayEnd = endOfDay(today);
  const weekEnd = endOfDay(addDays(today, 7));

  const overdue = agendaItems.filter((item) => {
    const date = parseDate(item.nextReviewAt);
    return date && date < today;
  });
  const dueToday = agendaItems.filter((item) => {
    const date = parseDate(item.nextReviewAt);
    return date && date >= today && date <= todayEnd;
  });
  const upcoming = agendaItems.filter((item) => {
    const date = parseDate(item.nextReviewAt);
    return date && date > todayEnd && date <= weekEnd;
  });

  const groupedWeek = Array.from({ length: 7 }).map((_, index) => {
    const day = addDays(today, index);
    const dayStart = startOfDay(day);
    const dayEnd = endOfDay(day);
    return {
      label: day.toLocaleDateString("pt-BR", { weekday: "short", day: "2-digit", month: "2-digit" }),
      items: agendaItems.filter((item) => {
        const date = parseDate(item.nextReviewAt);
        return date && date >= dayStart && date <= dayEnd;
      }),
    };
  });

  return (
    <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
      <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
        <CardHeader>
          <CardTitle className="text-slate-50">Agenda Inteligente</CardTitle>
          <CardDescription className="text-slate-400">Revisões vencidas, do dia e próximas revisões previstas.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {[
            { title: "Revisões atrasadas", data: overdue },
            { title: "Revisões do dia", data: dueToday },
            { title: "Próximas revisões", data: upcoming },
          ].map((section) => (
            <div key={section.title}>
              <h4 className="mb-3 text-sm font-semibold text-slate-100">{section.title}</h4>
              <div className="space-y-3">
                {section.data.length === 0 ? (
                  <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-500">Nenhum item nesta faixa.</div>
                ) : (
                  section.data.map((item) => (
                    <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="text-sm font-medium text-slate-100">{item.subject} · {item.front} · {item.theme}</p>
                            <Badge className={classNames("border", getRiskBadge(item.risk))}>{item.risk}</Badge>
                          </div>
                          <p className="mt-1 text-xs text-slate-500">{item.subtitle || "Sem subtítulo"}</p>
                          <p className="mt-1 text-xs text-slate-400">{formatDateLabel(item.nextReviewAt)} · estágio {item.reviewStage}</p>
                        </div>
                        <button onClick={() => onDeleteRecord(item.id)} className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:bg-slate-800 hover:text-red-300">
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
          <CardHeader>
            <CardTitle className="text-slate-50">Visão da semana</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {groupedWeek.map((group) => (
              <div key={group.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-slate-100">{group.label}</p>
                  <span className="text-xs text-slate-500">{group.items.length} itens</span>
                </div>
                {group.items.length === 0 ? (
                  <p className="text-xs text-slate-500">Sem revisões previstas.</p>
                ) : (
                  <div className="space-y-2">
                    {group.items.map((item) => (
                      <div key={item.id} className="rounded-xl border border-slate-800 bg-slate-950/60 p-3 text-xs text-slate-300">
                        {item.subject} · {item.front} · {item.theme}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
          <CardHeader>
            <CardTitle className="text-slate-50">Lógica do agendador</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            {[
              ["R0", "Primeiro contato ou retomada forte"],
              ["R1", "Fixação inicial"],
              ["R2", "Consolidação curta"],
              ["R3", "Expansão de intervalo"],
              ["R4", "Memória mais estável"],
              ["R5", "Longo prazo"],
            ].map(([title, desc]) => (
              <div key={title} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="font-medium text-slate-100">{title}</p>
                <p className="mt-1 text-slate-400">{desc}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function MetricsPage({ studyRecords, currentUserEmail }: { studyRecords: StudyRecord[]; currentUserEmail: string }) {
  const [compareEmail, setCompareEmail] = useState("");
  const [peerMetrics, setPeerMetrics] = useState<PeerComparisonMetrics | null>(null);
  const [compareError, setCompareError] = useState("");
  const [isComparing, setIsComparing] = useState(false);

  const latest = useMemo(() => getLatestTopicRecords(studyRecords), [studyRecords]);
  const averageAccuracy = latest.length ? average(latest.map((item) => item.accuracy)) : 0;
  const dueToday = latest.filter((item) => isSameDate(item.nextReviewAt, new Date())).length;
  const overdue = latest.filter((item) => {
    const due = parseDate(item.nextReviewAt);
    return due ? due < startOfDay(new Date()) : false;
  }).length;
  const subjectInsights = useMemo(() => buildSubjectInsights(studyRecords), [studyRecords]);
  const frontInsights = useMemo(() => buildFrontInsights(studyRecords), [studyRecords]);
  const strongestSubject = subjectInsights[0] ?? null;
  const weakestSubject = [...subjectInsights].sort((a, b) => a.averageAccuracy - b.averageAccuracy)[0] ?? null;
  const strongestFront = [...frontInsights].sort((a, b) => b.averageAccuracy - a.averageAccuracy)[0] ?? null;
  const weakestFront = frontInsights[0] ?? null;

  async function handleCompare() {
    if (!compareEmail.trim()) {
      setCompareError("Digite o e-mail do colega para comparar.");
      return;
    }

    setCompareError("");
    setIsComparing(true);
    setPeerMetrics(null);

    const { data, error } = await supabase.rpc("get_peer_metrics", {
      peer_email_input: compareEmail.trim().toLowerCase(),
    });

    if (error || !data || !Array.isArray(data) || data.length === 0) {
      setCompareError("Comparação indisponível. Para ativar, crie a função SQL get_peer_metrics no Supabase.");
      setIsComparing(false);
      return;
    }

    setPeerMetrics(normalizePeerMetrics(data[0] as PeerMetricsRow));
    setIsComparing(false);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Estatísticas e Performance</h2>
        <p className="mt-1 text-sm text-slate-400">Insights acionáveis para decidir onde focar, onde manter e onde recuperar.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CheckCircle2} title="Taxa média" value={`${averageAccuracy}%`} helper="Média dos temas mais recentes" accent="bg-emerald-500/20" />
        <StatCard icon={Clock3} title="Pendências hoje" value={String(dueToday)} helper="O que já deveria entrar na rodada de hoje" accent="bg-sky-500/20" />
        <StatCard icon={AlertTriangle} title="Atrasadas" value={String(overdue)} helper="Itens fora da janela ideal" accent="bg-red-500/20" />
        <StatCard icon={RefreshCcw} title="Temas únicos" value={String(latest.length)} helper="Base cognitiva atual" accent="bg-violet-500/20" />
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
          <CardHeader>
            <CardTitle className="text-slate-50">Leitura estratégica</CardTitle>
            <CardDescription className="text-slate-400">Onde sustentar performance e onde aumentar foco.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-emerald-300">Ponto forte em matéria</p>
              <p className="mt-3 text-xl font-semibold text-white">{strongestSubject?.subject || "Sem dados"}</p>
              <p className="mt-2 text-sm text-slate-300">{strongestSubject ? `${strongestSubject.averageAccuracy}% de média em ${strongestSubject.topics} temas.` : "Registre mais sessões para liberar essa leitura."}</p>
              <p className="mt-3 text-xs text-slate-400">{strongestSubject ? getInsightCopy(strongestSubject.averageAccuracy) : ""}</p>
            </div>
            <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-red-300">Ponto fraco em matéria</p>
              <p className="mt-3 text-xl font-semibold text-white">{weakestSubject?.subject || "Sem dados"}</p>
              <p className="mt-2 text-sm text-slate-300">{weakestSubject ? `${weakestSubject.averageAccuracy}% de média e ${weakestSubject.overdue} pendências atrasadas.` : "Registre mais sessões para liberar essa leitura."}</p>
              <p className="mt-3 text-xs text-slate-400">{weakestSubject ? getInsightCopy(weakestSubject.averageAccuracy) : ""}</p>
            </div>
            <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-cyan-300">Frente mais sólida</p>
              <p className="mt-3 text-xl font-semibold text-white">{strongestFront?.label || "Sem dados"}</p>
              <p className="mt-2 text-sm text-slate-300">{strongestFront ? `${strongestFront.averageAccuracy}% de média em ${strongestFront.topics} temas.` : ""}</p>
            </div>
            <div className="rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4">
              <p className="text-xs uppercase tracking-[0.18em] text-amber-300">Frente que pede reforço</p>
              <p className="mt-3 text-xl font-semibold text-white">{weakestFront?.label || "Sem dados"}</p>
              <p className="mt-2 text-sm text-slate-300">{weakestFront ? `${weakestFront.averageAccuracy}% de média e ${weakestFront.critical} temas críticos.` : ""}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
          <CardHeader>
            <CardTitle className="text-slate-50">Comparar com colega</CardTitle>
            <CardDescription className="text-slate-400">Benchmark básico por e-mail cadastrado.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <Input value={compareEmail} onChange={(e) => setCompareEmail(e.target.value)} placeholder="E-mail do colega" type="email" className="h-11 rounded-2xl" />
              <Button className="h-11 rounded-2xl px-5" onClick={handleCompare} disabled={isComparing}>{isComparing ? "Comparando..." : "Comparar"}</Button>
            </div>
            <p className="text-xs text-slate-500">Seu perfil atual: {currentUserEmail}</p>
            {compareError && <InfoBox title="Comparação indisponível" text={compareError} tone="error" />}
            {peerMetrics ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-xs text-slate-500">Sua média vs colega</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{averageAccuracy}% vs {peerMetrics.averageAccuracy}%</p>
                  <p className="mt-2 text-sm text-slate-400">Diferença: {averageAccuracy - peerMetrics.averageAccuracy >= 0 ? "+" : ""}{averageAccuracy - peerMetrics.averageAccuracy} p.p.</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <p className="text-xs text-slate-500">Pendências de hoje</p>
                  <p className="mt-2 text-2xl font-semibold text-white">{dueToday} vs {peerMetrics.dueToday}</p>
                  <p className="mt-2 text-sm text-slate-400">Carga básica do dia.</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 md:col-span-2">
                  <p className="text-xs text-slate-500">Assuntos fortes do colega</p>
                  <p className="mt-2 text-sm text-slate-300">{peerMetrics.strongSubjects.length ? peerMetrics.strongSubjects.join(" · ") : "Sem dados públicos suficientes."}</p>
                  <p className="mt-3 text-xs text-slate-500">Assuntos frágeis do colega: {peerMetrics.weakSubjects.length ? peerMetrics.weakSubjects.join(" · ") : "Sem dados públicos suficientes."}</p>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-400">Insira o e-mail de outro usuário para trazer uma comparação básica de KPIs. Essa parte depende da função SQL get_peer_metrics.</div>
            )}
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
          <CardHeader>
            <CardTitle className="text-slate-50">Ranking por matéria</CardTitle>
            <CardDescription className="text-slate-400">Use para decidir onde aprofundar e onde recuperar base.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {subjectInsights.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-500">Sem dados suficientes ainda.</div>
            ) : (
              subjectInsights.map((item, idx) => (
                <div key={item.subject} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-100">#{idx + 1} · {item.subject}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.topics} temas · {item.dueToday} pendências hoje · {item.overdue} atrasadas</p>
                    </div>
                    <Badge className={classNames("border", getRiskBadge(getRiskFromAccuracy(item.averageAccuracy)))}>{item.averageAccuracy}%</Badge>
                  </div>
                  <p className="mt-3 text-xs text-slate-400">{getInsightCopy(item.averageAccuracy)}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
          <CardHeader>
            <CardTitle className="text-slate-50">Ranking por frente</CardTitle>
            <CardDescription className="text-slate-400">Mostra exatamente onde o refinamento precisa acontecer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {frontInsights.length === 0 ? (
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-500">Sem dados suficientes ainda.</div>
            ) : (
              [...frontInsights].sort((a, b) => b.averageAccuracy - a.averageAccuracy).map((item, idx) => (
                <div key={item.label} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-slate-100">#{idx + 1} · {item.label}</p>
                      <p className="mt-1 text-xs text-slate-500">{item.topics} temas · {item.critical} em atenção</p>
                    </div>
                    <Badge className={classNames("border", getRiskBadge(getRiskFromAccuracy(item.averageAccuracy)))}>{item.averageAccuracy}%</Badge>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function FocusPage() {
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [isRunning, setIsRunning] = useState(false);

  useEffect(() => {
    if (!isRunning) return;
    const timer = window.setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          window.clearInterval(timer);
          setIsRunning(false);
          return 25 * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => window.clearInterval(timer);
  }, [isRunning]);

  const minutes = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const seconds = String(secondsLeft % 60).padStart(2, "0");

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_0.9fr]">
      <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
        <CardHeader>
          <CardTitle className="text-slate-50">Pomodoro Integrado</CardTitle>
          <CardDescription className="text-slate-400">Foco como suporte da revisão, não como feature solta.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center gap-6 py-12">
          <div className="flex h-64 w-64 items-center justify-center rounded-full border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 shadow-2xl shadow-slate-950/30">
            <div className="text-center">
              <p className="text-sm uppercase tracking-[0.18em] text-slate-500">Foco</p>
              <h2 className="mt-3 text-6xl font-semibold tracking-tight text-white">{minutes}:{seconds}</h2>
              <p className="mt-2 text-sm text-slate-400">{isRunning ? "Sessão em andamento" : "Sessão pronta para iniciar"}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button className="h-12 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 text-white" onClick={() => setIsRunning(true)} disabled={isRunning}>
              <Play className="h-4 w-4" /> Iniciar
            </Button>
            <Button variant="outline" className="h-12 rounded-2xl px-6" onClick={() => setIsRunning(false)}>
              <Pause className="h-4 w-4" /> Pausar
            </Button>
            <Button variant="outline" className="h-12 rounded-2xl px-6" onClick={() => { setIsRunning(false); setSecondsLeft(25 * 60); }}>
              <RefreshCcw className="h-4 w-4" /> Resetar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
        <CardHeader>
          <CardTitle className="text-slate-50">Ritmo recomendado</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm text-slate-300">
          {["25 min foco total", "5 min pausa curta", "4 blocos antes da pausa longa", "Use antes de revisões críticas"].map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <Circle className="mt-1 h-3.5 w-3.5 fill-cyan-400 text-cyan-400" />
              <span>{item}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
        <CardHeader>
          <CardTitle className="text-slate-50">Método de revisão</CardTitle>
          <CardDescription className="text-slate-400">Regras usadas no cálculo da Memora.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3 text-sm text-slate-300">
          {[
            ["Acurácia", "Acertos ÷ questões"],
            ["Novo estudo", "Define estágio inicial e primeira revisão"],
            ["Revisão", "Pode avançar, manter ou recuar estágio"],
            ["Ease factor", "Ajusta estabilidade do intervalo"],
            ["Agenda", "Sempre baseada no next_review_at salvo"],
          ].map(([label, value]) => (
            <div key={label} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <span className="text-slate-400">{label}</span>
              <span className="font-medium text-slate-100">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
        <CardHeader>
          <CardTitle className="text-slate-50">Expansão futura</CardTitle>
          <CardDescription className="text-slate-400">Base pronta para escalar o produto.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          {[
            "IA para transformar resumos em flashcards.",
            "Decks compartilháveis por disciplina.",
            "Templates por vestibular ou banca.",
            "Assinatura e trial para multiusuário.",
            "Modo mobile-first completo para revisão no celular.",
          ].map((item) => (
            <div key={item} className="flex items-start gap-3 rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-slate-300">
              <Circle className="mt-1 h-3.5 w-3.5 fill-cyan-400 text-cyan-400" />
              <span>{item}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function NewStudyModal({
  open,
  onClose,
  onSave,
  loading,
  form,
  setForm,
  availableSubjects,
  availableFronts,
  errorMessage,
}: {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  loading: boolean;
  form: NewStudyFormState;
  setForm: React.Dispatch<React.SetStateAction<NewStudyFormState>>;
  availableSubjects: string[];
  availableFronts: string[];
  errorMessage: string;
}) {
  const questions = Number(form.questions || 0);
  const correct = Number(form.correct || 0);
  const accuracy = questions > 0 ? Math.round((correct / questions) * 100) : 0;
  const isValid = !validateStudyForm(form);

  return (
    <Modal open={open} onClose={onClose} title="Novo estudo">
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel>Matéria</FieldLabel>
            <select
              value={form.subject}
              onChange={(e) => {
                const nextSubject = e.target.value;
                setForm((prev) => ({
                  ...prev,
                  subject: nextSubject,
                  front: nextSubject === "__new__" ? "__new__" : getInitialFront(nextSubject),
                  customSubject: nextSubject === "__new__" ? prev.customSubject : prev.customSubject,
                }));
              }}
              className="h-11 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 outline-none"
            >
              {availableSubjects.map((subject) => (
                <option key={subject} value={subject}>{subject}</option>
              ))}
              <option value="__new__">+ Criar nova matéria</option>
            </select>
            {form.subject === "__new__" && (
              <Input className="mt-3 h-11 rounded-2xl border-slate-800 bg-slate-900 text-slate-100" placeholder="Nome da nova matéria" value={form.customSubject} onChange={(e) => setForm((prev) => ({ ...prev, customSubject: e.target.value }))} />
            )}
          </div>

          <div>
            <FieldLabel>Frente</FieldLabel>
            <select
              value={form.front}
              onChange={(e) => setForm((prev) => ({ ...prev, front: e.target.value }))}
              className="h-11 w-full rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 outline-none"
            >
              {availableFronts.map((front) => (
                <option key={front} value={front}>{front}</option>
              ))}
              <option value="__new__">+ Criar nova frente</option>
            </select>
            {form.front === "__new__" && (
              <Input className="mt-3 h-11 rounded-2xl border-slate-800 bg-slate-900 text-slate-100" placeholder="Nome da nova frente" value={form.customFront} onChange={(e) => setForm((prev) => ({ ...prev, customFront: e.target.value }))} />
            )}
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel>Tema estudado</FieldLabel>
            <Input className="h-11 rounded-2xl border-slate-800 bg-slate-900 text-slate-100" placeholder="Ex: Genética molecular" value={form.theme} onChange={(e) => setForm((prev) => ({ ...prev, theme: e.target.value }))} />
          </div>
          <div>
            <FieldLabel>Data da sessão / revisão</FieldLabel>
            <Input type="date" className="h-11 rounded-2xl border-slate-800 bg-slate-900 text-slate-100" value={form.sessionDate} onChange={(e) => setForm((prev) => ({ ...prev, sessionDate: e.target.value }))} />
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <FieldLabel>Subtítulo</FieldLabel>
            <Input className="h-11 rounded-2xl border-slate-800 bg-slate-900 text-slate-100" placeholder="Ex: Herança e cruzamentos" value={form.subtitle} onChange={(e) => setForm((prev) => ({ ...prev, subtitle: e.target.value }))} />
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <div className="flex items-start gap-3">
              <input id="isReview" type="checkbox" checked={form.isReview} onChange={(e) => setForm((prev) => ({ ...prev, isReview: e.target.checked }))} className="mt-1 h-4 w-4 rounded border-slate-600 bg-slate-900 text-cyan-500" />
              <div>
                <label htmlFor="isReview" className="text-sm font-medium text-slate-100">Esta sessão foi uma revisão?</label>
                <p className="mt-1 text-xs leading-6 text-slate-400">Marque quando o tema já existia na sua trilha. Isso faz o algoritmo considerar o estágio anterior.</p>
              </div>
            </div>
          </div>
        </div>

        <div>
          <FieldLabel>Descrição</FieldLabel>
          <Textarea className="min-h-[120px] rounded-2xl border-slate-800 bg-slate-900 text-slate-100" placeholder="Anote o que foi estudado, dúvidas, resumo rápido ou ponto de atenção." value={form.description} onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))} />
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <FieldLabel>Quantas questões você fez?</FieldLabel>
            <Input type="number" min={1} className="h-11 rounded-2xl border-slate-800 bg-slate-900 text-slate-100" value={form.questions} onChange={(e) => setForm((prev) => ({ ...prev, questions: e.target.value }))} />
            <p className="mt-2 text-xs text-slate-500">Use o total de questões da sessão para a acurácia ficar correta.</p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
            <FieldLabel>Quantas você acertou?</FieldLabel>
            <Input type="number" min={0} className="h-11 rounded-2xl border-slate-800 bg-slate-900 text-slate-100" value={form.correct} onChange={(e) => setForm((prev) => ({ ...prev, correct: e.target.value }))} />
            <p className="mt-2 text-xs text-slate-500">Os acertos não podem ser maiores que a quantidade de questões.</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <InfoBox title="Acurácia estimada" text={`${accuracy}% de aproveitamento nesta sessão.`} tone={accuracy >= 75 ? "success" : accuracy < 50 ? "error" : "default"} />
          <InfoBox title="Como a Memora vai usar isso" text="Mais acertos tendem a avançar estágio e ampliar intervalo; menos acertos encurtam a próxima revisão." />
        </div>

        {errorMessage && <InfoBox title="Não foi possível salvar" text={errorMessage} tone="error" />}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="outline" className="h-11 rounded-2xl" onClick={onClose}>Cancelar</Button>
          <Button className="h-11 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 text-white" onClick={onSave} disabled={!isValid || loading}>
            {loading ? "Salvando..." : "Salvar estudo"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default function MemoraPlatformPage() {
  const [authUser, setAuthUser] = useState<SessionUser | null>(null);
  const [active, setActive] = useState<ActiveTab>("dashboard");
  const [studyRecords, setStudyRecords] = useState<StudyRecord[]>([]);
  const [reviewQueue, setReviewQueue] = useState<ReviewCard[]>([]);
  const [loadingRecords, setLoadingRecords] = useState(false);
  const [isNewStudyOpen, setIsNewStudyOpen] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [form, setForm] = useState<NewStudyFormState>(EMPTY_FORM);

  const loadStudyRecords = useCallback(async (userId: string) => {
    setLoadingRecords(true);

    const { data, error } = await supabase
      .from("study_records")
      .select("id, user_id, subject, front, theme, subtitle, description, questions, correct, accuracy, study_date, scheduled_for, next_review_at, is_review, review_stage, review_status, interval_days, ease_factor, created_at")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Erro ao carregar estudos:", error);
      setStudyRecords([]);
      setLoadingRecords(false);
      return;
    }

    const mapped = ((data ?? []) as StudyRecordRow[]).map(mapRowToStudyRecord);
    setStudyRecords(mapped);
    setLoadingRecords(false);
  }, []);

  useEffect(() => {
    if (!authUser?.id) {
      setStudyRecords([]);
      return;
    }
    void loadStudyRecords(authUser.id);
  }, [authUser?.id, loadStudyRecords]);

  useEffect(() => {
    setReviewQueue(buildReviewQueue(studyRecords));
  }, [studyRecords]);

  const availableSubjects = useMemo(() => {
    const dynamic = Array.from(new Set(studyRecords.map((item) => item.subject).filter(Boolean))) as string[];
    return Array.from(new Set([...Object.keys(SUBJECT_FRONTS), ...dynamic])).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [studyRecords]);

  const availableFronts = useMemo(() => {
    const resolvedSubject = form.subject === "__new__" ? form.customSubject.trim() : form.subject;
    const base = resolvedSubject ? SUBJECT_FRONTS[resolvedSubject] ?? [] : [];
    const dynamic = studyRecords.filter((item) => item.subject === resolvedSubject).map((item) => item.front) as string[];
    const fronts = Array.from(new Set([...base, ...dynamic])).filter(Boolean).sort((a, b) => a.localeCompare(b, "pt-BR"));
    return fronts.length ? fronts : ["__new__"];
  }, [form.customSubject, form.subject, studyRecords]);

  useEffect(() => {
    if (form.subject !== "__new__" && availableFronts.length > 0 && form.front !== "__new__" && !availableFronts.includes(form.front)) {
      setForm((prev) => ({ ...prev, front: availableFronts[0] }));
    }
  }, [availableFronts, form.front, form.subject]);

  const latestTopicRecords = useMemo(() => getLatestTopicRecords(studyRecords), [studyRecords]);

  const agendaItems = useMemo<AgendaItem[]>(() => {
    return latestTopicRecords
      .map((record) => ({
        id: record.id,
        subject: record.subject,
        front: record.front,
        theme: record.theme,
        subtitle: record.subtitle,
        scheduledFor: record.scheduledFor,
        nextReviewAt: record.nextReviewAt,
        reviewStage: record.reviewStage,
        accuracy: record.accuracy,
        risk: getRiskFromAccuracy(record.accuracy),
        status: getStatusFromSchedule(record.nextReviewAt),
        intervalDays: record.intervalDays,
        isReview: record.isReview,
      }))
      .sort((a, b) => {
        const da = parseDate(a.nextReviewAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        const db = parseDate(b.nextReviewAt)?.getTime() ?? Number.MAX_SAFE_INTEGER;
        return da - db;
      });
  }, [latestTopicRecords]);

  const themes = useMemo(() => latestTopicRecords.map(mapStudyRecordToTheme), [latestTopicRecords]);

  function openNewStudy() {
    setSaveError("");
    setForm((prev) => {
      const nextSubject = prev.subject && prev.subject !== "__new__" ? prev.subject : "Biologia";
      return {
        ...EMPTY_FORM,
        subject: nextSubject,
        front: getInitialFront(nextSubject) || "B1",
        sessionDate: formatDateToInput(new Date()),
      };
    });
    setIsNewStudyOpen(true);
  }

  async function handleDeleteRecord(id: string) {
    if (!authUser?.id) return;

    const previous = studyRecords;
    setStudyRecords((prev) => prev.filter((item) => item.id !== id));

    const { error } = await supabase
      .from("study_records")
      .delete()
      .eq("id", id)
      .eq("user_id", authUser.id);

    if (error) {
      console.error("Erro ao excluir estudo:", error);
      setStudyRecords(previous);
    }
  }

  async function handleSaveStudy() {
    if (!authUser?.id) return;

    const validationError = validateStudyForm(form);
    if (validationError) {
      setSaveError(validationError);
      return;
    }

    setIsSaving(true);
    setSaveError("");

    const subject = getResolvedSubject(form);
    const front = getResolvedFront(form);
    const questions = Number(form.questions);
    const correct = Number(form.correct);
    const accuracy = Math.round((correct / questions) * 100);
    const previousTopicRecord = studyRecords.find((record) => getTopicKey(record) === getTopicKey({ subject, front, theme: form.theme.trim() }));

    const reviewPlan = calculateReviewPlan({
      accuracy,
      previousStage: previousTopicRecord?.reviewStage,
      previousEaseFactor: previousTopicRecord?.easeFactor,
      isReview: form.isReview,
      sessionDate: form.sessionDate,
    });

    const payload: StudyRecordInsert = {
      user_id: authUser.id,
      subject,
      front,
      theme: form.theme.trim(),
      subtitle: form.subtitle.trim() || null,
      description: form.description.trim() || null,
      questions,
      correct,
      accuracy,
      study_date: form.sessionDate,
      scheduled_for: form.sessionDate,
      next_review_at: reviewPlan.nextReviewAt,
      is_review: form.isReview,
      review_stage: reviewPlan.reviewStage,
      review_status: getStatusFromSchedule(reviewPlan.nextReviewAt),
      interval_days: reviewPlan.intervalDays,
      ease_factor: reviewPlan.easeFactor,
    };

    const { data, error } = await supabase
      .from("study_records")
      .insert(payload)
      .select("id, user_id, subject, front, theme, subtitle, description, questions, correct, accuracy, study_date, scheduled_for, next_review_at, is_review, review_stage, review_status, interval_days, ease_factor, created_at")
      .single();

    if (error || !data) {
      console.error("Erro ao salvar estudo:", error);
      setSaveError(error?.message || "Falha ao salvar o estudo. Confira as colunas da tabela e as policies do Supabase.");
      setIsSaving(false);
      return;
    }

    setStudyRecords((prev) => [mapRowToStudyRecord(data as StudyRecordRow), ...prev]);
    setIsSaving(false);
    setIsNewStudyOpen(false);
    setForm(EMPTY_FORM);
  }

  async function handleReviewAnswer(recordId: string, grade: ReviewGrade) {
    const currentRecord = studyRecords.find((item) => item.id === recordId);
    if (!currentRecord || !authUser?.id) return;

    const gradeAccuracyMap: Record<ReviewGrade, number> = {
      again: 35,
      hard: 58,
      good: 82,
      easy: 96,
    };

    const accuracy = gradeAccuracyMap[grade];
    const plan = calculateReviewPlan({
      accuracy,
      previousStage: currentRecord.reviewStage,
      previousEaseFactor: currentRecord.easeFactor,
      isReview: true,
      sessionDate: formatDateToInput(new Date()),
    });

    const questions = currentRecord.questions > 0 ? currentRecord.questions : 10;
    const correct = Math.min(questions, Math.max(0, Math.round((accuracy / 100) * questions)));

    const updates = {
      correct,
      accuracy,
      is_review: true,
      review_stage: plan.reviewStage,
      review_status: getStatusFromSchedule(plan.nextReviewAt),
      interval_days: plan.intervalDays,
      ease_factor: plan.easeFactor,
      next_review_at: plan.nextReviewAt,
      scheduled_for: plan.nextReviewAt,
      study_date: formatDateToInput(new Date()),
    };

    const { data, error } = await supabase
      .from("study_records")
      .update(updates)
      .eq("id", recordId)
      .eq("user_id", authUser.id)
      .select("id, user_id, subject, front, theme, subtitle, description, questions, correct, accuracy, study_date, scheduled_for, next_review_at, is_review, review_stage, review_status, interval_days, ease_factor, created_at")
      .single();

    if (error || !data) {
      console.error("Erro ao atualizar revisão:", error);
      return;
    }

    const updatedRecord = mapRowToStudyRecord(data as StudyRecordRow);
    setStudyRecords((prev) => prev.map((item) => (item.id === recordId ? updatedRecord : item)));
  }

  async function handleSignOut() {
    await supabase.auth.signOut();
    setAuthUser(null);
    setStudyRecords([]);
  }

  if (!authUser) {
    return <AuthGate onAuthenticated={setAuthUser} />;
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <NewStudyModal
        open={isNewStudyOpen}
        onClose={() => setIsNewStudyOpen(false)}
        onSave={handleSaveStudy}
        loading={isSaving}
        form={form}
        setForm={setForm}
        availableSubjects={availableSubjects}
        availableFronts={availableFronts}
        errorMessage={saveError}
      />

      <div className="flex min-h-screen">
        <Sidebar active={active} onChange={setActive} userEmail={authUser.email} onSignOut={handleSignOut} />

        <main className="w-full px-4 py-6 md:px-6 lg:px-8">
          <div className="mx-auto max-w-7xl">
            <div className="mb-6 lg:hidden">
              <Tabs value={active} onValueChange={(value) => setActive(value as ActiveTab)}>
                <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-2">
                  <TabsTrigger value="dashboard" className="rounded-xl" onClick={() => setActive("dashboard")}>Dashboard</TabsTrigger>
                  <TabsTrigger value="review" className="rounded-xl" onClick={() => setActive("review")}>Revisão</TabsTrigger>
                  <TabsTrigger value="library" className="rounded-xl" onClick={() => setActive("library")}>Biblioteca</TabsTrigger>
                  <TabsTrigger value="agenda" className="rounded-xl" onClick={() => setActive("agenda")}>Agenda</TabsTrigger>
                  <TabsTrigger value="metrics" className="rounded-xl" onClick={() => setActive("metrics")}>Métricas</TabsTrigger>
                  <TabsTrigger value="focus" className="rounded-xl" onClick={() => setActive("focus")}>Pomodoro</TabsTrigger>
                  <TabsTrigger value="settings" className="rounded-xl" onClick={() => setActive("settings")}>Método</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {loadingRecords ? (
              <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-8 text-center text-slate-400">Carregando base do usuário.</div>
            ) : (
              <>
                {active === "dashboard" && <DashboardPage reviewQueue={reviewQueue} agendaItems={agendaItems} themes={themes} onOpenNewStudy={openNewStudy} onDeleteRecord={handleDeleteRecord} />}
                {active === "review" && <ReviewPage reviewQueue={reviewQueue} onReviewAnswer={handleReviewAnswer} />}
                {active === "library" && <LibraryPage themes={themes} onDeleteRecord={handleDeleteRecord} />}
                {active === "agenda" && <AgendaPage agendaItems={agendaItems} onDeleteRecord={handleDeleteRecord} />}
                {active === "metrics" && <MetricsPage studyRecords={studyRecords} currentUserEmail={authUser.email} />}
                {active === "focus" && <FocusPage />}
                {active === "settings" && <SettingsPage />}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
