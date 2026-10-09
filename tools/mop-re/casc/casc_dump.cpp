// Dump one file from a local CASC storage by FileDataID (RE helper, not shipped).
// Usage: casc_dump <wow root> <product> <fileDataId> <out file>
#include "CascLib.h"
#include <cstdio>
#include <cstdlib>
#include <vector>

int main(int argc, char** argv)
{
    if (argc != 5)
    {
        std::fprintf(stderr, "usage: %s <wow root> <product> <fileDataId> <out>\n", argv[0]);
        return 2;
    }

    CASC_OPEN_STORAGE_ARGS args = {};
    args.Size = sizeof(args);
    args.szLocalPath = argv[1];
    args.szCodeName = argv[2];
    HANDLE storage = nullptr;
    if (!CascOpenStorageEx(nullptr, &args, false, &storage))
    {
        std::fprintf(stderr, "open storage failed: %u\n", GetCascError());
        return 1;
    }

    HANDLE file = nullptr;
    DWORD fileDataId = std::strtoul(argv[3], nullptr, 10);
    if (!CascOpenFile(storage, CASC_FILE_DATA_ID(fileDataId), 0, CASC_OPEN_BY_FILEID, &file))
    {
        std::fprintf(stderr, "open file %u failed: %u\n", fileDataId, GetCascError());
        return 1;
    }

    std::vector<char> data;
    char buf[65536];
    DWORD read = 0;
    while (CascReadFile(file, buf, sizeof(buf), &read) && read)
        data.insert(data.end(), buf, buf + read);

    FILE* out = std::fopen(argv[4], "wb");
    if (!out)
        return 1;
    std::fwrite(data.data(), 1, data.size(), out);
    std::fclose(out);
    std::printf("%u: %zu bytes\n", fileDataId, data.size());
    CascCloseFile(file);
    CascCloseStorage(storage);
    return 0;
}
