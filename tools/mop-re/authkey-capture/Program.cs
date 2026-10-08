// Captures the per-build auth seed key (build_auth_key) from a running client (RE helper, not shipped).
// Attaches as a debugger, sets a hardware execute breakpoint on the AuthSession digest function and
// reads its 6th argument (pointer to the 16 byte key). See docs/mop-port/re-notes.md "Auth key capture".
// Usage: authkey-capture [rva hex, default 2EB1AE0] [process name, default WowClassic]
using System;
using System.Collections.Generic;
using System.Diagnostics;
using System.Linq;
using System.Runtime.InteropServices;

static class Program
{
    const uint DEBUG_PROCESS_CREATE = 3, DEBUG_THREAD_CREATE = 2, DEBUG_THREAD_EXIT = 4, DEBUG_PROCESS_EXIT = 5, DEBUG_EXCEPTION = 1, DEBUG_LOAD_DLL = 6;
    const uint DBG_CONTINUE = 0x00010002, DBG_EXCEPTION_NOT_HANDLED = 0x80010001;
    const uint STATUS_SINGLE_STEP = 0x80000004, STATUS_BREAKPOINT = 0x80000003;
    const uint CONTEXT_AMD64 = 0x100000, CONTEXT_CONTROL = CONTEXT_AMD64 | 0x1, CONTEXT_DEBUG_REGISTERS = CONTEXT_AMD64 | 0x10;
    const uint THREAD_ALL = 0x1FFFFF;

    // x64 CONTEXT field offsets.
    const int OffContextFlags = 0x30, OffEFlags = 0x44, OffDr0 = 0x48, OffDr6 = 0x68, OffDr7 = 0x70, OffRsp = 0x98, OffRip = 0xF8, ContextSize = 1232;

    [DllImport("kernel32.dll", SetLastError = true)] static extern bool DebugActiveProcess(int pid);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool DebugActiveProcessStop(int pid);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool DebugSetProcessKillOnExit(bool kill);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool WaitForDebugEvent(byte[] ev, uint ms);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool ContinueDebugEvent(int pid, int tid, uint status);
    [DllImport("kernel32.dll", SetLastError = true)] static extern nint OpenThread(uint access, bool inherit, int tid);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool CloseHandle(nint h);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool GetThreadContext(nint thread, nint ctx);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool SetThreadContext(nint thread, nint ctx);
    [DllImport("kernel32.dll", SetLastError = true)] static extern bool ReadProcessMemory(nint proc, nint addr, byte[] buf, int size, out int read);

    static nint _ctx;

    static int Main(string[] args)
    {
        // Read-only mode (no debugger): peek <rva hex> <length> <out file>
        if (args.Length == 4 && args[0] == "peek")
            return Peek(Convert.ToInt64(args[1], 16), int.Parse(args[2]), args[3]);

        var rva = args.Length > 0 ? Convert.ToInt64(args[0], 16) : 0x2EB1AE0;
        var name = args.Length > 1 ? args[1] : "WowClassic";
        var proc = Process.GetProcessesByName(name).FirstOrDefault();
        if (proc == null)
        {
            Console.WriteLine($"{name}.exe is not running.");
            return 1;
        }

        var target = proc.MainModule.BaseAddress + (nint)rva;
        Console.WriteLine($"{name} pid {proc.Id}, base 0x{proc.MainModule.BaseAddress:X}, breakpoint 0x{target:X}");

        // CONTEXT must be 16 byte aligned.
        var raw = Marshal.AllocHGlobal(ContextSize + 16);
        _ctx = (raw + 15) & ~(nint)15;

        if (!DebugActiveProcess(proc.Id))
        {
            Console.WriteLine($"DebugActiveProcess failed: {Marshal.GetLastWin32Error()}");
            return 1;
        }

        DebugSetProcessKillOnExit(false);
        var threads = new Dictionary<int, nint>();
        var ev = new byte[176];
        byte[] key = null;

        try
        {
            Console.WriteLine("Attached. Log in and select the realm; waiting for the AuthSession digest...");
            while (key == null)
            {
                if (!WaitForDebugEvent(ev, 1000))
                {
                    if (proc.HasExited)
                        break;
                    continue;
                }

                var code = BitConverter.ToUInt32(ev, 0);
                var tid = BitConverter.ToInt32(ev, 8);
                var status = DBG_CONTINUE;

                switch (code)
                {
                    case DEBUG_PROCESS_CREATE:
                    case DEBUG_THREAD_CREATE:
                    {
                        var h = OpenThread(THREAD_ALL, false, tid);
                        if (h != 0)
                        {
                            threads[tid] = h;
                            SetBreakpoint(h, target, true);
                        }
                        break;
                    }
                    case DEBUG_THREAD_EXIT:
                        if (threads.Remove(tid, out var exited))
                            CloseHandle(exited);
                        break;
                    case DEBUG_PROCESS_EXIT:
                        Console.WriteLine("Client exited.");
                        return 1;
                    case DEBUG_EXCEPTION:
                    {
                        var exCode = BitConverter.ToUInt32(ev, 16);
                        var exAddr = (nint)BitConverter.ToInt64(ev, 32);
                        if (exCode == STATUS_SINGLE_STEP && exAddr == target && threads.TryGetValue(tid, out var th))
                        {
                            key = ReadKey(proc.Handle, th);
                            // Resume past the breakpoint (RF) and remove it everywhere before detaching.
                            Marshal.WriteInt32(_ctx, OffContextFlags, (int)CONTEXT_CONTROL);
                            GetThreadContext(th, _ctx);
                            Marshal.WriteInt32(_ctx, OffEFlags, Marshal.ReadInt32(_ctx, OffEFlags) | 0x10000);
                            SetThreadContext(th, _ctx);
                        }
                        else if (exCode != STATUS_BREAKPOINT && exCode != STATUS_SINGLE_STEP)
                            status = DBG_EXCEPTION_NOT_HANDLED;
                        break;
                    }
                }

                if (key != null)
                    foreach (var h in threads.Values)
                        SetBreakpoint(h, target, false);

                ContinueDebugEvent(BitConverter.ToInt32(ev, 4), tid, status);
            }
        }
        finally
        {
            foreach (var h in threads.Values)
            {
                SetBreakpoint(h, target, false);
                CloseHandle(h);
            }
            DebugActiveProcessStop(proc.Id);
        }

        if (key == null)
            return 1;

        Console.WriteLine($"AUTH_KEY {Convert.ToHexString(key)}");
        return 0;
    }

    static int Peek(long rva, int length, string outFile)
    {
        var proc = Process.GetProcessesByName("WowClassic").FirstOrDefault(p => p.WorkingSet64 > 100 * 1024 * 1024);
        if (proc == null)
        {
            Console.WriteLine("WowClassic.exe is not running.");
            return 1;
        }

        var buf = new byte[length];
        var ok = ReadProcessMemory(proc.Handle, proc.MainModule.BaseAddress + (nint)rva, buf, length, out var read);
        System.IO.File.WriteAllBytes(outFile, buf.AsSpan(0, read).ToArray());
        var cc = buf.Take(read).Count(b => b == 0xCC);
        Console.WriteLine($"pid {proc.Id} base 0x{proc.MainModule.BaseAddress:X}: read {read}/{length} (ok={ok}), 0xCC bytes {cc}");
        return ok ? 0 : 1;
    }

    static void SetBreakpoint(nint thread, nint address, bool enable)
    {
        Marshal.WriteInt32(_ctx, OffContextFlags, (int)CONTEXT_DEBUG_REGISTERS);
        if (!GetThreadContext(thread, _ctx))
            return;

        Marshal.WriteInt64(_ctx, OffDr0, enable ? address : 0);
        Marshal.WriteInt64(_ctx, OffDr6, 0);
        var dr7 = Marshal.ReadInt64(_ctx, OffDr7) & ~0xF0003L; // DR0: local enable bit, RW/LEN bits = execute, 1 byte
        Marshal.WriteInt64(_ctx, OffDr7, enable ? dr7 | 1 : dr7);
        SetThreadContext(thread, _ctx);
    }

    static byte[] ReadKey(nint process, nint thread)
    {
        Marshal.WriteInt32(_ctx, OffContextFlags, (int)CONTEXT_CONTROL);
        GetThreadContext(thread, _ctx);
        var rsp = (nint)Marshal.ReadInt64(_ctx, OffRsp);

        // Win64 ABI at function entry: [rsp] return address, [rsp+0x28] arg 5, [rsp+0x30] arg 6.
        var ptrBuf = new byte[8];
        ReadProcessMemory(process, rsp + 0x30, ptrBuf, 8, out _);
        var keyPtr = (nint)BitConverter.ToInt64(ptrBuf, 0);

        var key = new byte[16];
        if (keyPtr == 0 || !ReadProcessMemory(process, keyPtr, key, 16, out var read) || read != 16)
        {
            Console.WriteLine($"Breakpoint hit but key pointer 0x{keyPtr:X} is unreadable.");
            return null;
        }
        return key;
    }
}
