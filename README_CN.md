# DI 签到合约

[English](./README.md) · [简体中文](./README_CN.md)

DI 签到是 DI 生态的链上参与模块。`DICheckIn` 智能合约在 BNB Smart Chain 上记录钱包每日签到，为参与活动提供可公开验证的记录。

本仓库公开合约源码、主网部署信息、编译输入与自动化测试，供读者和集成方了解签到规则、检查合约实现并复现构建。

## 运行机制

- 每个钱包在每个活动日只能记录一次签到。
- 合约记录累计签到次数、当前连续签到、历史最长连续签到，以及每日整体签到量。
- 钱包达到配置的连续签到目标后，合约会永久记录其链上达标状态。

活动积分、奖励、排行榜和其他任务均在链下计算；本合约不包含代币、收款、提款、代理或升级功能。

## 仓库内容

- [合约源码](./contracts/DICheckIn.sol)
- [主网部署信息](./deployments/bsc-mainnet.json)
- [编译输入](./artifacts/bscscan/standard-input.json)
- [合约测试](./test/public-release.test.ts)
- [安全政策](./SECURITY.md)

## BSC 主网部署

| 项目 | 内容 |
| --- | --- |
| 网络 | BNB Smart Chain 主网（`chainId 56`） |
| 合约 | [`0xC361Eb6E91abD289c912BfCABc644076680659B6`](https://bscscan.com/address/0xC361Eb6E91abD289c912BfCABc644076680659B6#code) |
| 部署交易 | [`0x570e91fbd46ecbf7fd896fbd0c5e90c202d859c4fb54c8b697a70243f7a63eaf`](https://bscscan.com/tx/0x570e91fbd46ecbf7fd896fbd0c5e90c202d859c4fb54c8b697a70243f7a63eaf) |
| 开始时间 | `2026-08-08 00:00:00 Asia/Shanghai`（`1786118400`） |
| 活动时长 | `365` 天 |
| 达标条件 | 连续签到 `30` 天 |
| BscScan 认证 | Source Code Verified — Exact Match |

日期边界由 `startTime` 锚定；本次部署的每个活动日从北京时间零点开始。

## 可复现构建

- Solidity：`v0.8.31+commit.fd3a2265`
- EVM：`shanghai`
- 优化器：开启，`200` runs
- OpenZeppelin Contracts：`5.1.0`
- 许可证：MIT
- `contracts/DICheckIn.sol` SHA-256：`9dd95750769532377aec39e84cb3f03fc6fda847c8e9bc9e19e87ad889ab7bd3`
- BscScan Standard JSON SHA-256：`843e054f74b53c5bafebedadb3a2ff5c97155ac8942cef738d9b90274729989c`

BscScan 使用的完整编译输入位于 [`artifacts/bscscan/standard-input.json`](artifacts/bscscan/standard-input.json)。

```bash
npm ci
npm test
npm run typecheck
npm run test:coverage
```

## 前端可读取状态

`users(address)` 返回最后签到日、累计签到次数、当前连续签到、历史最长连续签到和达标状态。前端还可读取 `currentDay`、`canCheckInToday`、`uniqueUsers`、`totalCheckIns` 与 `dailyCheckIns`。

签到成功会触发 `CheckedIn`；钱包第一次达到连续签到目标时会触发 `Qualified`，并永久记录 `qualified = true`。

## 管理权限

Owner 只能暂停或恢复新签到，以及执行两步式所有权转移。暂停不会改变已有签到记录。合约禁止放弃所有权，避免暂停后无人能够恢复。

安全问题请阅读 [SECURITY.md](SECURITY.md)，许可证见 [LICENSE](LICENSE)。

## 官方链接

[DI 官网](https://di.xyz/) · [白皮书](https://whitepaper.di.xyz/zh/) · [白皮书源文档](https://github.com/Di-Foundation/di-whitepaper)
