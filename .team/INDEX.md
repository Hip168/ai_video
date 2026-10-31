# INDEX — thư viện dự án
> Mọi agent đọc file này trước, rồi chỉ mở đúng file mình cần.
> Luật chung: ~/.claude/team/CONVENTIONS.md

| File | Nội dung | Ai đọc |
|---|---|---|
| .team/brief.md | Yêu cầu gốc + lựa chọn đã chốt | BA, DEV, TESTER |
| .team/stack.md | Ngôn ngữ, framework, lệnh cài/chạy/test | DEV, TESTER |
| .team/decisions.md | Quyết định kiến trúc, quan hệ giữa các đề mục | BA, DEV |
| .team/plan.md | Đề mục X → nhánh → issue [X-y] | Tất cả |
| .team/features/X-*.md | Chi tiết từng đề mục | DEV-X, TESTER-X |
| .team/tests/X.md | Sổ test của đề mục X | TESTER-X, TEST-LEAD-X, người dùng |
| .team/features/X-*-giao-dien.md | Chữ ký công khai (tên class/hàm/Key/ARB/đường dẫn file) — hợp đồng giữa DEV và TESTER | DEV-X, TESTER-X, TEST-LEAD-X |
| .team/conflicts/X.md | Chỗ DEV làm khác nhau | Người dùng, BA |
| .team/features/0-hop-dong-timeline.md | Hợp đồng `timeline.json` giữa đề mục 1 và 2 | DEV, TESTER, TEST-LEAD của 1, 2, 3 |
| .team/contract/timeline.sample.json | File mẫu hợp lệ của hợp đồng, test hai bên đọc trực tiếp | DEV, TESTER của 1, 2 |
| .team/features/kich-ban-mau.md | Kịch bản video mẫu, 19 nhịp, 7 cảnh, ý nghĩa cue | DEV, TESTER của 1, 2 |
| .team/features/1-am-thanh.md | Đề mục 1: giọng đọc, timeline, SRT (Python) | DEV-1, TESTER-1 |
| .team/features/2-hinh-anh.md | Đề mục 2: cảnh, phụ đề, MP4 (Remotion) | DEV-2, TESTER-2 |
| .team/features/3-ghep-video.md | Đề mục 3: lệnh một phát, video mẫu thật | DEV-3, TESTER-3 |
| .team/autonomy.md | Chế độ tự động và các điểm dừng của dự án | Điều phối |
