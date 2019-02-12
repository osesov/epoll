
#include <stdio.h>
#include <cstdint>
#include <cassert>

uint64_t modadd(uint64_t a, uint64_t b, uint64_t n) {
    assert(n > 0 && 0 <= a && a < n && 0 <= b && b < n);
    uint64_t room = (n - 1) - a;
    if (b <= room)
        a += b;
    else
        a = b - room - 1;
    return a;
}


uint64_t modmul(uint64_t a, uint64_t b, uint64_t n) {
    uint64_t result = 0;
    a = a % n;
    b = b % n;
    if (b > a) {
        uint64_t x = a;
        a = b;
        b = x;
    }

    while (b) {
        if (b & 1u)
            result = modadd(result, a, n);
        a = modadd(a, a, n);
        b >>= 1;
    }
    return result;
}

uint64_t modpow(uint64_t a, uint64_t b, uint64_t n)
{
    uint64_t result = 1, base;
    a = a % n;
    b = b % n;
    if (b > a) {
        uint64_t x = a;
        a = b;
        b = x;
    }

    base = a % n;

    while (b > 0) {
        if (b & 1)
            result = modmul(result, base, n);
        base = modmul(base, base, n);
        b >>= 1;
    }
    return result;
}

int main() {
    const uint64_t a = 4143029724ULL;
    const uint64_t b = 1773452297ULL;
    const uint64_t e = 65537ULL;
    const uint64_t n = 9292480077114445361ULL;

    const uint64_t x = modmul(a, n - 1,n);
//    assert(modmul(a,b,n) == 7347465580567076028ULL);
    printf("%lu\n", x);
    printf("%lu\n", modpow(a, e, n));
    return  0;
}
