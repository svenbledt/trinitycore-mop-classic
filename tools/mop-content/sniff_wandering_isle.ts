// Extracts Wandering Isle facts from WowPacketParser text output of retail 5.5.4 sniffs into data/wandering_isle_sniff.json.
// usage: bun tools/mop-content/sniff_wandering_isle.ts <wpp parsed.txt>...   (sniffs: m1/m2, 5.5.4.70449, ymir)
// The JSON is what gen_wandering_isle.ts reads; it only holds server-sent values the island data is checked against.
import { readFileSync, writeFileSync } from "node:fs";

const files = process.argv.slice(2);
if (!files.length) throw new Error("usage: sniff_wandering_isle.ts <wpp parsed.txt>...");
const out = new URL("./data/wandering_isle_sniff.json", import.meta.url).pathname.replace(/^\/(\w:)/, "$1");

type Quest = { id: number; order?: number; starter?: number | string; ender?: number | string; flags?: number; flagsEx?: number;
  info?: Record<string, number>; src: string[] };
type Option = { id: number; npc: number; orderIndex: number; flags: number; language: number; text: string; boxText: string; boxMoney: number; spell: number };
type Menu = { entry: number; menu: number; broadcastText: number; options: Option[]; src: string };
const quests: Record<number, Quest> = {};
const menus = new Map<string, Menu>();
const teleports: { spell: number; map: number; x: number; y: number; z: number; o: number; src: string }[] = [];
const INFO = ["QuestType", "QuestLevel", "QuestPackageID", "QuestMinLevel", "QuestSortID", "QuestInfoID", "SuggestedGroupNum", "RewardNextQuest",
  "RewardXPDifficulty", "RewardXPMultiplier", "RewardMoneyDifficulty", "RewardMoneyMultiplier", "RewardBonusMoney", "RewardSpell"];
// Creature givers are entries, gameobjects "go:<entry>", players "player" (quest pushes).
const who = (s?: string): number | string | undefined => s?.includes("Player/") ? "player"
  : s?.match(/GameObject\/.*Entry: (\d+)/) ? `go:${s.match(/Entry: (\d+)/)![1]}` : s?.match(/Entry: (\d+)/) ? Number(s.match(/Entry: (\d+)/)![1]) : undefined;
let order = 0;
const seenCreatures = new Set<number>(), seenGameObjects = new Set<number>();

for (const file of files) {
  const tag = file.replace(/\\/g, "/").split("/").pop()!.replace(/r?_parsed\.txt$/, "");
  let lastTeleportSpell = 0;
  const text = readFileSync(file, "utf8");
  for (const m of text.matchAll(/(Creature|Vehicle|GameObject)\/0 R\d+\/S\d+ Map: 860 Entry: (\d+)/g))
    (m[1] === "GameObject" ? seenGameObjects : seenCreatures).add(Number(m[2]));
  for (const b of text.split(/\r?\n\r?\n/)) {
    const h = b.match(/^(?:ServerToClient|ClientToServer): (\w+).*Number: (\d+)/);
    if (!h) continue;
    const op = h[1], src = `${tag}#${h[2]}`;
    const f = (k: string) => b.match(new RegExp(`^${k}: (.*)$`, "m"))?.[1];
    const num = (k: string) => { const v = f(k); return v === undefined ? undefined : Number(v.split(" ")[0]); };
    const quest = (id: number) => (quests[id] ??= { id, src: [] });
    switch (op) {
      case "SMSG_QUERY_QUEST_INFO_RESPONSE": {
        if (f("Has Data") !== "True") break;
        // WPP's 5.5.4 reader is aligned up to RewardSpell; later fields are not used.
        const q = quest(num("Quest ID")!); q.info = Object.fromEntries(INFO.map(k => [k, num(k)!]));
        break;
      }
      case "SMSG_QUEST_GIVER_QUEST_DETAILS": {
        const q = quest(num("QuestID")!);
        if (q.flags === undefined) { q.flags = num("Flags"); q.flagsEx = num("FlagsEx"); q.src.push(`details ${src}`); }
        if (q.starter === undefined) q.starter = who(f("QuestGiverGUID"));
        break;
      }
      case "CMSG_QUEST_GIVER_ACCEPT_QUEST": { const q = quest(num("QuestID")!); q.order ??= ++order; break; }
      case "SMSG_QUEST_GIVER_OFFER_REWARD_MESSAGE": {
        const q = quest(Number(b.match(/QuestID: (\d+)/)![1]));
        if (q.ender === undefined) { q.ender = who(b.match(/QuestGiverGUID: (.*)/)?.[1]); q.src.push(`offer ${src}`); }
        break;
      }
      case "SMSG_GOSSIP_MESSAGE": {
        const entry = who(f("GossipGUID")), menu = num("GossipID")!;
        if (typeof entry !== "number") break;
        const options: Option[] = [];
        for (const m of b.matchAll(/\[(\d+)\] \(GossipOptions\) GossipOptionID: (-?\d+)/g)) {
          const g = (k: string) => b.match(new RegExp(`\\[${m[1]}\\] \\(GossipOptions\\) ${k}: (.*)`))?.[1] ?? "";
          options.push({ id: Number(m[2]), npc: Number(g("OptionNPC")), orderIndex: Number(g("OrderIndex")), flags: Number(g("Flags")),
            language: Number(g("Language").split(" ")[0]), text: g("Text"), boxText: g("Confirm"), boxMoney: Number(g("OptionCost") || 0), spell: Number(g("SpellID") || 0) });
        }
        const key = `${entry}:${menu}`, prev = menus.get(key);
        const merged = prev ? [...prev.options, ...options.filter(o => !prev.options.some(p => p.id === o.id))] : options;
        menus.set(key, { entry, menu, broadcastText: num("BroadcastTextID") ?? 0, options: merged, src: prev?.src ?? src });
        break;
      }
      case "SMSG_SPELL_GO": { if (b.includes("CasterUnit: Full: 0x") && b.match(/\(Cast\) CasterUnit: .*Player\//)) lastTeleportSpell = Number(b.match(/\(Cast\) SpellID: (\d+)/)?.[1] ?? 0); break; }
      case "SMSG_TRANSFER_PENDING": {
        const spell = num("TransferSpellID") ?? lastTeleportSpell;
        const p = b.match(/OldMapPosition: X: (\S+) Y: (\S+) Z: (\S+)/);
        if (p) teleports.push({ spell, map: num("MapID")!, x: Number(p[1]), y: Number(p[2]), z: Number(p[3]), o: NaN, src });
        break;
      }
      case "SMSG_NEW_WORLD": {
        // WPP's 5.5.4 reader is one float off here: "MovementOffset X" carries the orientation.
        const t = teleports.at(-1), o = b.match(/MovementOffset: X: (\S+)/)?.[1];
        if (t && Number.isNaN(t.o) && o) t.o = Number(o);
        break;
      }
    }
  }
}
writeFileSync(out, JSON.stringify({ source: files.map(f => f.replace(/\\/g, "/").split("/").pop()), quests, menus: [...menus.values()], teleports,
  seen: { creatures: [...seenCreatures].sort((a, b) => a - b), gameobjects: [...seenGameObjects].sort((a, b) => a - b) } }, null, 1) + "\n");
console.log(`${Object.keys(quests).length} quests, ${menus.size} gossip menus, ${teleports.length} teleports -> ${out}`);
