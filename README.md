# DI Check-In Contract

`DICheckIn` is DI Foundation's non-upgradeable daily check-in contract on BNB Smart Chain. It records one direct wallet check-in per campaign day, current and longest streaks, aggregate activity, and whether a wallet has reached the configured consecutive-day target.

Points, rewards, rankings, and other campaign tasks are intentionally off-chain. The contract has no token, payment, withdrawal, proxy, or upgrade functionality.

## BSC mainnet deployment

| Field | Value |
| --- | --- |
| Network | BNB Smart Chain mainnet (`chainId 56`) |
| Contract | [`0xC361Eb6E91abD289c912BfCABc644076680659B6`](https://bscscan.com/address/0xC361Eb6E91abD289c912BfCABc644076680659B6#code) |
| Deployment transaction | [`0x570e91fbd46ecbf7fd896fbd0c5e90c202d859c4fb54c8b697a70243f7a63eaf`](https://bscscan.com/tx/0x570e91fbd46ecbf7fd896fbd0c5e90c202d859c4fb54c8b697a70243f7a63eaf) |
| Start time | `2026-08-08 00:00:00 Asia/Shanghai` (`1786118400`) |
| Campaign length | `365` days |
| Qualification target | `30` consecutive days |
| BscScan verification | Source Code Verified — Exact Match |

The day boundary is anchored to `startTime`; for this deployment each campaign day begins at midnight in Asia/Shanghai.

## Reproducible build

- Solidity: `v0.8.31+commit.fd3a2265`
- EVM version: `shanghai`
- Optimizer: enabled, `200` runs
- OpenZeppelin Contracts: `5.1.0`
- License: MIT
- `contracts/DICheckIn.sol` SHA-256: `9dd95750769532377aec39e84cb3f03fc6fda847c8e9bc9e19e87ad889ab7bd3`
- BscScan Standard JSON SHA-256: `843e054f74b53c5bafebedadb3a2ff5c97155ac8942cef738d9b90274729989c`

The exact BscScan compiler input is stored at [`artifacts/bscscan/standard-input.json`](artifacts/bscscan/standard-input.json).

```bash
npm ci
npm test
npm run typecheck
npm run test:coverage
```

## On-chain state and events

`users(address)` returns `lastCheckInDay`, `totalCheckIns`, `currentStreak`, `longestStreak`, and `qualified`. Frontends can also read `currentDay`, `canCheckInToday`, `uniqueUsers`, `totalCheckIns`, and `dailyCheckIns`.

Successful check-ins emit `CheckedIn`. The first time a wallet reaches the required longest streak, the contract emits `Qualified` and permanently records `qualified = true`.

## Administration

The owner can only pause or resume new check-ins and perform a two-step ownership transfer. Existing records are not changed by pausing. Ownership renunciation is disabled so a paused deployment cannot become permanently unrecoverable.

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## License

MIT. See [LICENSE](LICENSE).
