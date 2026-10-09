namespace X {
    public static class Opcodes_5_5_3 {
        private static readonly BiDictionary<Opcode, int> ClientOpcodes = new()
        {
            { Opcode.CMSG_AUTH_SESSION, 0x390001 },
            { Opcode.CMSG_ENUM_CHARACTERS, 0x380014 },
        };
        private static readonly BiDictionary<Opcode, int> ServerOpcodes = new()
        {
            { Opcode.SMSG_AUTH_CHALLENGE, 0x410000 },
        };
        private static readonly BiDictionary<Opcode, int> MiscOpcodes = new()
        {
        };
    }
}
