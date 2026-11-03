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

import { Flow } from "./scenes/flow";
import { spec as flowSpec } from "./specs/flow";

import { Layers } from "./scenes/layers";
import { spec as layersSpec } from "./specs/layers";

import { ScaleLadder } from "./scenes/scale-ladder";
import { spec as scaleLadderSpec } from "./specs/scale-ladder";

import { TreeGraph } from "./scenes/tree-graph";
import { spec as treeGraphSpec } from "./specs/tree-graph";

import { CodeWalk } from "./scenes/code-walk";
import { spec as codeWalkSpec } from "./specs/code-walk";

import { Terminal } from "./scenes/terminal";
import { spec as terminalSpec } from "./specs/terminal";

import { Bits } from "./scenes/bits";
import { spec as bitsSpec } from "./specs/bits";

import { MemoryArray } from "./scenes/memory-array";
import { spec as memoryArraySpec } from "./specs/memory-array";

import { AlgoBars } from "./scenes/algo-bars";
import { spec as algoBarsSpec } from "./specs/algo-bars";

export interface CatalogEntry {
  Component: React.FC<SceneProps>;
  spec: SceneSpec;
}

const placeholder = (type: CatalogType): CatalogEntry => ({
  Component: (p) => Placeholder({ ...p, type }),
  spec: placeholderSpec(type),
});

/** 18 loại, mỗi loại một dòng. 6 loại còn placeholder(...) là của đề mục 7; 9 loại nhóm B đã làm ở đề mục 8. */
export const CATALOG: Record<CatalogType, CatalogEntry> = {
  "cold-open": { Component: ColdOpen, spec: coldOpenSpec },
  "chapter-title": { Component: ChapterTitle, spec: chapterTitleSpec },
  "recap-outro": { Component: RecapOutro, spec: recapOutroSpec },
  "big-number": placeholder("big-number"),
  "compare": placeholder("compare"),
  "myth-fact": placeholder("myth-fact"),
  "history-timeline": placeholder("history-timeline"),
  "term-card": placeholder("term-card"),
  "chart": placeholder("chart"),
  "flow": { Component: Flow, spec: flowSpec },
  "layers": { Component: Layers, spec: layersSpec },
  "scale-ladder": { Component: ScaleLadder, spec: scaleLadderSpec },
  "tree-graph": { Component: TreeGraph, spec: treeGraphSpec },
  "code-walk": { Component: CodeWalk, spec: codeWalkSpec },
  "terminal": { Component: Terminal, spec: terminalSpec },
  "bits": { Component: Bits, spec: bitsSpec },
  "memory-array": { Component: MemoryArray, spec: memoryArraySpec },
  "algo-bars": { Component: AlgoBars, spec: algoBarsSpec },
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
