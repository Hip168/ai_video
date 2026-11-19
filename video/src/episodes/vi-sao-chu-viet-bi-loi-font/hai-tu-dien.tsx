import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Icon, Stage } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { at, Cell, modeOf, p, Person, useGeom } from "./common";

/** Họ phông có chữ Myanmar (hệ thống), rơi về phông mặc định nếu thiếu. */
const MYANMAR_FONT = '"Myanmar Sangam MN", "Myanmar MN", "Noto Sans Myanmar", sans-serif';

/** Một ô "ký tự lạ": hình chữ nhật có chấm, vẽ bằng SVG (không dùng phông). */
const Tofu: React.FC<{ x: number; y: number; w: number; h: number; color: string }> = ({ x, y, w, h, color }) => (
  <g>
    <rect x={x} y={y} width={w} height={h} rx={6} fill="none" stroke={color} strokeWidth={4} />
    <circle cx={x + w * 0.35} cy={y + h * 0.4} r={3.5} fill={color} />
    <circle cx={x + w * 0.65} cy={y + h * 0.4} r={3.5} fill={color} />
    <circle cx={x + w * 0.5} cy={y + h * 0.68} r={3.5} fill={color} />
  </g>
);

interface Col {
  cx: number;
  label: string;
  sub?: string;
  color: string;
  result: React.ReactNode;
  bad: boolean;
}

/**
 * Hai cuốn từ điển cho cùng một dãy số.
 * mode "mot-so" (1 beat): cùng một số, bảng này ra một chữ, bảng kia ra chữ khác (chữ ma sinh ra từ đó).
 * mode "hai" (3 beat): hai người mỗi người một cuốn từ điển, cùng nhìn một dãy số; người này ra chữ Việt, người kia ra ký tự lạ; chữ ma.
 * mode "myanmar" (2 beat): Myanmar có hai cách mã hóa, Zawgyi không tương thích Unicode.
 */
export const HaiTuDien: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, sq } = useGeom();
  const mode = modeOf(scene.props, "hai");
  const t1 = at(scene, 1);
  const t2 = at(scene, 2);
  const cw = sq ? 112 : 140;
  const ch = sq ? 86 : 100;
  const gap = sq ? 14 : 18;
  const rowY = sq ? 56 : 70;
  const colX = sq ? [210, 630] : [W * 0.27, W * 0.73];
  const cardW = sq ? 380 : 560;
  const cardY = sq ? 235 : 270;
  const cardH = sq ? 225 : 225;
  const resY = sq ? 485 : 520;
  const resH = sq ? 150 : 130;
  const resS = sq ? 84 : 110;

  let cells: string[];
  let cols: Col[];
  let tag: string | null = null;
  let title: string | null = null;
  let resP = p(f, t1, 14);
  let people = false;
  let note: string | null = null;
  let noteAt = t2;
  if (mode === "mot-so") {
    cells = ["E1"];
    resP = p(f, 40, 14);
    cols = [
      { cx: colX[0], label: "Bảng này", color: theme.accent, result: "á", bad: false },
      { cx: colX[1], label: "Bảng kia", color: theme.accent2, result: "ß", bad: false },
    ];
    tag = "cùng một con số, hai chữ khác nhau";
    title = "Một con số";
    note = "Chữ ma sinh ra từ đó";
    noteAt = 120;
  } else if (mode === "myanmar") {
    cells = ["··", "··", "··", "··"];
    cols = [
      {
        cx: colX[0],
        label: "Zawgyi",
        sub: "không tương thích Unicode",
        color: theme.warn,
        result: null,
        bad: true,
      },
      { cx: colX[1], label: "Unicode", sub: "bảng chung", color: theme.accent, result: null, bad: false },
    ];
    title = "Myanmar: hai cách mã hóa";
    people = false;
  } else {
    cells = ["E1", "BA", "BF"];
    people = true;
    title = "Cùng một dãy số";
    cols = [
      { cx: colX[0], label: "Bảng UTF-8", color: theme.accent, result: "ế", bad: false },
      { cx: colX[1], label: "Bảng Windows-1252", color: theme.warn, result: "áº¿", bad: true },
    ];
    tag = "chữ ma";
  }

  const rowW = cells.length * cw + (cells.length - 1) * gap;
  const rowX = (W - rowW) / 2;
  const rowP = p(f, 2, 12);
  const bookP = [p(f, 10, 12), p(f, 18, 12)];
  const isMy = mode === "myanmar";
  const resPv = isMy ? p(f, t1, 14) : resP;
  const pulse = 0.65 + 0.35 * Math.sin(f * 0.2);
  const tagP = mode === "hai" ? p(f, t2, 12) : mode === "mot-so" ? p(f, 70, 12) : 0;
  const noteP = note ? p(f, noteAt, 12) : 0;
  return (
    <Stage>
      {title && (
        <TextBlock text={title} x={W / 2} y={rowY - 14} width={W - 80} fontSize={sq ? 40 : 46} fill={theme.muted} weight={400} />
      )}
      <g opacity={rowP}>
        {cells.map((c, i) => (
          <Cell key={i} x={rowX + i * (cw + gap)} y={rowY + (sq ? 24 : 28)} w={cw} h={ch} text={c} s={sq ? 48 : 58} fill={theme.panel} stroke={theme.fg} color={theme.fg} />
        ))}
      </g>
      {cols.map((c, ci) => {
        const bp = bookP[ci];
        const left = c.cx - cardW / 2;
        const showRes = ci === 0 ? resPv : resPv;
        return (
          <g key={ci}>
            {/* đường từ dãy số xuống từng cuốn */}
            <path
              d={`M${W / 2} ${rowY + (sq ? 24 : 28) + ch + 4} V${cardY - (sq ? 40 : 50)} H${c.cx} V${cardY - 4}`}
              fill="none"
              stroke={theme.muted}
              strokeWidth={4}
              strokeDasharray="10 8"
              opacity={bp}
            />
            <g opacity={bp}>
              <rect x={left} y={cardY} width={cardW} height={cardH} rx={22} fill={theme.panel} stroke={c.color} strokeWidth={5} />
              {people ? (
                <Person x={c.cx} y={cardY + cardH - (sq ? 62 : 78)} s={sq ? 120 : 150} fill={theme.fg} line={theme.bg} book={c.color} bookLine={theme.bg} />
              ) : (
                <Icon name="book" x={c.cx} y={cardY + (sq ? 62 : 68)} size={sq ? 90 : 100} color={c.color} />
              )}
              <TextBlock text={c.label} x={c.cx} y={cardY + cardH - (c.sub ? (sq ? 100 : 70) : sq ? 18 : 22)} width={cardW - 30} fontSize={sq ? 36 : 50} fill={c.color} />
              {c.sub && <TextBlock text={c.sub} x={c.cx} y={cardY + cardH - (sq ? 56 : 22)} width={cardW - 30} fontSize={sq ? 30 : 38} maxLines={sq ? 2 : 1} fill={theme.muted} weight={400} />}
            </g>
            {/* kết quả tra */}
            {(!isMy ? showRes : resPv) > 0 && (
              <g opacity={showRes} transform={`translate(0 ${(1 - showRes) * -16})`}>
                <line x1={c.cx} y1={cardY + cardH + 4} x2={c.cx} y2={resY - 6} stroke={theme.muted} strokeWidth={4} />
                <rect
                  x={left}
                  y={resY}
                  width={cardW}
                  height={resH}
                  rx={22}
                  fill={c.bad && !isMy ? theme.warn : theme.panel}
                  stroke={c.bad ? theme.warn : theme.ok}
                  strokeWidth={5}
                  opacity={c.bad && tagP > 0 ? pulse : 1}
                />
                {isMy ? (
                  c.bad ? (
                    <g>
                      {[0, 1, 2, 3].map((k) => (
                        <Tofu key={k} x={c.cx - (sq ? 140 : 190) + k * (sq ? 74 : 100)} y={resY + resH / 2 - (sq ? 30 : 40)} w={sq ? 56 : 76} h={sq ? 60 : 80} color={theme.warn} />
                      ))}
                    </g>
                  ) : (
                    <text x={c.cx} y={resY + resH / 2 + resS * 0.3} fontSize={resS * 0.7} fontWeight={700} textAnchor="middle" fill={theme.fg} style={{ fontFamily: MYANMAR_FONT }}>
                      မြန်မာ
                    </text>
                  )
                ) : (
                  <text x={c.cx} y={resY + resH / 2 + resS * 0.34} fontSize={resS} fontWeight={700} textAnchor="middle" fill={c.bad && mode === "hai" ? theme.bg : theme.fg}>
                    {c.result}
                  </text>
                )}
              </g>
            )}
          </g>
        );
      })}
      {/* Chú thích */}
      {mode === "hai" && resP > 0.4 && (
        <g opacity={resP}>
          <TextBlock text="chữ Việt đàng hoàng" x={colX[0]} y={resY + resH + (sq ? 50 : 58)} width={cardW} fontSize={sq ? 36 : 44} maxLines={2} fill={theme.ok} />
          {tagP < 0.5 ? (
            <TextBlock text="ký tự chẳng ai đọc nổi" x={colX[1]} y={resY + resH + (sq ? 50 : 58)} width={cardW} fontSize={sq ? 36 : 44} maxLines={2} fill={theme.warn} />
          ) : (
            <TextBlock text="chữ ma" x={colX[1]} y={resY + resH + (sq ? 56 : 66)} width={cardW} fontSize={sq ? 54 : 64} fill={theme.warn} opacity={tagP} />
          )}
        </g>
      )}
      {mode === "mot-so" && (
        <g>
          <g opacity={p(f, 40, 12)}>
            <TextBlock text={tag ?? ""} x={W / 2} y={sq ? resY + resH + 56 : resY + resH + 60} width={W - 80} fontSize={sq ? 40 : 52} fill={theme.fg} />
          </g>
          <g opacity={noteP}>
            <TextBlock text={note ?? ""} x={W / 2} y={sq ? 770 : 790} width={W - 80} fontSize={sq ? 48 : 60} fill={theme.warn} />
          </g>
        </g>
      )}
      {isMy && (
        <g opacity={p(f, t1, 12)}>
          <TextBlock text="Phần lớn thiết bị ở đó dùng Zawgyi" x={W / 2} y={sq ? 700 : 770} width={W - 80} fontSize={sq ? 40 : 52} maxLines={2} fill={theme.accent2} />
        </g>
      )}
    </Stage>
  );
};
