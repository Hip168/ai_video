import React from "react";
import { useCurrentFrame } from "remotion";
import { useTheme } from "../../lib/hooks";
import { Stage } from "../../lib/theme";
import { TextBlock } from "../../lib/b-kit";
import type { SceneProps } from "../../lib/types";
import { Arrow, at, Caption, Chip, modeOf, p, useGeom } from "./common";

/** Họ phông có chữ Hán (hệ thống), rơi về phông mặc định nếu thiếu. */
const CJK_FONT = '"PingFang SC", "Hiragino Sans GB", "Noto Sans CJK SC", "Microsoft YaHei", sans-serif';

const SENTENCE = "Bush hid the facts";
/** Hai byte một ký tự: đọc dãy byte của câu trên như UTF-16 (đã tính). */
const CHINESE = "畂桳栠摩琠敨映捡獴";

/**
 * Notepad đoán bảng mã.
 * mode "bush" (2 beat): gõ câu "Bush hid the facts", lưu rồi mở lại; chữ biến thành chuỗi ký tự Trung Quốc vô nghĩa.
 * mode "doan" (2 beat): không ai gõ sai, không virus, không ổ đĩa hỏng, tệp không ghi nó dùng bảng mã nào; Notepad phải đoán, hai khả năng.
 */
export const Notepad: React.FC<SceneProps> = ({ scene }) => {
  const theme = useTheme();
  const f = useCurrentFrame();
  const { W, sq } = useGeom();
  const mode = modeOf(scene.props, "bush");
  const t1 = at(scene, 1);

  if (mode === "bush") {
    const ww = sq ? 780 : 1300;
    const wx = (W - ww) / 2;
    const wy = sq ? 40 : 40;
    const wh = sq ? 330 : 470;
    const typed = Math.min(SENTENCE.length, Math.max(0, Math.floor((f - 14) / 2.2)));
    const swap = p(f, t1, 10);
    const fs = sq ? 64 : 112;
    const chipY = wy + wh + (sq ? 40 : 40);
    const step = f < 90 ? 0 : f < t1 ? 1 : 2;
    const blink = Math.floor(f / 15) % 2 === 0;
    return (
      <Stage>
        <rect x={wx} y={wy} width={ww} height={wh} rx={22} fill={theme.panel} stroke={theme.accent} strokeWidth={5} />
        <rect x={wx} y={wy} width={ww} height={68} rx={22} fill={theme.bg} opacity={0.55} />
        {[theme.warn, theme.accent2, theme.ok].map((c, i) => (
          <circle key={i} cx={wx + 40 + i * 40} cy={wy + 34} r={12} fill={c} />
        ))}
        <TextBlock text="Notepad" x={wx + ww / 2} y={wy + 46} width={ww - 300} fontSize={sq ? 36 : 40} fill={theme.fg} />
        {swap < 0.5 ? (
          <text x={wx + ww / 2} y={wy + wh / 2 + fs * 0.45} fontSize={fs} fontWeight={700} textAnchor="middle" fill={theme.fg} opacity={1 - swap * 2}>
            {SENTENCE.slice(0, typed)}
            {blink && typed < SENTENCE.length ? "|" : ""}
          </text>
        ) : (
          <text x={wx + ww / 2} y={wy + wh / 2 + fs * 0.45} fontSize={fs} fontWeight={700} textAnchor="middle" fill={theme.warn} opacity={(swap - 0.5) * 2} style={{ fontFamily: CJK_FONT }}>
            {CHINESE}
          </text>
        )}
        <g>
          <Chip x={wx + (sq ? 0 : 120)} y={chipY} w={sq ? 230 : 330} h={sq ? 66 : 76} text="Gõ câu" s={sq ? 34 : 42} fill={step === 0 ? theme.accent : theme.panel} stroke={theme.accent} color={step === 0 ? theme.bg : theme.fg} />
          <Arrow x1={wx + (sq ? 244 : 470)} y1={chipY + (sq ? 33 : 38)} x2={wx + (sq ? 290 : 540)} y2={chipY + (sq ? 33 : 38)} color={theme.muted} w={5} head={18} />
          <Chip x={wx + (sq ? 300 : 560)} y={chipY} w={sq ? 230 : 330} h={sq ? 66 : 76} text="Lưu" s={sq ? 34 : 42} fill={step === 1 ? theme.accent : theme.panel} stroke={theme.accent} color={step === 1 ? theme.bg : theme.fg} />
          <Arrow x1={wx + (sq ? 544 : 910)} y1={chipY + (sq ? 33 : 38)} x2={wx + (sq ? 590 : 980)} y2={chipY + (sq ? 33 : 38)} color={theme.muted} w={5} head={18} />
          <Chip x={wx + (sq ? 600 : 1000)} y={chipY} w={sq ? 180 : 180 + 0} h={sq ? 66 : 76} text="Mở lại" s={sq ? 34 : 42} fill={step === 2 ? theme.warn : theme.panel} stroke={theme.warn} color={step === 2 ? theme.bg : theme.fg} />
        </g>
        <Caption text={swap < 0.5 ? "Gõ đúng câu, lưu rồi mở lại" : "Chữ biến thành chuỗi ký tự Trung Quốc vô nghĩa"} fill={swap < 0.5 ? theme.fg : theme.warn} y={sq ? 740 : 760} />
      </Stage>
    );
  }

  // mode "doan"
  const a = p(f, 0, 12) * (1 - p(f, t1, 10));
  const b = p(f, t1 + 6, 14);
  const reasons = ["Gõ sai", "Virus", "Ổ đĩa hỏng"];
  const rw = sq ? 560 : 430;
  const rh = sq ? 74 : 100;
  const rx = (i: number) => (sq ? (W - rw) / 2 : (W - (3 * rw + 2 * 30)) / 2 + i * (rw + 30));
  const ry = (i: number) => (sq ? 50 + i * 100 : 110);
  const hiP = p(f, 110, 14) * (1 - p(f, t1, 10));
  const cardW = sq ? 780 : 620;
  const cjkS = Math.min(sq ? 60 : 78, Math.floor((cardW - 70) / 9));
  return (
    <Stage>
      {a > 0 && (
        <g opacity={a}>
          {reasons.map((r, i) => {
            const ip = p(f, 6 + i * 16, 12);
            const x = rx(i);
            const y = ry(i);
            return (
              <g key={i} opacity={ip}>
                <rect x={x} y={y} width={rw} height={rh} rx={rh / 2.4} fill={theme.panel} stroke={theme.muted} strokeWidth={4} />
                <TextBlock text={r} x={x + rw / 2} y={y + rh / 2 + (sq ? 12 : 17)} width={rw - 140} fontSize={sq ? 38 : 50} fill={theme.muted} />
                <line x1={x + 30} y1={y + rh / 2} x2={x + rw - 30} y2={y + rh / 2} stroke={theme.warn} strokeWidth={6} strokeLinecap="round" opacity={p(f, 28 + i * 16, 8)} />
              </g>
            );
          })}
          <g opacity={hiP}>
            <rect x={sq ? 30 : 220} y={sq ? 400 : 330} width={sq ? W - 60 : W - 440} height={sq ? 260 : 220} rx={26} fill={theme.panel} stroke={theme.accent2} strokeWidth={6} />
            <TextBlock text="Tệp văn bản không tự ghi nó dùng bảng mã nào" x={W / 2} y={sq ? 488 : 430} width={sq ? W - 120 : W - 560} fontSize={sq ? 48 : 64} maxLines={3} fill={theme.accent2} />
          </g>
        </g>
      )}
      {b > 0 && (
        <g opacity={b}>
          {/* Tệp bên trái, hai cách đoán bên phải */}
          <g>
            <rect x={sq ? W / 2 - 150 : 150} y={sq ? 20 : 250} width={300} height={sq ? 120 : 220} rx={22} fill={theme.panel} stroke={theme.fg} strokeWidth={5} />
            <TextBlock text="tệp văn bản" x={sq ? W / 2 : 300} y={sq ? 96 : 365} width={260} fontSize={sq ? 38 : 46} fill={theme.fg} />
          </g>
          {[0, 1].map((i) => {
            const cx = sq ? W / 2 : W - 150 - cardW / 2 - 40;
            const y = sq ? 200 + i * 245 : 80 + i * 350;
            const ch = sq ? 215 : 300;
            const ok = i === 0;
            const rp = p(f, t1 + 14 + i * 24, 12);
            return (
              <g key={i} opacity={rp}>
                {sq ? <Arrow x1={W / 2} y1={i === 0 ? 150 : 20 + 120 + 4} x2={W / 2} y2={y - 4} color={theme.muted} w={4} head={16} opacity={i === 0 ? 1 : 0} /> : <Arrow x1={470} y1={360} x2={cx - cardW / 2 - 14} y2={y + ch / 2} color={theme.muted} w={5} head={20} />}
                <rect x={cx - cardW / 2} y={y} width={cardW} height={ch} rx={22} fill={theme.panel} stroke={ok ? theme.ok : theme.warn} strokeWidth={5} />
                <TextBlock text={ok ? "Đoán: bảng mã cũ" : "Đoán: Unicode"} x={cx} y={y + (sq ? 56 : 70)} width={cardW - 40} fontSize={sq ? 38 : 48} fill={ok ? theme.ok : theme.warn} />
                {ok ? (
                  <TextBlock text={SENTENCE} x={cx} y={y + ch - (sq ? 58 : 84)} width={cardW - 40} fontSize={sq ? 60 : 78} fill={theme.fg} />
                ) : (
                  <text x={cx} y={y + ch - (sq ? 58 : 84)} fontSize={cjkS} fontWeight={700} textAnchor="middle" fill={theme.fg} style={{ fontFamily: CJK_FONT }}>
                    {CHINESE}
                  </text>
                )}
              </g>
            );
          })}
          <g opacity={p(f, t1 + 44, 12)}>
            <TextBlock text="Notepad phải đoán" x={sq ? W / 2 : 300} y={sq ? 790 : 560} width={sq ? W - 80 : 400} fontSize={sq ? 46 : 52} maxLines={2} fill={theme.accent2} />
          </g>
        </g>
      )}
    </Stage>
  );
};
