"use client";

import React, { useEffect, useMemo, useState } from "react";
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
  Filter,
  Flame,
  Layers3,
  Pause,
  Play,
  Plus,
  RefreshCcw,
  RotateCcw,
  Search,
  Sparkles,
  Target,
  Timer,
  Trophy,
  X,
} from "lucide-react";

type CardProps = React.HTMLAttributes<HTMLDivElement>;
type ReviewState = "aprendizagem" | "em revisão" | "crítico" | "consolidado";
type ReviewGrade = "again" | "hard" | "good" | "easy";
type ReviewStage = "R0" | "R1" | "R2" | "R3" | "R4" | "R5";
type ReviewStatus = "pending" | "completed" | "overdue";

type ReviewCard = {
  id: number;
  discipline: string;
  theme: string;
  front: string;
  back: string;
  state: ReviewState;
  easeFactor: number;
  interval: number;
  repetitions: number;
  lapses: number;
};

type TodayTask = {
  id: number;
  discipline: string;
  theme: string;
  type: string;
  cards: number;
  progress: number;
  nextReview: string;
  done: boolean;
};

type PlannedTopic = {
  id: number;
  discipline: string;
  theme: string;
  source: string;
  scheduled: string;
};

type ThemeItem = {
  id: number;
  discipline: string;
  name: string;
  domain: number;
  nextReview: string;
  risk: string;
  deck: string;
  cards: number;
};

type StudyRecord = {
  id: number;
  discipline: string;
  theme: string;
  questions: number;
  correct: number;
  accuracy: number;
  createdAt: string;
  nextReviewAt: string | null;
  reviewStage: ReviewStage;
  reviewStatus: ReviewStatus;
  intervalDays: number;
  easeFactor: number;
};

const uiTheme = {
  panel: "bg-slate-900/70",
  border: "border-slate-800",
};

const disciplines = [
  { id: 1, name: "Biologia", color: "bg-emerald-500", cards: 186, mastery: 71 },
  { id: 2, name: "Química", color: "bg-sky-500", cards: 142, mastery: 64 },
  { id: 3, name: "Física", color: "bg-violet-500", cards: 119, mastery: 58 },
  { id: 4, name: "Matemática", color: "bg-amber-500", cards: 94, mastery: 67 },
];

const initialThemes: ThemeItem[] = [
  {
    id: 1,
    discipline: "Biologia",
    name: "Genética",
    domain: 74,
    nextReview: "Hoje",
    risk: "Médio",
    deck: "Genética médica e molecular",
    cards: 42,
  },
  {
    id: 2,
    discipline: "Química",
    name: "Funções Orgânicas",
    domain: 61,
    nextReview: "Amanhã",
    risk: "Alto",
    deck: "Orgânica I",
    cards: 37,
  },
  {
    id: 3,
    discipline: "Física",
    name: "Eletrodinâmica",
    domain: 52,
    nextReview: "Atrasado",
    risk: "Crítico",
    deck: "Física elétrica",
    cards: 29,
  },
  {
    id: 4,
    discipline: "Biologia",
    name: "Citologia",
    domain: 81,
    nextReview: "Em 3 dias",
    risk: "Baixo",
    deck: "Base celular",
    cards: 24,
  },
];

const weeklyPlan = [
  { day: "Seg", review: 96, newCards: 22, status: "equilibrado" },
  { day: "Ter", review: 112, newCards: 18, status: "alto" },
  { day: "Qua", review: 84, newCards: 20, status: "equilibrado" },
  { day: "Qui", review: 136, newCards: 10, status: "crítico" },
  { day: "Sex", review: 78, newCards: 14, status: "leve" },
  { day: "Sáb", review: 65, newCards: 8, status: "leve" },
  { day: "Dom", review: 52, newCards: 0, status: "recuperação" },
];

const initialReviewCards: ReviewCard[] = [
  {
    id: 101,
    discipline: "Biologia",
    theme: "Genética",
    front: "Qual é a diferença entre genótipo e fenótipo?",
    back: "Genótipo é a constituição genética do indivíduo. Fenótipo é a manifestação observável dessa constituição, influenciada também pelo ambiente.",
    state: "em revisão",
    easeFactor: 2.5,
    interval: 4,
    repetitions: 3,
    lapses: 1,
  },
  {
    id: 102,
    discipline: "Química",
    theme: "Funções Orgânicas",
    front: "O que caracteriza um álcool na química orgânica?",
    back: "Presença de grupo hidroxila (-OH) ligado a carbono saturado.",
    state: "aprendizagem",
    easeFactor: 2.2,
    interval: 1,
    repetitions: 1,
    lapses: 0,
  },
  {
    id: 103,
    discipline: "Física",
    theme: "Eletrodinâmica",
    front: "Enuncie a 1ª lei de Ohm.",
    back: "A ddp entre dois pontos de um resistor é proporcional à corrente elétrica que o atravessa: U = R.i.",
    state: "crítico",
    easeFactor: 1.9,
    interval: 1,
    repetitions: 0,
    lapses: 3,
  },
  {
    id: 104,
    discipline: "Biologia",
    theme: "Citologia",
    front: "Qual a principal função das mitocôndrias?",
    back: "Produção de ATP por meio da respiração celular.",
    state: "consolidado",
    easeFactor: 2.8,
    interval: 12,
    repetitions: 5,
    lapses: 0,
  },
];

const heatMap = [72, 68, 79, 81, 66, 74, 83, 70, 64, 77, 85, 89];

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
  const variants: Record<string, string> = {
    outline: "border border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800",
    ghost: "bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white",
  };

  return (
    <button
      type={type}
      className={classNames(
        "inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-medium transition",
        variant ? variants[variant] : "bg-cyan-600 text-white hover:bg-cyan-500",
        className
      )}
      {...props}
    />
  );
}

function Badge({ className, ...props }: React.HTMLAttributes<HTMLSpanElement>) {
  return (
    <span
      className={classNames("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", className)}
      {...props}
    />
  );
}

function Progress({ value = 0, className }: { value?: number; className?: string }) {
  return (
    <div className={classNames("h-2 w-full overflow-hidden rounded-full bg-slate-800", className)}>
      <div className="h-full rounded-full bg-cyan-500" style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

function Input({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={classNames(
        "w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-2 text-sm text-slate-100 outline-none placeholder:text-slate-500",
        className
      )}
      {...props}
    />
  );
}

function Tabs({
  children,
}: {
  value: string;
  onValueChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return <div>{children}</div>;
}

function TabsList({ className, ...props }: CardProps) {
  return <div className={classNames(className)} {...props} />;
}

function TabsTrigger({
  value,
  className,
  onClick,
  ...props
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string }) {
  return (
    <button
      type="button"
      className={classNames("px-3 py-2 text-sm text-slate-200", className)}
      onClick={onClick}
      {...props}
    />
  );
}

function Modal({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="w-full max-w-xl rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-slate-950/40">
        <div className="flex items-center justify-between border-b border-slate-800 p-5">
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

function getLoadColor(status: string) {
  if (status === "crítico") return "bg-red-500";
  if (status === "alto") return "bg-orange-500";
  if (status === "leve") return "bg-emerald-500";
  if (status === "recuperação") return "bg-cyan-500";
  return "bg-sky-500";
}

function getRiskFromAccuracy(accuracy: number) {
  if (accuracy >= 80) return "Baixo";
  if (accuracy >= 65) return "Médio";
  if (accuracy >= 45) return "Alto";
  return "Crítico";
}

function getIntervalDaysFromAccuracy(accuracy: number) {
  if (accuracy >= 80) return 7;
  if (accuracy >= 65) return 4;
  if (accuracy >= 45) return 2;
  return 1;
}

function formatNextReviewLabel(intervalDays: number) {
  if (intervalDays <= 0) return "Hoje";
  if (intervalDays === 1) return "Amanhã";
  return `Em ${intervalDays} dias`;
}

function mapStudyRecordToTheme(record: StudyRecord): ThemeItem {
  return {
    id: record.id,
    discipline: record.discipline,
    name: record.theme,
    domain: record.accuracy,
    nextReview: formatNextReviewLabel(record.intervalDays),
    risk: getRiskFromAccuracy(record.accuracy),
    deck: `${record.discipline} · Revisões recentes`,
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
    state: grade === "again" ? "crítico" : repetitions >= 5 ? "consolidado" : "em revisão",
  };
}

const scheduleCardTests = () => {
  const base = initialReviewCards[0];
  const again = scheduleCard(base, "again");
  const hard = scheduleCard(base, "hard");
  const easy = scheduleCard(base, "easy");
  const good = scheduleCard(base, "good");

  console.assert(again.interval === 1, "again should reset interval to 1");
  console.assert(again.lapses === base.lapses + 1, "again should increment lapses");
  console.assert(hard.easeFactor >= 1.3, "hard should keep easeFactor above minimum");
  console.assert(easy.interval >= 1, "easy should keep interval positive");
  console.assert(good.repetitions === base.repetitions + 1, "good should increment repetitions");
};

scheduleCardTests();

function StatCard({
  icon: Icon,
  title,
  value,
  helper,
  accent,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  value: string;
  helper: string;
  accent: string;
}) {
  return (
    <Card className={classNames(uiTheme.panel, uiTheme.border, "border backdrop-blur-xl shadow-2xl shadow-slate-950/30")}>
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

function Sidebar({ active, onChange }: { active: string; onChange: (value: string) => void }) {
  const items = [
    ["dashboard", "Dashboard", BarChart3],
    ["review", "Central de Revisão", BrainCircuit],
    ["library", "Biblioteca", BookOpen],
    ["agenda", "Agenda Inteligente", CalendarDays],
    ["metrics", "Estatísticas", Target],
    ["focus", "Pomodoro", Timer],
    ["settings", "Método", Layers3],
  ] as const;

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
            <p className="text-xs uppercase tracking-[0.18em] text-slate-500">Meta principal</p>
            <p className="mt-2 text-sm font-medium text-slate-100">Vestibular de Medicina</p>
            <div className="mt-4 flex items-center gap-2 text-xs text-slate-400">
              <Target className="h-4 w-4" /> Prova em 142 dias
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
                active === key ? "bg-slate-800 text-white shadow-lg shadow-slate-950/20" : "text-slate-400 hover:bg-slate-900 hover:text-slate-100"
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
              <p className="text-xs text-slate-400">12 dias seguidos de revisão</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}

function DashboardPage({
  reviewQueue,
  themes,
  onOpenNewStudy,
}: {
  reviewQueue: ReviewCard[];
  themes: ThemeItem[];
  onOpenNewStudy: () => void;
}) {
  const [todayTasks, setTodayTasks] = useState<TodayTask[]>([
    { id: 1, discipline: "Física", theme: "Eletrodinâmica", type: "Revisão prioritária", cards: 18, progress: 52, nextReview: "Hoje, 14:00", done: false },
    { id: 2, discipline: "Química", theme: "Funções Orgânicas", type: "Revisão programada", cards: 14, progress: 61, nextReview: "Hoje, 16:30", done: false },
    { id: 3, discipline: "Biologia", theme: "Genética", type: "Consolidação", cards: 12, progress: 74, nextReview: "Hoje, 19:00", done: true },
  ]);
  const [manualTopic, setManualTopic] = useState("");
  const [manualDiscipline, setManualDiscipline] = useState("Biologia");
  const [plannedTopics, setPlannedTopics] = useState<PlannedTopic[]>([
    { id: 11, discipline: "Biologia", theme: "Citologia", source: "Planejado por Harian", scheduled: "Amanhã" },
    { id: 12, discipline: "Matemática", theme: "Probabilidade", source: "Planejado por Harian", scheduled: "Em 2 dias" },
  ]);

  const overdue = reviewQueue.filter((c) => c.state === "crítico").length;
  const mature = reviewQueue.filter((c) => c.state === "consolidado").length;
  const completedToday = todayTasks.filter((task) => task.done).length;
  const pendingToday = todayTasks.filter((task) => !task.done).length;
  const criticalThemes = themes.filter((item) => item.risk === "Crítico" || item.risk === "Alto").length;

  function toggleTask(id: number) {
    setTodayTasks((prev) =>
      prev.map((task) =>
        task.id === id
          ? {
              ...task,
              done: !task.done,
              nextReview: !task.done ? "Próxima revisão em 4 dias" : `Hoje, ${task.id === 1 ? "14:00" : task.id === 2 ? "16:30" : "19:00"}`,
            }
          : task
      )
    );
  }

  function addPlannedTopic() {
    if (!manualTopic.trim()) return;
    setPlannedTopics((prev) => [
      {
        id: Date.now(),
        discipline: manualDiscipline,
        theme: manualTopic.trim(),
        source: "Planejado por Harian",
        scheduled: "Aguardando agendamento",
      },
      ...prev,
    ]);
    setManualTopic("");
  }

  return (
    <div className="space-y-6">
      <section className="overflow-hidden rounded-[32px] border border-slate-800 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 p-6 shadow-2xl shadow-slate-950/30 md:p-8">
        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr] xl:items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1 text-xs uppercase tracking-[0.18em] text-cyan-300">
              <Sparkles className="h-3.5 w-3.5" /> Experiência personalizada
            </div>
            <h2 className="mt-4 text-3xl font-semibold tracking-tight text-white md:text-4xl">Olá, Harian. O que vamos estudar hoje?</h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-slate-300 md:text-base">
              Hoje a Memora separou o que precisa ser feito agora, o que já foi concluído e o que já pode entrar na próxima rodada de revisão.
            </p>
            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs text-slate-500">Pendentes hoje</p>
                <p className="mt-2 text-2xl font-semibold text-white">{pendingToday}</p>
                <p className="mt-1 text-xs text-slate-400">Blocos que ainda precisam acontecer</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs text-slate-500">Concluídos hoje</p>
                <p className="mt-2 text-2xl font-semibold text-white">{completedToday}</p>
                <p className="mt-1 text-xs text-slate-400">Já reagendados para frente</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <p className="text-xs text-slate-500">Temas em atenção</p>
                <p className="mt-2 text-2xl font-semibold text-white">{criticalThemes}</p>
                <p className="mt-1 text-xs text-slate-400">Prioridade alta para revisão</p>
              </div>
            </div>
            <div className="mt-6">
              <Button className="h-11 rounded-2xl px-5" onClick={onOpenNewStudy}>
                <Plus className="h-4 w-4" /> Registrar estudo de hoje
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3 xl:grid-cols-1">
            <div className="rounded-3xl border border-red-500/20 bg-red-500/10 p-5">
              <div className="flex items-center gap-3 text-red-300">
                <AlertTriangle className="h-5 w-5" />
                <p className="text-sm font-medium">Comece por aqui</p>
              </div>
              <h3 className="mt-3 text-2xl font-semibold text-white">Física</h3>
              <p className="mt-1 text-sm text-slate-300">Eletrodinâmica é a matéria mais urgente do dia.</p>
            </div>
            <div className="rounded-3xl border border-cyan-500/20 bg-cyan-500/10 p-5">
              <div className="flex items-center gap-3 text-cyan-300">
                <Target className="h-5 w-5" />
                <p className="text-sm font-medium">Meta de hoje</p>
              </div>
              <h3 className="mt-3 text-2xl font-semibold text-white">44 cards</h3>
              <p className="mt-1 text-sm text-slate-300">Carga ideal para manter a curva sob controle.</p>
            </div>
            <div className="rounded-3xl border border-emerald-500/20 bg-emerald-500/10 p-5">
              <div className="flex items-center gap-3 text-emerald-300">
                <CheckCircle2 className="h-5 w-5" />
                <p className="text-sm font-medium">Progresso da semana</p>
              </div>
              <h3 className="mt-3 text-2xl font-semibold text-white">73%</h3>
              <p className="mt-1 text-sm text-slate-300">Você está avançando acima da média recente.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Brain} title="Revisões do dia" value="128" helper="84 cards pendentes + 44 novos liberados" accent="bg-cyan-500/20" />
        <StatCard icon={AlertTriangle} title="Cards críticos" value={String(overdue)} helper="Exigem retomada imediata" accent="bg-red-500/20" />
        <StatCard icon={Trophy} title="Cards maduros" value={String(mature)} helper="Memória consolidada de longo prazo" accent="bg-emerald-500/20" />
        <StatCard icon={Target} title="Retenção estimada" value="76%" helper="Meta-alvo configurada: 85%" accent="bg-violet-500/20" />
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
        <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
          <CardHeader>
            <CardTitle className="text-slate-50">O que você precisa fazer hoje</CardTitle>
            <CardDescription className="text-slate-400">Blocos diários com espaço para marcar o que já foi feito.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {todayTasks.map((task) => (
              <div key={task.id} className="rounded-3xl border border-slate-800 bg-slate-900/80 p-5">
                <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex items-start gap-4">
                    <button
                      onClick={() => toggleTask(task.id)}
                      className={classNames(
                        "mt-1 flex h-6 w-6 items-center justify-center rounded-full border transition",
                        task.done ? "border-emerald-400 bg-emerald-400 text-slate-950" : "border-slate-600 bg-slate-950 text-slate-600"
                      )}
                    >
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <div>
                      <div className="flex items-center gap-2">
                        <Badge className="border border-slate-700 bg-slate-800 text-slate-300">{task.discipline}</Badge>
                        <Badge className="border border-cyan-500/20 bg-cyan-500/10 text-cyan-200">{task.type}</Badge>
                      </div>
                      <h3 className={classNames("mt-3 text-xl font-semibold", task.done ? "text-slate-400 line-through" : "text-white")}>{task.theme}</h3>
                      <p className="mt-1 text-sm text-slate-300">{task.cards} cards · {task.nextReview}</p>
                    </div>
                  </div>
                  <div className="w-full max-w-xs">
                    <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                      <span>Progressão do tema</span>
                      <span>{task.progress}%</span>
                    </div>
                    <Progress value={task.progress} className="h-2 bg-slate-800" />
                    <p className="mt-3 text-xs text-slate-500">
                      {task.done ? "Concluído. Próxima revisão já reagendada." : "Ao concluir, a Memora agenda automaticamente a próxima revisão."}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
          <CardHeader>
            <CardTitle className="text-slate-50">Planejar próximos temas</CardTitle>
            <CardDescription className="text-slate-400">Espaço para registrar o que deve entrar nas próximas revisões.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3">
              <select
                value={manualDiscipline}
                onChange={(e) => setManualDiscipline(e.target.value)}
                className="h-11 rounded-2xl border border-slate-800 bg-slate-900 px-4 text-sm text-slate-100 outline-none"
              >
                {disciplines.map((item) => (
                  <option key={item.id} value={item.name}>
                    {item.name}
                  </option>
                ))}
              </select>
              <Input
                value={manualTopic}
                onChange={(e) => setManualTopic(e.target.value)}
                placeholder="Ex: Sistema endócrino"
                className="h-11 rounded-2xl border-slate-800 bg-slate-900 text-slate-100"
              />
              <Button className="h-11 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white" onClick={addPlannedTopic}>
                <Plus className="mr-2 h-4 w-4" /> Adicionar para próximas revisões
              </Button>
            </div>

            <div className="rounded-3xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-sm font-medium text-slate-100">Próximas que já estão programadas</p>
              <div className="mt-4 space-y-3">
                {plannedTopics.map((item) => (
                  <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-100">{item.theme}</p>
                        <p className="text-xs text-slate-500">{item.discipline} · {item.source}</p>
                      </div>
                      <Badge className="border border-slate-700 bg-slate-800 text-slate-300">{item.scheduled}</Badge>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-6 xl:grid-cols-[1.35fr_0.95fr]">
        <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
          <CardHeader>
            <CardTitle className="text-slate-50">Pressão semanal de revisão</CardTitle>
            <CardDescription className="text-slate-400">A agenda foi balanceada para evitar sobrecarga e preservar retenção.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-7 gap-3">
              {weeklyPlan.map((item) => (
                <div key={item.day} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-3">
                  <p className="text-xs text-slate-500">{item.day}</p>
                  <p className="mt-3 text-2xl font-semibold text-white">{item.review}</p>
                  <p className="text-xs text-slate-400">revisões</p>
                  <div className="mt-3 h-2 rounded-full bg-slate-800">
                    <div className={classNames("h-2 rounded-full", getLoadColor(item.status))} style={{ width: `${Math.min(100, item.review / 1.4)}%` }} />
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">{item.newCards} novos cards</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
          <CardHeader>
            <CardTitle className="text-slate-50">Radar de risco por tema</CardTitle>
            <CardDescription className="text-slate-400">Onde a Memora deve agir primeiro.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {themes.map((themeItem) => (
              <div key={themeItem.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs text-slate-500">{themeItem.discipline}</p>
                    <h4 className="font-medium text-slate-100">{themeItem.name}</h4>
                    <p className="mt-1 text-xs text-slate-400">Próxima revisão: {themeItem.nextReview}</p>
                  </div>
                  <Badge className={classNames("border", getRiskBadge(themeItem.risk))}>{themeItem.risk}</Badge>
                </div>
                <div className="mt-4">
                  <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                    <span>Domínio</span>
                    <span>{themeItem.domain}%</span>
                  </div>
                  <Progress value={themeItem.domain} className="h-2 bg-slate-800" />
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function ReviewPage({
  reviewQueue,
  setReviewQueue,
}: {
  reviewQueue: ReviewCard[];
  setReviewQueue: React.Dispatch<React.SetStateAction<ReviewCard[]>>;
}) {
  const [index, setIndex] = useState(0);
  const [showAnswer, setShowAnswer] = useState(false);
  const current = reviewQueue[index] || reviewQueue[0];

  const stats = useMemo(
    () => ({
      total: reviewQueue.length,
      critical: reviewQueue.filter((c) => c.state === "crítico").length,
      mature: reviewQueue.filter((c) => c.state === "consolidado").length,
    }),
    [reviewQueue]
  );

  function answerCard(grade: ReviewGrade) {
    const updated = [...reviewQueue];
    updated[index] = scheduleCard(current, grade);
    setReviewQueue(updated);
    setShowAnswer(false);
    setIndex((prev) => (prev + 1) % updated.length);
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
      <Card className={classNames(uiTheme.panel, uiTheme.border, "border overflow-hidden")}>
        <CardHeader className="border-b border-slate-800 bg-slate-900/80">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle className="text-slate-50">Central de Revisão</CardTitle>
              <CardDescription className="text-slate-400">Sessão baseada em flashcards com repetição espaçada adaptativa.</CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge className="border border-slate-700 bg-slate-800 text-slate-200">{current.discipline}</Badge>
              <Badge className="border border-slate-700 bg-slate-800 text-slate-200">{current.theme}</Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <div className="mb-4 flex items-center justify-between text-sm text-slate-400">
            <span>Card {index + 1} de {reviewQueue.length}</span>
            <span>
              Estado: <span className="text-slate-200">{current.state}</span>
            </span>
          </div>

          <motion.div
            key={`${current.id}-${showAnswer ? "answer" : "question"}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="min-h-[340px] rounded-[28px] border border-slate-800 bg-gradient-to-br from-slate-900 to-slate-950 p-8"
          >
            <div className="mb-4 flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-300">
              <Brain className="h-4 w-4" /> Recall ativo
            </div>
            <div className="flex h-full flex-col justify-between gap-8">
              <div>
                <p className="text-sm text-slate-500">Frente</p>
                <h3 className="mt-4 text-2xl font-semibold leading-tight text-slate-50 md:text-3xl">{current.front}</h3>
              </div>

              {showAnswer ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-5">
                  <p className="text-sm text-slate-500">Resposta</p>
                  <p className="mt-3 text-base leading-7 text-slate-200">{current.back}</p>
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-800 bg-slate-900/40 p-5 text-slate-500">
                  Tente lembrar antes de virar o card. A Memora quer medir recordação real, não reconhecimento passivo.
                </div>
              )}
            </div>
          </motion.div>

          {!showAnswer ? (
            <Button className="mt-5 h-12 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 text-white hover:opacity-95" onClick={() => setShowAnswer(true)}>
              Mostrar resposta
            </Button>
          ) : (
            <div className="mt-5 grid gap-3 md:grid-cols-4">
              <Button variant="outline" className="h-12 rounded-2xl border-red-500/30 bg-red-500/10 text-red-300 hover:bg-red-500/15" onClick={() => answerCard("again")}>
                Errei
              </Button>
              <Button variant="outline" className="h-12 rounded-2xl border-orange-500/30 bg-orange-500/10 text-orange-300 hover:bg-orange-500/15" onClick={() => answerCard("hard")}>
                Difícil
              </Button>
              <Button variant="outline" className="h-12 rounded-2xl border-sky-500/30 bg-sky-500/10 text-sky-300 hover:bg-sky-500/15" onClick={() => answerCard("good")}>
                Bom
              </Button>
              <Button variant="outline" className="h-12 rounded-2xl border-emerald-500/30 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15" onClick={() => answerCard("easy")}>
                Fácil
              </Button>
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
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs text-slate-500">Cards da sessão</p>
              <p className="mt-2 text-3xl font-semibold text-white">{stats.total}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs text-slate-500">Críticos</p>
              <p className="mt-2 text-3xl font-semibold text-red-300">{stats.critical}</p>
            </div>
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <p className="text-xs text-slate-500">Consolidados</p>
              <p className="mt-2 text-3xl font-semibold text-emerald-300">{stats.mature}</p>
            </div>
          </CardContent>
        </Card>

        <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
          <CardHeader>
            <CardTitle className="text-slate-50">Motor de repetição</CardTitle>
            <CardDescription className="text-slate-400">Leitura em tempo real do card atual.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm text-slate-300">
            <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <span>Ease factor</span>
              <span className="font-medium text-white">{current.easeFactor}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <span>Intervalo atual</span>
              <span className="font-medium text-white">{current.interval} dias</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <span>Repetições</span>
              <span className="font-medium text-white">{current.repetitions}</span>
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <span>Lapses</span>
              <span className="font-medium text-white">{current.lapses}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function LibraryPage({ themes, onOpenDeck }: { themes: ThemeItem[]; onOpenDeck: (deck: string) => void }) {
  const [query, setQuery] = useState("");
  const filtered = themes.filter((t) => `${t.discipline} ${t.name} ${t.deck}`.toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-semibold text-white">Biblioteca de Conteúdos</h2>
          <p className="mt-1 text-sm text-slate-400">Temas, decks, domínio e próximos pontos de intervenção.</p>
        </div>
        <div className="flex flex-col gap-3 md:flex-row">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
            <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar tema ou deck" className="h-11 w-72 rounded-2xl border-slate-800 bg-slate-900 pl-10 text-slate-100" />
          </div>
        </div>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {disciplines.map((d) => (
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
                <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                  <span>Domínio médio</span>
                  <span>{d.mastery}%</span>
                </div>
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
          {filtered.map((item) => (
            <div key={item.id} className="flex flex-col gap-4 rounded-3xl border border-slate-800 bg-slate-900/70 p-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Badge className="border border-slate-700 bg-slate-800 text-slate-300">{item.discipline}</Badge>
                  <Badge className={classNames("border", getRiskBadge(item.risk))}>{item.risk}</Badge>
                </div>
                <h3 className="mt-3 text-lg font-medium text-slate-100">{item.name}</h3>
                <p className="mt-1 text-sm text-slate-400">Deck: {item.deck} · {item.cards} cards</p>
              </div>
              <div className="w-full max-w-md">
                <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                  <span>Domínio</span>
                  <span>{item.domain}%</span>
                </div>
                <Progress value={item.domain} className="h-2 bg-slate-800" />
                <p className="mt-3 text-xs text-slate-500">Próxima revisão: {item.nextReview}</p>
              </div>
              <Button variant="ghost" className="justify-between rounded-2xl text-slate-300 hover:bg-slate-800 hover:text-white" onClick={() => onOpenDeck(item.deck)}>
                Abrir deck <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function AgendaPage() {
  const schedulerItems = [
    ["Scheduler Engine", "Calcula a próxima revisão com base em desempenho e histórico."],
    ["Retention Engine", "Estima retenção do card e do tema."],
    ["Load Balancer", "Redistribui carga para evitar congestionamento cognitivo."],
    ["Exam Pressure", "Comprime intervalos quando a prova se aproxima."],
  ] as const;

  return (
    <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
      <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
        <CardHeader>
          <CardTitle className="text-slate-50">Agenda Inteligente</CardTitle>
          <CardDescription className="text-slate-400">Distribuição da carga revisional com leitura de urgência e equilíbrio.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {weeklyPlan.map((day) => (
            <div key={day.day} className="rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.16em] text-slate-500">{day.day}</p>
                  <h3 className="mt-2 text-xl font-semibold text-white">{day.review} revisões</h3>
                  <p className="mt-1 text-sm text-slate-400">{day.newCards} novos cards liberados</p>
                </div>
                <Badge
                  className={classNames(
                    "border text-white",
                    day.status === "crítico"
                      ? "border-red-500/30 bg-red-500/15"
                      : day.status === "alto"
                        ? "border-orange-500/30 bg-orange-500/15"
                        : day.status === "leve"
                          ? "border-emerald-500/30 bg-emerald-500/15"
                          : "border-cyan-500/30 bg-cyan-500/15"
                  )}
                >
                  {day.status}
                </Badge>
              </div>
              <div className="mt-4 h-2 rounded-full bg-slate-800">
                <div className={classNames("h-2 rounded-full", getLoadColor(day.status))} style={{ width: `${Math.min(100, day.review / 1.4)}%` }} />
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <div className="space-y-6">
        <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
          <CardHeader>
            <CardTitle className="text-slate-50">Alertas operacionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {[
              "36 cards de Eletrodinâmica entraram em faixa crítica.",
              "A quinta-feira está acima da carga ideal de 120 cards.",
              "Genética manteve boa retenção e pode receber novos cards.",
            ].map((msg) => (
              <div key={msg} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-sm text-slate-300">
                {msg}
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
          <CardHeader>
            <CardTitle className="text-slate-50">Lógica do agendador</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-slate-300">
            {schedulerItems.map(([title, desc]) => (
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

function MetricsPage({ studyRecords }: { studyRecords: StudyRecord[] }) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold text-white">Estatísticas e Performance</h2>
        <p className="mt-1 text-sm text-slate-400">O que a Memora enxerga sobre retenção, consistência e pontos de risco.</p>
      </div>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CheckCircle2} title="Taxa de retenção" value="76%" helper="Subiu 4 pontos nas últimas 2 semanas" accent="bg-emerald-500/20" />
        <StatCard icon={Clock3} title="Tempo líquido" value="42h" helper="Últimos 30 dias de foco acumulado" accent="bg-sky-500/20" />
        <StatCard icon={RefreshCcw} title="Consistência" value="89%" helper="Sessões concluídas vs programadas" accent="bg-violet-500/20" />
        <StatCard icon={AlertTriangle} title="Risco de esquecimento" value="11 temas" helper="Precisam de recuperação nos próximos 7 dias" accent="bg-red-500/20" />
      </section>

      {studyRecords.length > 0 && (
        <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
          <CardHeader>
            <CardTitle className="text-slate-50">Últimos estudos registrados</CardTitle>
            <CardDescription className="text-slate-400">Entradas criadas a partir do botão “Novo estudo”.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {studyRecords.map((record) => (
              <div key={record.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-slate-100">{record.theme}</p>
                    <p className="text-xs text-slate-500">
                      {record.discipline} · {record.questions} questões · {record.correct} acertos · próxima revisão: {formatNextReviewLabel(record.intervalDays)}
                    </p>
                  </div>
                  <Badge className="border border-cyan-500/20 bg-cyan-500/10 text-cyan-200">{record.accuracy}%</Badge>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <section className="grid gap-6 xl:grid-cols-[1fr_1fr]">
        <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
          <CardHeader>
            <CardTitle className="text-slate-50">Desempenho por disciplina</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {disciplines.map((d) => (
              <div key={d.id}>
                <div className="mb-2 flex items-center justify-between text-sm text-slate-300">
                  <span>{d.name}</span>
                  <span>{d.mastery}%</span>
                </div>
                <Progress value={d.mastery} className="h-2 bg-slate-800" />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
          <CardHeader>
            <CardTitle className="text-slate-50">Top fragilidades</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {initialThemes
              .slice()
              .sort((a, b) => a.domain - b.domain)
              .map((item) => (
                <div key={item.id} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs text-slate-500">{item.discipline}</p>
                      <p className="font-medium text-slate-100">{item.name}</p>
                    </div>
                    <Badge className={classNames("border", getRiskBadge(item.risk))}>{item.risk}</Badge>
                  </div>
                  <p className="mt-2 text-sm text-slate-400">Domínio atual: {item.domain}%</p>
                </div>
              ))}
          </CardContent>
        </Card>
      </section>

      <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
        <CardHeader>
          <CardTitle className="text-slate-50">Heatmap de retenção</CardTitle>
          <CardDescription className="text-slate-400">Sinal da saúde cognitiva ao longo das últimas semanas.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-6 gap-3 md:grid-cols-12">
            {heatMap.map((value, index) => (
              <div key={index} className="space-y-2">
                <div
                  className="h-24 rounded-2xl border border-slate-800"
                  style={{
                    background: `linear-gradient(180deg, rgba(14,165,233,${0.15 + value / 140}) 0%, rgba(37,99,235,${0.12 + value / 150}) 100%)`,
                  }}
                />
                <p className="text-center text-xs text-slate-500">S{index + 1}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
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
              <h2 className="mt-3 text-6xl font-semibold tracking-tight text-white">
                {minutes}:{seconds}
              </h2>
              <p className="mt-2 text-sm text-slate-400">{isRunning ? "Sessão em andamento" : "Sessão pronta para iniciar"}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Button className="h-12 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-6 text-white" onClick={() => setIsRunning((prev) => !prev)}>
              {isRunning ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {isRunning ? "Pausar" : "Iniciar"}
            </Button>
            <Button
              variant="outline"
              className="h-12 rounded-2xl border-slate-800 bg-slate-900 text-slate-200"
              onClick={() => {
                setIsRunning(false);
                setSecondsLeft(25 * 60);
              }}
            >
              <RotateCcw className="h-4 w-4" /> Reiniciar
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
        <CardHeader>
          <CardTitle className="text-slate-50">Histórico e relação com performance</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {[
            ["Blocos concluídos", "18 esta semana"],
            ["Tempo médio", "27 min por sessão"],
            ["Melhor janela", "08:00 - 11:00"],
            ["Relação com retenção", "+9% em dias com foco concluído"],
          ].map(([title, value]) => (
            <div key={title} className="flex items-center justify-between rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
              <span className="text-slate-400">{title}</span>
              <span className="font-medium text-slate-100">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function SettingsPage() {
  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
      <Card className={classNames(uiTheme.panel, uiTheme.border, "border")}>
        <CardHeader>
          <CardTitle className="text-slate-50">Configurações do método</CardTitle>
          <CardDescription className="text-slate-400">Ajustes estruturais para o motor se adaptar ao estilo da estudante.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            ["Máximo de cards por dia", "120"],
            ["Meta de retenção", "85%"],
            ["Dias leves", "Sábado e domingo"],
            ["Escala de resposta", "Errei / Difícil / Bom / Fácil"],
            ["Modo prova", "Ativar 45 dias antes"],
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
          <CardDescription className="text-slate-400">Blocos já previstos para transformar a Memora em SaaS escalável.</CardDescription>
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

export default function MemoraPlatformPrototype() {
  const [active, setActive] = useState("dashboard");
  const [reviewQueue, setReviewQueue] = useState<ReviewCard[]>(initialReviewCards);
  const [themes, setThemes] = useState<ThemeItem[]>(initialThemes);
  const [studyRecords, setStudyRecords] = useState<StudyRecord[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [filterDiscipline, setFilterDiscipline] = useState("Todas");
  const [selectedDeck, setSelectedDeck] = useState<string | null>(null);
  const [isNewStudyOpen, setIsNewStudyOpen] = useState(false);
  const [studyDiscipline, setStudyDiscipline] = useState("Biologia");
  const [studyTheme, setStudyTheme] = useState("");
  const [studyQuestions, setStudyQuestions] = useState(30);
  const [studyCorrect, setStudyCorrect] = useState(24);

  useEffect(() => {
    async function loadStudyRecords() {
      const { data, error } = await supabase.from("study_records").select("*").order("created_at", { ascending: false });

      if (error) {
        console.error("Erro ao carregar estudos:", error);
        return;
      }

      if (!data) return;

      const mappedRecords: StudyRecord[] = data.map((item) => ({
        id: item.id,
        discipline: item.discipline,
        theme: item.theme,
        questions: item.questions,
        correct: item.correct,
        accuracy: item.accuracy,
        createdAt: item.created_at,
        nextReviewAt: item.next_review_at,
        reviewStage: item.review_stage,
        reviewStatus: item.review_status,
        intervalDays: item.interval_days,
        easeFactor: Number(item.ease_factor),
      }));

      setStudyRecords(mappedRecords);

      const dynamicThemes = mappedRecords.map(mapStudyRecordToTheme);

      setThemes(() => {
        const merged = [...dynamicThemes, ...initialThemes];
        const seen = new Set<string>();

        return merged.filter((item) => {
          const key = `${item.discipline}-${item.name}`;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        });
      });
    }

    loadStudyRecords();
  }, []);

  const filteredThemes = useMemo(() => {
    if (filterDiscipline === "Todas") return themes;
    return themes.filter((item) => item.discipline === filterDiscipline);
  }, [themes, filterDiscipline]);

  async function handleCreateStudy() {
    if (!studyTheme.trim()) return;

    const accuracy = Math.round((studyCorrect / Math.max(1, studyQuestions)) * 100);
    const intervalDays = getIntervalDaysFromAccuracy(accuracy);

    const now = new Date();
    const nextReviewDate = new Date(now);
    nextReviewDate.setDate(now.getDate() + intervalDays);

    const payload = {
      discipline: studyDiscipline,
      theme: studyTheme.trim(),
      questions: studyQuestions,
      correct: studyCorrect,
      accuracy,
      next_review_at: nextReviewDate.toISOString(),
      review_stage: "R0",
      review_status: "pending",
      interval_days: intervalDays,
      ease_factor: 2.5,
    };

    const { data, error } = await supabase.from("study_records").insert(payload).select().single();

    if (error) {
      console.error(error);
      alert("Erro ao salvar estudo no banco");
      return;
    }

    const newRecord: StudyRecord = {
      id: data.id,
      discipline: data.discipline,
      theme: data.theme,
      questions: data.questions,
      correct: data.correct,
      accuracy: data.accuracy,
      createdAt: data.created_at,
      nextReviewAt: data.next_review_at,
      reviewStage: data.review_stage,
      reviewStatus: data.review_status,
      intervalDays: data.interval_days,
      easeFactor: Number(data.ease_factor),
    };

    setStudyRecords((prev) => [newRecord, ...prev]);
    setThemes((prev) => [mapStudyRecordToTheme(newRecord), ...prev]);

    setStudyTheme("");
    setStudyQuestions(30);
    setStudyCorrect(24);
    setIsNewStudyOpen(false);
    setActive("dashboard");
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      <Modal open={isFiltersOpen} title="Filtros da biblioteca" onClose={() => setIsFiltersOpen(false)}>
        <div className="space-y-4">
          <select
            value={filterDiscipline}
            onChange={(e) => setFilterDiscipline(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-slate-100 outline-none"
          >
            <option value="Todas">Todas as disciplinas</option>
            {disciplines.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
          <Button className="w-full" onClick={() => setIsFiltersOpen(false)}>
            Aplicar filtros
          </Button>
        </div>
      </Modal>

      <Modal open={isNewStudyOpen} title="Registrar novo estudo" onClose={() => setIsNewStudyOpen(false)}>
        <div className="space-y-4">
          <select
            value={studyDiscipline}
            onChange={(e) => setStudyDiscipline(e.target.value)}
            className="h-11 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 text-sm text-slate-100 outline-none"
          >
            {disciplines.map((item) => (
              <option key={item.id} value={item.name}>
                {item.name}
              </option>
            ))}
          </select>
          <Input value={studyTheme} onChange={(e) => setStudyTheme(e.target.value)} placeholder="Tema estudado" />
          <div className="grid gap-3 md:grid-cols-2">
            <Input type="number" value={studyQuestions} onChange={(e) => setStudyQuestions(Number(e.target.value))} placeholder="Questões feitas" />
            <Input type="number" value={studyCorrect} onChange={(e) => setStudyCorrect(Number(e.target.value))} placeholder="Questões certas" />
          </div>
          <Button className="w-full" onClick={handleCreateStudy}>
            Salvar estudo e programar revisão
          </Button>
        </div>
      </Modal>

      <div className="flex min-h-screen">
        <Sidebar active={active} onChange={setActive} />

        <main className="flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-800 bg-slate-950/85 px-4 py-4 backdrop-blur-xl md:px-8">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-cyan-300">
                  <Sparkles className="h-4 w-4" /> Memora platform
                </div>
                <h1 className="mt-2 text-2xl font-semibold tracking-tight text-white md:text-3xl">Revisão inteligente para memória de longo prazo</h1>
                <p className="mt-1 text-sm text-slate-400">Dashboard, biblioteca, agenda, foco e motor de repetição espaçada em um único sistema.</p>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <Button variant="outline" className="h-11 rounded-2xl border-slate-800 bg-slate-900 text-slate-200" onClick={() => setIsFiltersOpen(true)}>
                  <Filter className="mr-2 h-4 w-4" /> Filtros
                </Button>
                <Button className="h-11 rounded-2xl bg-gradient-to-r from-cyan-500 to-blue-600 px-5 text-white hover:opacity-95" onClick={() => setIsNewStudyOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Novo estudo
                </Button>
              </div>
            </div>
          </header>

          <div className="px-4 py-6 md:px-8">
            {selectedDeck && (
              <div className="mb-6 rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-cyan-100">
                Deck aberto: <strong>{selectedDeck}</strong>
              </div>
            )}

            <div className="mb-6 lg:hidden">
              <Tabs value={active} onValueChange={setActive}>
                <TabsList className="flex h-auto w-full flex-wrap justify-start gap-2 rounded-2xl border border-slate-800 bg-slate-900 p-2">
                  <TabsTrigger value="dashboard" className="rounded-xl" onClick={() => setActive("dashboard")}>
                    Dashboard
                  </TabsTrigger>
                  <TabsTrigger value="review" className="rounded-xl" onClick={() => setActive("review")}>
                    Revisão
                  </TabsTrigger>
                  <TabsTrigger value="library" className="rounded-xl" onClick={() => setActive("library")}>
                    Biblioteca
                  </TabsTrigger>
                  <TabsTrigger value="agenda" className="rounded-xl" onClick={() => setActive("agenda")}>
                    Agenda
                  </TabsTrigger>
                  <TabsTrigger value="metrics" className="rounded-xl" onClick={() => setActive("metrics")}>
                    Métricas
                  </TabsTrigger>
                  <TabsTrigger value="focus" className="rounded-xl" onClick={() => setActive("focus")}>
                    Pomodoro
                  </TabsTrigger>
                  <TabsTrigger value="settings" className="rounded-xl" onClick={() => setActive("settings")}>
                    Método
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {active === "dashboard" && <DashboardPage reviewQueue={reviewQueue} themes={filteredThemes} onOpenNewStudy={() => setIsNewStudyOpen(true)} />}
            {active === "review" && <ReviewPage reviewQueue={reviewQueue} setReviewQueue={setReviewQueue} />}
            {active === "library" && <LibraryPage themes={filteredThemes} onOpenDeck={setSelectedDeck} />}
            {active === "agenda" && <AgendaPage />}
            {active === "metrics" && <MetricsPage studyRecords={studyRecords} />}
            {active === "focus" && <FocusPage />}
            {active === "settings" && <SettingsPage />}
          </div>
        </main>
      </div>
    </div>
  );
}