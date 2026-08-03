import { mkdtempSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { BrowserProvider, ContractFactory } from "ethers";
import ganache from "ganache";
import { beforeAll, beforeEach, describe, expect, it } from "vitest";
import { assertCompilerVersion, compileDICheckIn, sha256Hex } from "../src/compile.js";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

describe("DICheckIn public release", () => {
  let compiled: ReturnType<typeof compileDICheckIn>;
  let provider: BrowserProvider;
  let owner: Awaited<ReturnType<BrowserProvider["getSigner"]>>;
  let user: Awaited<ReturnType<BrowserProvider["getSigner"]>>;
  let contract: any;
  let startTime: number;

  beforeAll(() => {
    compiled = compileDICheckIn(root);
  });

  beforeEach(async () => {
    provider = new BrowserProvider(ganache.provider({ logging: { quiet: true } }) as any);
    owner = await provider.getSigner(0);
    user = await provider.getSigner(1);
    const latest = await provider.getBlock("latest");
    startTime = Number(latest?.timestamp ?? 0) + 3600;
    const factory = new ContractFactory(compiled.abi, compiled.bytecode, owner);
    contract = await factory.deploy(startTime, 365, 30);
    await contract.waitForDeployment();
  });

  it("uses the audited source and exact compiler settings", () => {
    const source = readFileSync(resolve(root, "contracts", "DICheckIn.sol"), "utf8");
    expect(sha256Hex(source)).toBe("9dd95750769532377aec39e84cb3f03fc6fda847c8e9bc9e19e87ad889ab7bd3");
    expect(compiled.compilerVersion).toBe("0.8.31+commit.fd3a2265.Emscripten.clang");
    expect(compiled.settings).toEqual({
      evmVersion: "shanghai",
      optimizer: { enabled: true, runs: 200 }
    });
  });

  it("rejects a compiler version other than the frozen release", () => {
    expect(() => assertCompilerVersion("0.8.30+commit.73712a01.Emscripten.clang")).toThrow(
      /Expected 0\.8\.31/
    );
  });

  it("fails closed when a Solidity import cannot be resolved", () => {
    const fixture = mkdtempSync(resolve(tmpdir(), "dicheckin-public-release-"));
    mkdirSync(resolve(fixture, "contracts"));
    writeFileSync(
      resolve(fixture, "contracts", "DICheckIn.sol"),
      '// SPDX-License-Identifier: MIT\npragma solidity ^0.8.24;\nimport "missing.sol";\ncontract DICheckIn {}\n'
    );
    expect(() => compileDICheckIn(fixture)).toThrow(/missing\.sol/);
  });

  it("starts on the configured boundary and prevents duplicate daily check-ins", async () => {
    expect(await contract.currentDay()).toBe(0n);
    await provider.send("evm_setTime", [startTime * 1000]);
    await provider.send("evm_mine", []);
    expect(await contract.currentDay()).toBe(1n);
    await (await contract.connect(user).checkIn({ gasLimit: 150_000 })).wait();
    await expect(contract.connect(user).checkIn.staticCall()).rejects.toThrow();
    const state = await contract.users(await user.getAddress());
    expect(state.totalCheckIns).toBe(1n);
    expect(state.currentStreak).toBe(1n);
  });

  it("tracks a 30-day streak and emits qualification state", async () => {
    for (let day = 1; day <= 30; day += 1) {
      const timestamp = startTime + (day - 1) * 86400 + 3600;
      await provider.send("evm_setTime", [timestamp * 1000]);
      await provider.send("evm_mine", []);
      await (await contract.connect(user).checkIn({ gasLimit: 150_000 })).wait();
    }
    const state = await contract.users(await user.getAddress());
    expect(state.totalCheckIns).toBe(30n);
    expect(state.currentStreak).toBe(30n);
    expect(state.longestStreak).toBe(30n);
    expect(state.qualified).toBe(true);
  });

  it("allows only the owner to pause and uses two-step ownership transfer", async () => {
    await expect(contract.connect(user).pause()).rejects.toThrow();
    await (await contract.pause()).wait();
    expect(await contract.paused()).toBe(true);
    const userAddress = await user.getAddress();
    await (await contract.transferOwnership(userAddress)).wait();
    expect(await contract.owner()).toBe(await owner.getAddress());
    expect(await contract.pendingOwner()).toBe(userAddress);
    await (await contract.connect(user).acceptOwnership()).wait();
    expect(await contract.owner()).toBe(userAddress);
  });
});
