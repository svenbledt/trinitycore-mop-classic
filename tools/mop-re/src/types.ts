export type Direction = "CMSG" | "SMSG";
export interface OpcodeEntry { name: string; value: number; dir: Direction }
export const group = (v: number) => v >>> 16;
export const index = (v: number) => v & 0xffff;
