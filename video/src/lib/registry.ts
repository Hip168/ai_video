import type React from "react";
import { CUSTOM_SCENES } from "../episodes/registry";
import { CATALOG_TYPES, isCustomType, type CatalogType } from "../timeline2";
import type { SceneProps, SceneSpec } from "./types";
import { Placeholder } from "./scenes/placeholder";
import { placeholderSpec } from "./specs/placeholder";

// Mỗi loại một khối import, cách nhau một dòng trống. Đề mục 7, 8 thêm import vào khối của mình.

import { ColdOpen } from "./scenes/cold-open";
import { spec as coldOpenSpec } from "./specs/cold-open";

import { ChapterTitle } from "./scenes/chapter-title";
import { spec as chapterTitleSpec } from "./specs/chapter-title";

import { RecapOutro } from "./scenes/recap-outro";
import { spec as recapOutroSpec } from "./specs/recap-outro";

import { BigNumber } from "./scenes/big-number";
import { spec as bigNumberSpec } from "./specs/big-number";
import { Compare } from "./scenes/compare";
import { spec as compareSpec } from "./specs/compare";
import { MythFact } from "./scenes/myth-fact";
import { spec as mythFactSpec } from "./specs/myth-fact";
import { HistoryTimeline } from "./scenes/history-timeline";
import { spec as historyTimelineSpec } from "./specs/history-timeline";
import { TermCard } from "./scenes/term-card";
import { spec as termCardSpec } from "./specs/term-card";
import { Chart } from "./scenes/chart";
import { spec as chartSpec } from "./specs/chart";

export interface CatalogEntry {
  Component: React.FC<SceneProps>;
  spec: SceneSpec;
}

const placeholder = (type: CatalogType): CatalogEntry => ({
  Component: (p) => Placeholder({ ...p, type }),
  spec: placeholderSpec(type),
});

/** 18 loại, mỗi loại một dòng. Loại chưa làm là placeholder(...). */
export const CATALOG: Record<CatalogType, CatalogEntry> = {
  "cold-open": { Component: ColdOpen, spec: coldOpenSpec },
  "chapter-title": { Component: ChapterTitle, spec: chapterTitleSpec },
  "recap-outro": { Component: RecapOutro, spec: recapOutroSpec },
  "big-number": { Component: BigNumber, spec: bigNumberSpec },
  "compare": { Component: Compare, spec: compareSpec },
  "myth-fact": { Component: MythFact, spec: mythFactSpec },
  "history-timeline": { Component: HistoryTimeline, spec: historyTimelineSpec },
  "term-card": { Component: TermCard, spec: termCardSpec },
  "chart": { Component: Chart, spec: chartSpec },
  "flow": placeholder("flow"),
  "layers": placeholder("layers"),
  "scale-ladder": placeholder("scale-ladder"),
  "tree-graph": placeholder("tree-graph"),
  "code-walk": placeholder("code-walk"),
  "terminal": placeholder("terminal"),
  "bits": placeholder("bits"),
  "memory-array": placeholder("memory-array"),
  "algo-bars": placeholder("algo-bars"),
};

export function resolveScene(type: string): React.FC<SceneProps> {
  if (isCustomType(type)) {
    const name = type.slice("custom:".length);
    const c = CUSTOM_SCENES[name];
    if (!c) throw new Error(`cảnh riêng "${type}" chưa đăng ký trong video/src/episodes/registry.ts`);
    return c;
  }
  const entry = (CATALOG as Record<string, CatalogEntry | undefined>)[type];
  if (!entry) throw new Error(`loại cảnh "${type}" không có trong catalog (có: ${CATALOG_TYPES.join(", ")})`);
  return entry.Component;
}

export function specOf(type: string): SceneSpec | null {
  if (isCustomType(type)) return null;
  return (CATALOG as Record<string, CatalogEntry | undefined>)[type]?.spec ?? null;
}
