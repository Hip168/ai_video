# Đề mục 11: Đội sản xuất

Nhánh `11-doi-san-xuat`. Phụ thuộc đề mục 5. Thiết kế: `.team/doi-san-xuat.md`, D20, D22.

## Kiến trúc đã chọn
- Không ghi vào `.claude/` (bộ phân quyền chặn tự sửa cấu hình, 2026-11-03) và không ghi `~/.claude`. Mỗi vai là một file `episodes/roles/<vai>.md`: nhiệm vụ, đầu vào, đầu ra, được ghi gì, không được làm gì, mẫu báo cáo, mẫu JSON phát hiện.
- Sếp tổng chạy vai bằng loại agent có sẵn, theo bảng trong `episodes/PLAYBOOK.md`: vai chỉ đọc (`fact-checker`, `script-editor`) dùng `feature-dev:code-reviewer` (Read, Grep, Glob, WebFetch, WebSearch; không Bash, không ghi); `qc` dùng `Explore` (đọc và chạy lệnh đo, không ghi file); vai làm (`researcher`, `scriptwriter`, `scene-director`, `voice-producer`, `editor`, `packager`) dùng `general-purpose`; `publisher` dùng `ops`. Prompt = nội dung file vai + đầu vào của khâu.
- Lệnh: người dùng nói "làm video về <đề tài>" (hoặc "làm video" để `researcher` tự chọn); sếp tổng đọc `episodes/PLAYBOOK.md` và đi đúng luồng. PLAYBOOK là nguồn duy nhất của luồng, không lặp lại trong file khác.
- Script ở `audio/src/aivideo/gates.py`: `extract-claims`, `verdict`, `gate1`, `gate2`, `gate3`, `ledger`.
- `claims.json`: `[{"id","claim","question","sourceUrl","credibility","status"}]`, `credibility` thuộc `primary`, `secondary`, `anecdotal`; `status` thuộc `DAT`, `SAI`, `CHUA_KIEM`.

## Task
- [11-1] Mười file vai ở `episodes/roles/`, `episodes/PLAYBOOK.md` (luồng, bảng vai → loại agent, mẫu prompt mỗi khâu).
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
