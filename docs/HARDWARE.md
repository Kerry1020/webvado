# 硬件管理接口

对应原实现计划 Task 4.6。使用 OSS CAD Suite 中的 openFPGALoader，命令参数以数组传递，不经过 shell。

- `GET /api/hardware`：运行 `--list-boards`，返回板卡名称和原始输出。
- `POST /api/hardware/detect`：接受 `board` / `cable` / `serial`，运行 `--detect`；未检测到设备不显示成功。
- `POST /api/hardware/:projectId/program`：接受上述选择器与 `target`（`sram` 或 `flash`），仅使用该工程构建目录中通过新鲜度校验的 `bitstream.bin`（与 `BuildService` 的 `bitstream-config.json` 清单比对，过期位流返回 409）。flash 显式传 `-f`，SRAM 使用工具默认行为。

编程只由用户明确点击 Program 触发。构建文件必须存在且非空；同一时刻只能有一个硬件操作。无工具、无板卡、参数错误、进程失败分别返回明确错误。

验证：使用注入的命令执行器测试参数、错误和并发行为；真实工具验证版本、板卡列表以及未连接硬件时的检测反馈。没有 FPGA 板卡时不声称已验证真实烧录。

参考：[openFPGALoader first steps](https://trabucayre.github.io/openFPGALoader/guide/first-steps.html)。

序列号参数使用上游 `src/main.cpp` 声明的 `--usb-serial-num`；`--ftdi-serial` 已标为 deprecated。
