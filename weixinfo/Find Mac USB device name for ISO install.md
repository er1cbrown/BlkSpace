# Find Mac USB device name for ISO install

**Created:** 3/19/2026, 9:48:15 PM
**Updated:** 3/19/2026, 9:48:59 PM
**Exported:** 6/13/2026, 4:05:07 AM
**Link:** [https://chat.deepseek.com/a/chat/s/70bc34e9-e880-4a0d-a5d4-0e79164a3c61](https://chat.deepseek.com/a/chat/s/70bc34e9-e880-4a0d-a5d4-0e79164a3c61)

---

## User
**2026-03-20T02:48:49.278Z**

sudo dd if=~/Downloads/GhostBSD-25.02-R14.3p2.iso of=/dev/disk2 bs=10240 doesnt work on my Mac how do I find the right name of my storage devices in terminal on Mac to see how to install iso file to boot os on new pc

## DeepSeek
**2026-03-20T02:48:49.283Z**

On macOS, you need to use `diskutil` to find the correct device name. Here's how:

## 1. List all disks
```bash
diskutil list
```

This will show something like:
```
/dev/disk0 (internal, physical):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:      GUID_partition_scheme                        *500.3 GB   disk0
   1:                        EFI EFI                     314.6 MB   disk0s1
   2:                 Apple_APFS Container disk1         500.0 GB   disk0s2

/dev/disk2 (external, physical):
   #:                       TYPE NAME                    SIZE       IDENTIFIER
   0:     FDisk_partition_scheme                        *32.0 GB    disk2
   1:                 DOS_FAT_32 MYUSB                   32.0 GB    disk2s1
```

## 2. Identify your USB drive
Look for:
- **External, physical** disks (usually `/dev/disk2` or `/dev/disk4`)
- The size should match your USB drive
- It might have a name like "MYUSB" or "UNTITLED"

## 3. Important: Unmount the disk first (don't eject)
Before writing with `dd`, you must unmount it:
```bash
diskutil unmountDisk /dev/disk2
```

## 4. Then use the raw disk device for faster writes
Instead of `/dev/disk2`, use `/dev/rdisk2` (the raw character device):
```bash
sudo dd if=~/Downloads/GhostBSD-25.02-R14.3p2.iso of=/dev/rdisk2 bs=1m
```

**Note:** 
- `bs=1m` works better on macOS (instead of `bs=10240`)
- If `1m` doesn't work, try `bs=1M`
- Make **absolutely sure** you have the correct disk - writing to the wrong one can erase your internal drive!

## Alternative: Use a safer GUI tool
If you're uncomfortable with `dd`, consider:
- **BalenaEtcher** - Free and user-friendly
- **Raspberry Pi Imager** - Also works for any ISO

Would you like help with any specific error message you're getting?

