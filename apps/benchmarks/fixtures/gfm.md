# GFM Fixture

| Package | Parser | Renderer | Notes |
| --- | --- | --- | --- |
| markdown-it | yes | yes | token based |
| remark | yes | via unified | mdast based |
| nizel | yes | yes | custom implementation |

## Tasks

- [x] Parse headings
- [x] Parse tables
- [x] Parse task list markers
- [ ] Compare plugin output

Autolinks should be measured too: https://example.com and user@example.com.

~~Deleted text~~ should appear in GFM-compatible modes where supported.

> [!NOTE]
> Alert syntax is plugin-owned in Nizel and not part of plain CommonMark.

