# CDataStore primitive addresses per client build; select with MOP_BUILD (default 70449).
# 70449 was relocated from 70032 by unanimous call-site votes (pe/diff_builds.py, docs/mop-port/opcode-harvest.md).
import os

BUILDS = {
    "70032": {
        "smsg": {0x142E4CAC0: "B", 0x142E4CB10: "H", 0x142E4CB60: "I", 0x142E4CBB0: "Q", 0x142E4D0D0: "S",
                 0x142E4D120: "S", 0x142E9E600: "G"},
        "cmsg": {0x142E4D5B0: "I", 0x142E4D470: "B", 0x142E9E630: "G", 0x140583600: "B", 0x142E4DC70: "S",
                 0x142E4D7B0: "Q", 0x142E4D650: "I", 0x142E4D510: "H", 0x140583540: "B", 0x140583480: "B",
                 0x140583240: "B", 0x140583180: "B", 0x140583300: "B", 0x1405833C0: "B"},
        "noise": {0x142E027A0, 0x142DE2EA0, 0x142DE2D80, 0x142FC00E0, 0x142FC0780, 0x1401D0C60},
        "sized": {0x142E4D0D0, 0x142E4D120},
    },
    "70449": {
        "smsg": {0x142D90670: "B", 0x142D906C0: "H", 0x142D90710: "I", 0x142D90760: "Q", 0x142D90C80: "S",
                 0x142D90CD0: "S", 0x142DE21B0: "G"},
        "cmsg": {0x142D91160: "I", 0x142D91020: "B", 0x142DE21E0: "G", 0x140581BA0: "B", 0x142D91820: "S",
                 0x142D91360: "Q", 0x142D91200: "I", 0x142D910C0: "H", 0x140581AE0: "B", 0x140581A20: "B",
                 0x1405817E0: "B", 0x140581720: "B", 0x1405818A0: "B", 0x140581960: "B"},
        # TODO(verify): last two were not hit by votes; placed by their region's delta
        "noise": {0x142D46350, 0x142D26A50, 0x142D26930, 0x142F03C90, 0x142F04330, 0x1401CF200},
        "sized": {0x142D90C80, 0x142D90CD0},
    },
}

P = BUILDS[os.environ.get("MOP_BUILD", "70449")]
