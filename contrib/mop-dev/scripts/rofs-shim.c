// LD_PRELOAD shim for the extractor: CascLib opens CASC files O_RDWR although it only reads them.
// The client install is mounted read-only, so retry such opens with O_RDONLY when they fail with EROFS.
#define _GNU_SOURCE
#include <dlfcn.h>
#include <errno.h>
#include <fcntl.h>
#include <stdarg.h>

typedef int (*open_fn)(const char*, int, ...);
typedef int (*openat_fn)(int, const char*, int, ...);

static int retry(int r, int flags) { return r < 0 && errno == EROFS && (flags & O_ACCMODE) == O_RDWR; }
static int ro(int flags) { return (flags & ~O_ACCMODE) | O_RDONLY; }

#define WRAP_OPEN(name)                                                         \
int name(const char* path, int flags, ...)                                       \
{                                                                                \
    static open_fn real;                                                         \
    if (!real) real = (open_fn)dlsym(RTLD_NEXT, #name);                          \
    va_list ap; va_start(ap, flags); int mode = va_arg(ap, int); va_end(ap);     \
    int r = real(path, flags, mode);                                             \
    return retry(r, flags) ? real(path, ro(flags), mode) : r;                    \
}

#define WRAP_OPENAT(name)                                                       \
int name(int dir, const char* path, int flags, ...)                             \
{                                                                                \
    static openat_fn real;                                                       \
    if (!real) real = (openat_fn)dlsym(RTLD_NEXT, #name);                        \
    va_list ap; va_start(ap, flags); int mode = va_arg(ap, int); va_end(ap);     \
    int r = real(dir, path, flags, mode);                                        \
    return retry(r, flags) ? real(dir, path, ro(flags), mode) : r;               \
}

WRAP_OPEN(open)
WRAP_OPEN(open64)
WRAP_OPENAT(openat)
WRAP_OPENAT(openat64)
