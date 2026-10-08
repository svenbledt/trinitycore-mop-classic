import type { OpcodeEntry } from "./types";

// Parses the ClientOpcodes/ServerOpcodes dictionaries of a WowPacketParser Enums/Version/*/Opcodes.cs file.
export function parseWppOpcodes(src: string): OpcodeEntry[] {
  const out: OpcodeEntry[] = [];
  const re = /\{\s*Opcode\.((CMSG|SMSG)_\w+)\s*,\s*(0x[0-9A-Fa-f]+)\s*\}/g;
  for (const m of src.matchAll(re))
    out.push({ name: m[1], value: parseInt(m[3], 16), dir: m[2] as "CMSG" | "SMSG" });
  return out;
}
