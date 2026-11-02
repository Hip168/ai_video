# Đề mục 11: Đội sản xuất

Nhánh `11-doi-san-xuat`. Phụ thuộc đề mục 5. Thiết kế: `.team/doi-san-xuat.md`, D20, D22.

## Kiến trúc đã chọn
- Agent theo dự án ở `.claude/agents/`: `researcher`, `scriptwriter`, `fact-checker`, `script-editor`, `scene-director`, `voice-producer`, `editor`, `qc`, `packager`, `publisher`. Không ghi vào `~/.claude`, để kênh cá nhân tách khỏi đội dùng chung.
- Công cụ theo mục 1 của `doi-san-xuat.md`. Vai không được ghi file thì không có Write, Edit; `fact-checker`, `script-editor` không có Bash. `qc` có Bash để gọi script đo kỹ thuật và ffmpeg trích khung, luật trong prompt cấm ghi file; `gate3` kiểm hash nên `qc` sửa lén sản phẩm sẽ bị chặn.
- Skill dự án `.claude/skills/video/SKILL.md`: lệnh `/video [đề tài]`, sếp tổng đi theo `episodes/PLAYBOOK.md`.
- Script ở `audio/src/aivideo/gates.py`: `extract-claims`, `verdict`, `gate1`, `gate2`, `gate3`, `ledger`.
- `claims.json`: `[{"id","claim","question","sourceUrl","credibility","status"}]`, `credibility` thuộc `primary`, `secondary`, `anecdotal`; `status` thuộc `DAT`, `SAI`, `CHUA_KIEM`.

## Task
- [11-1] Mười agent, skill `/video`, `PLAYBOOK.md`.
- [11-2] Sổ fact, regex bắt số và tên trên `text` gốc, `gate1`, `gate2`. Nguồn `primary` hoặc `secondary` mới được `DAT`; claim về số cần ít nhất một nguồn `primary` hoặc hai nguồn độc lập.
- [11-3] Phán quyết tính bằng script, kiểm `quote` có trong file gốc, `gate3`.
- [11-4] `ledger.json`, chuỗi hash, trần vòng lặp, mẫu handoff.
- [11-5] Bộ cài lỗi và `.team/qualification.md`.

## Xong khi
- `gate2` chặn khi: thêm một số vào lời không có claim; claim `CHUA_KIEM`; số viết dạng "3,14" và "1.000".
- `verdict`: có CRITICAL ra `CHAN`, MAJOR ra `SUA`, không có ra `DAT`; thiếu JSON hoặc sai dạng ra `CHUA_DUYET`; `quote` không có trong file bị loại.
- Sửa một ký tự kịch bản sau Cổng 2 thì `gate3` chặn.
- Vòng thứ 4 của một cặp làm/kiểm bị `ledger` từ chối, ra `CAN_NGUOI_DUNG`.
- Bộ cài lỗi: `fact-checker` bắt ít nhất 90% lỗi cài và báo sai không quá 1 mục trên bản sạch; `qc` bắt mọi lỗi CRITICAL cài vào. Chưa đạt thì trả về sửa prompt, ghi số thật vào `qualification.md`.
- Prompt `fact-checker` không chứa hướng dẫn đọc kịch bản. Input của vai không chứa `script.json` (test trên hàm chuẩn bị input).
- Test khoá xanh.
