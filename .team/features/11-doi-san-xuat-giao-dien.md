# Đề mục 11: giao diện công khai (hợp đồng DEV-11 ↔ TESTER-11)

Mã: `audio/src/aivideo/gates.py` (cổng, sổ tập), `audio/src/aivideo/qualify.py` (đo người kiểm). Chạy từ `audio/`: `PYTHONPATH=$PWD/src .venv/bin/python -m aivideo.gates <lệnh> ...`.

## Quy ước chung
- Mọi lệnh in **một object JSON** ra stdout. Quyết định đọc từ JSON, không đọc từ chữ.
- Mã thoát: `0` đạt; `1` bị chặn / chưa đạt / lỗi (`lỗi: ...` ra stderr, không JSON); `2` sai tham số (argparse); `3` `CAN_NGUOI_DUNG`.
- `--episodes-dir` mặc định `../episodes`. `<slug>` theo `^[a-z0-9]+(-[a-z0-9]+)*$` hoặc `_template`.
- Hàm Python tương ứng (test gọi trực tiếp): `extract_items(doc)`, `check_claims(claims)`, `gate1(slug, episodes_dir)`, `gate2(slug, episodes_dir, write_ledger=True)`, `gate3(slug, episodes_dir, kenh_path, video=None)`, `evaluate_findings(raw, root)`, `script_text_hash(doc)`, `prepare_factcheck(slug, episodes_dir, role_file, tmp_parent=None)`, `build_factcheck_prompt(role_text, batch_dir)`, lớp `Ledger`.

## `claims.json` (sổ fact, D22)
Mảng. Mỗi phần tử:
```json
{"id":"c001","claim":"...","question":"...","sourceUrl":"https://...","credibility":"primary|secondary|anecdotal","status":"DAT|SAI|CHUA_KIEM","extraSources":[{"url":"https://...","credibility":"primary|secondary"}]}
```
`extraSources` tuỳ chọn. `id` duy nhất, các chuỗi không rỗng. Mảng rỗng hợp lệ.

## `extract-claims <script.json> [-o file]`
Bắt trên `text` GỐC (và `spoken` nếu có chữ số) của từng beat, trước `normalize_vi`:
```json
[{"scene":"sc01","beat":"b001","field":"text","kind":"number|name","match":"3,14"}]
```
- `number`: mọi dãy chữ số nối bằng `. , : / - –` (`3,14`, `1.000`, `15.01.2024`, `2024-01-15`, `x86`, `1080p`, `v2`). Số viết bằng chữ không bị bắt.
- `name`: từ viết hoa đứng giữa câu (không đứng đầu câu, đầu dòng, sau `. ! ? … : ;`), từ có chữ hoa giữa từ (`iPhone`, `JavaScript`), từ viết hoa toàn bộ từ 2 chữ cái (`IBM`, `CERN`) trừ tập thuật ngữ chung `GENERIC_ACRONYMS` (CPU, GPU, RAM, ROM, SSD, HDD, USB, OS, API, URL, IP, TCP, UDP, DNS, HTTP, HTTPS, HTML, CSS, SQL, AI, ID, PC, LED, LCD, GB, MB, KB, TB, GHz, MHz, UTF, ASCII, BIOS, LAN, WAN, VPN, GUI, CLI, IDE).
- Luôn mã thoát 0.

## `gate1 <slug>`
Chỉ đọc `claims.json`. Chặn (`pass:false`) khi: sai dạng; trùng id; có claim `CHUA_KIEM` hoặc `SAI`; claim `DAT` mà nguồn `anecdotal` hoặc `sourceUrl` không phải http(s); claim về số (có chữ số trong `claim`) `DAT` mà không có nguồn `primary` và không có ít nhất hai nguồn (`sourceUrl` + `extraSources`, loại primary/secondary) khác host (bỏ `www.`).
```json
{"gate":"gate1","pass":false,"problems":[{"claim":"c003","problem":"..."}]}
```

## `gate2 <slug> [--no-ledger]`
Gồm mọi kiểm của gate1, cộng `validate_script` của `aivideo.episode`, cộng phủ claim: mỗi `number`/`name` của một beat phải khớp ít nhất một claim trong `beat.claims` (id tồn tại, status `DAT`). Khớp số: so dãy chữ số đã bỏ dấu phân cách (`1.000` = `1000`, `3,14` = `3.14`); khớp tên: chuỗi chữ thường nằm trong `claim` (NFC, không phân biệt hoa thường). Số/tên không có claim, hoặc claim `CHUA_KIEM`/`SAI` được trỏ tới → chặn.
Đạt (và không có `--no-ledger`) thì ghi vào `ledger.json` một mục `stage:"cong2"`, `verdict:"DAT"`, `outputHash` = `script_text_hash`, `claimsHash` = sha256 của `claims.json`.
```json
{"gate":"gate2","pass":true,"problems":[{"beat":"b001","kind":"number","match":"3,14","problem":"..."}],"scriptHash":"<64 hex>","claimsHash":"<64 hex>"}
```
`script_text_hash(doc)`: sha256 của JSON chuẩn (`sort_keys`, `ensure_ascii=False`, `separators=(",",":")`) của `{"title":meta.title,"chapters":[{id,title}],"beats":[{"scene","id","text","spoken","claims"}...]}` theo thứ tự cảnh và beat, chuỗi NFC. Chỉ phần lời: đổi `props`, `type`, `sfx`, `pause_ms`, `cue`, `meta.music` KHÔNG đổi hash; đổi một ký tự `text`/`spoken`/tiêu đề chương/danh sách `claims` thì đổi.

## `verdict <findings.json> [--root DIR]`
`findings.json` = `{"findings":[{"severity":"CRITICAL|MAJOR|MINOR","rule","file","quote","failing_case","owner"}]}`; mọi trường chuỗi không rỗng. `file` tính từ `--root` (mặc định thư mục hiện tại), phải nằm trong root.
- Thiếu file / không phải JSON / sai dạng / bất kỳ phát hiện nào sai dạng → `CHUA_DUYET`.
- Phát hiện mà file không tồn tại, nằm ngoài root, hoặc `quote` (NFC) không là chuỗi con của file → bị loại, vào `dropped`; `complete:false`.
- Còn lại: có CRITICAL → `CHAN`; có MAJOR → `SUA`; còn lại (kể cả rỗng) → `DAT`. Chỉ tính phát hiện đã giữ.
```json
{"verdict":"CHAN","kept":[...],"dropped":[{"finding":{...},"reason":"..."}],"counts":{"CRITICAL":1,"MAJOR":0,"MINOR":2},"complete":true,"findingsHash":"<64 hex>"}
```
Mã thoát 0 chỉ khi `DAT`.

## `gate3 <slug> [--kenh PATH] [--video FILE]`
`--kenh` mặc định `<episodes-dir>/../.team/kenh.md`. Danh sách kiểm, mỗi mục `{"name","ok","detail"}`; `pass` = mọi mục ok. Tên mục: `chuoi-so` (chuỗi hash của ledger nguyên vẹn), `hash-kich-ban` (hash lời hiện tại = mục `cong2` DAT mới nhất; `claimsHash` cũng khớp), `lint`, `ky-thuat`, `qc` (mục ledger mới nhất của stage đó, verdict `DAT`, `scriptHash` = hash hiện tại), `qc-dong-phan-quyet` (file `handoff/qc.verdict` có đúng một dòng `PHAN_QUYET: DAT findings_sha256=<64 hex> script_sha256=<64 hex>` với script_sha256 khớp), `qc-video` (chỉ khi có `--video`: sha256 file = `artifactHash` của mục qc), `publish`.
`publish.json` cần: `title` (≤100 ký tự), `description` (có chuỗi `AI`, tức dòng báo giọng đọc do AI tạo, D21), `tags` (mảng chuỗi không rỗng), `chapters` (chuỗi bắt đầu `00:00`), `thumbnail` (đường dẫn tương đối `episodes/<slug>/`, file tồn tại), `privacy` (`unlisted`|`public`), `channel` (bằng, không phân biệt hoa thường, giá trị dòng `Kênh: <tên>` trong `kenh.md`). Nếu `kenh.md` không có dòng `Video đầu đã duyệt: có` thì `privacy` phải là `unlisted`. Thiếu `kenh.md` → mục `publish` không ok.
Đạt thì ghi mục `stage:"cong3"`.

## `ledger`
`episodes/<slug>/ledger.json`: `{"slug","entries":[...]}`. Mỗi mục:
`{"seq","ts","stage","role","pair","round","inputHash","outputHash","verdict","scriptHash","claimsHash","artifactHash","findingsHash","findingKeys","returnTo","escalate","note","prevHash","entryHash"}` (trường không dùng là `null`). `entryHash` = sha256 của mục (bỏ `entryHash`, JSON chuẩn như trên) gồm `prevHash` của mục trước (`""` cho mục đầu). Sửa/xoá/chèn một mục thì chuỗi vỡ, mọi lệnh ledger từ chối và `gate3` chặn.

- `ledger add <slug> --stage S --role R [--pair maker/checker] [--findings F --root DIR] [--input-hash H] [--output-hash H] [--artifact FILE] [--return-to ROLE] [--note T]`
  - Có `--findings`: mục của người kiểm, bắt buộc `--pair`; `verdict` do `verdict` tính (không có cờ nhập tay). Ghi thêm `findings_sha256`. Stage `qc` còn ghi `handoff/qc.verdict`.
  - Không có `--findings`: mục của người làm, `verdict:null`.
  - Vòng: một cặp có tối đa 3 mục người kiểm có verdict khác `DAT` kể từ lần `DAT` gần nhất. Mục người kiểm thứ 4 bị từ chối: không ghi, stdout `{"state":"CAN_NGUOI_DUNG","reason":"..."}`, mã 3. Mục có `--return-to`: lần thứ 3 trong một tập bị từ chối như trên.
  - Lỗi lặp: khoá `findingKeys[i]` = sha1(`rule|file|quote`)[:12]; khi một khoá xuất hiện ở lần thứ 2 trong cùng cặp (kể từ `DAT` gần nhất), mục vẫn ghi với `escalate:true`, stdout `state:"CAN_NGUOI_DUNG"`, mã 3.
  - Thành công: `{"state":"OK","seq":n,"round":r,"verdict":"SUA"}`, mã 0.
- `ledger run <slug> --stage lint|ky-thuat -- <lệnh...>`: chạy lệnh, `verdict` `DAT` nếu mã thoát 0, ngược lại `CHAN`; ghi `outputHash` = sha256 stdout+stderr, `scriptHash` hiện tại. Mã thoát: 0 nếu `DAT`, ngược lại 1.
- `ledger show <slug>`: `{"ok":bool,"entries":n,"last":{...},"scriptHash":...,"rounds":{"<pair>":<số mục người kiểm kể từ DAT>}}`.
- `ledger handoff <slug> <khau>`: tạo `episodes/<slug>/handoff/<khau>.md` với năm mục `## Đã chốt`, `## Đã bỏ`, `## Rủi ro`, `## File`, `## Còn lại`; có sẵn thì mã 1.

## Đưa claim cho fact-checker mù
- `prepare-factcheck <slug> --role <file vai> [--tmp-parent DIR] [--with-lines]`: tạo thư mục tên ngẫu nhiên trung tính `lo-xxxxxxxx` dưới `--tmp-parent` (mặc định thư mục tạm của hệ điều hành; từ chối nếu nằm trong repo) gồm `items.json` (mảng `{id,claim,question,sourceUrl}`, không `status`, không `credibility`) và `prompt.txt` (nội dung file vai + đường dẫn thư mục lô + yêu cầu trả JSON phát hiện, `rule` dạng `claim:<id>`). Dựng prompt từ chối (lỗi) nếu file vai hoặc prompt chứa `script.json`, `kịch bản`, `episodes/`. `--with-lines` (lượt 2 của fact-checker) thêm vào mỗi phần tử trường `lines`: mảng `text` của các beat có `claims` chứa id đó (chỉ chữ của beat, không có `script.json`). Không có file nào khác ngoài hai file này. Stdout: `{"batchDir","items","prompt"}`.
- `apply-factcheck <slug> --findings F --batch DIR`: chạy `verdict` với root = lô; `CHUA_DUYET` thì lỗi, không đổi gì. Với mỗi claim trong `items.json`: có phát hiện giữ lại `rule:"claim:<id>"` mức CRITICAL → `SAI`; mức MAJOR → `CHUA_KIEM`; còn lại → `DAT`. Chỉ ghi lại trường `status` của `claims.json`. Stdout `{"verdict","updated":{"c001":"DAT"},"unmapped":[...]}`.

## `qualify.py` (đo người kiểm, đề mục 11-5)
`python -m aivideo.qualify build [--out DIR]` sinh lại bộ cài lỗi (xác định, cùng đầu ra); `python -m aivideo.qualify prepare --kind fact|qc --which clean|seeded [--role FILE] [--tmp-parent DIR]` chép đầu vào mù ra thư mục tạm ngoài repo (fact: qua `prepare_factcheck`, stdout `{batchDir,items,prompt}`; qc: `{packageDir,files}` chứa `script.json`, `timeline.json`, `video.srt`, `chapters.txt`); `python -m aivideo.qualify score --kind fact|qc --errors F --found F [--clean-found F] [--root DIR] [--threshold 0.9] [--max-false 1]`.
- Bộ cài lỗi nằm ở `qualification/`: `fact/clean.json`, `fact/seeded.json`, `fact/seeded-errors.json`, `qc/clean/`, `qc/seeded/`, `qc/seeded-errors.json`.
- `seeded-errors.json`: `[{"id","severity","file","marker","kind","note"}]`. Một lỗi được tính là bắt khi có phát hiện CRITICAL/MAJOR đã giữ (qua `verdict` với `--root`), `file` cùng tên tệp, và `marker` có trong `quote` hoặc `rule` chứa `:<id>`.
- Báo sai = phát hiện CRITICAL/MAJOR không khớp lỗi nào (trên bản cài lỗi) cộng mọi phát hiện CRITICAL/MAJOR trên bản sạch (`--clean-found`).
- Bộ qc là các sản phẩm dạng chữ (kịch bản chốt, timeline, SRT, mục lục) có 5 lỗi CRITICAL và 1 MAJOR; lỗi hình/âm của video thật do sếp tổng thêm ở đề mục 12.
- Stdout: `{"kind","errors":n,"caught":k,"rate":0.9,"missed":[ids],"falseAlarms":m,"passRate":bool,"passFalse":bool,"pass":bool,"row":"| ... |"}`. `pass` cho `fact`: `rate>=threshold` và `falseAlarms<=max-false`; cho `qc`: mọi lỗi CRITICAL được bắt.
