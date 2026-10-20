# CDataStore primitive addresses per client build; select with MOP_BUILD (default 70469).
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
    # 70469: +0x7B9E0 (CDataStore/GUID), +0x1BC0 (bit writers); bytes identical to 70032 except rip displacements
    "70469": {
        "smsg": {0x142E0C050: "B", 0x142E0C0A0: "H", 0x142E0C0F0: "I", 0x142E0C140: "Q", 0x142E0C660: "S",
                 0x142E0C6B0: "S", 0x142E5DB90: "G"},
        "cmsg": {0x142E0CB40: "I", 0x142E0CA00: "B", 0x142E5DBC0: "G", 0x140583760: "B", 0x142E0D200: "S",
                 0x142E0CD40: "Q", 0x142E0CBE0: "I", 0x142E0CAA0: "H", 0x1405836A0: "B", 0x1405835E0: "B",
                 0x1405833A0: "B", 0x1405832E0: "B", 0x140583460: "B", 0x140583520: "B"},
        # TODO(verify): 0x1401D0DC0 placed by its region's delta; no packet calls it in 70449 or 70469
        "noise": {0x142DC1D30, 0x142DA2430, 0x142DA2310, 0x142F7F670, 0x142F7FD10, 0x1401D0DC0},
        "sized": {0x142E0C660, 0x142E0C6B0},
    },
}

P = BUILDS[os.environ.get("MOP_BUILD", "70469")]
