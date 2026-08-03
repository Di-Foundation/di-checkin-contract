import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import type { InterfaceAbi } from "ethers";
import solc from "solc";

const require = createRequire(import.meta.url);
const sourceName = "contracts/DICheckIn.sol";
const contractName = "DICheckIn";
const expectedCompiler = "0.8.31+commit.fd3a2265.Emscripten.clang";

export function sha256Hex(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function assertCompilerVersion(actual: string): void {
  if (actual !== expectedCompiler) {
    throw new Error(`Expected ${expectedCompiler}; found ${actual}`);
  }
}

export function compileDICheckIn(projectRoot: string): {
  abi: InterfaceAbi;
  bytecode: string;
  deployedBytecode: string;
  compilerVersion: string;
  settings: {
    evmVersion: "shanghai";
    optimizer: { enabled: true; runs: 200 };
  };
} {
  assertCompilerVersion(solc.version());

  const settings = {
    evmVersion: "shanghai" as const,
    optimizer: { enabled: true as const, runs: 200 as const }
  };
  const input = {
    language: "Solidity",
    sources: {
      [sourceName]: {
        content: readFileSync(resolve(projectRoot, sourceName), "utf8")
      }
    },
    settings: {
      ...settings,
      metadata: {
        appendCBOR: true,
        bytecodeHash: "ipfs",
        useLiteralContent: true
      },
      outputSelection: {
        "*": {
          "*": ["abi", "evm.bytecode.object", "evm.deployedBytecode.object"]
        }
      }
    }
  };

  const output = JSON.parse(
    solc.compile(JSON.stringify(input), {
      import: (path: string) => {
        try {
          const imported = require.resolve(path, { paths: [projectRoot] });
          return { contents: readFileSync(imported, "utf8") };
        } catch {
          /* v8 ignore next */
          return { error: `Import not found: ${path}` };
        }
      }
    })
  ) as {
    errors?: Array<{ severity: string; formattedMessage: string }>;
    contracts?: Record<string, Record<string, {
      abi: InterfaceAbi;
      evm: {
        bytecode: { object: string };
        deployedBytecode: { object: string };
      };
    }>>;
  };

  const errors = (output.errors ?? []).filter((entry) => entry.severity === "error");
  /* v8 ignore next 3 */
  if (errors.length > 0) {
    throw new Error(errors.map((entry) => entry.formattedMessage).join("\n"));
  }
  const contract = output.contracts?.[sourceName]?.[contractName];
  /* v8 ignore next */
  if (!contract) throw new Error(`${sourceName}:${contractName} was not compiled`);

  return {
    abi: contract.abi,
    bytecode: `0x${contract.evm.bytecode.object}`,
    deployedBytecode: `0x${contract.evm.deployedBytecode.object}`,
    compilerVersion: solc.version(),
    settings
  };
}
