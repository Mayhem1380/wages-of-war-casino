"""Build a 4KB Atari 2600 NTSC ROM with a rainbow background kernel.

The generated image is a standard 4KB F8-style linear ROM mapped at $F000.
It can be opened by Stella, Javatari, or compatible Atari 2600 emulators.
"""

from pathlib import Path

ROM_SIZE = 4096
RESET_VECTOR = 0xF000


def build_rom() -> bytes:
    rom = bytearray(ROM_SIZE)

    # 6502 code mapped at $F000. Each visible scanline updates COLUBK after
    # WSYNC, producing horizontal color bands across the 192-line display.
    code = bytes(
        [
            0x78,  # SEI
            0xD8,  # CLD
            0xA2,
            0xFF,  # LDX #$FF
            0x9A,  # TXS
            0xA9,
            0x00,  # LDA #$00
            0x95,
            0x00,  # Clear zero-page RAM/TIA mirrors
            0xCA,  # DEX
            0xD0,
            0xF7,  # BNE clear_loop
            # frame_loop:
            0xA9,
            0x02,  # LDA #$02
            0x8D,
            0x00,
            0x80,  # STA VSYNC
            0x8D,
            0x02,
            0x80,  # STA WSYNC
            0x8D,
            0x02,
            0x80,  # STA WSYNC
            0x8D,
            0x02,
            0x80,  # STA WSYNC
            0xA9,
            0x00,  # LDA #$00
            0x8D,
            0x00,
            0x80,  # STA VSYNC
            # 37-line vertical blank.
            0xA2,
            0x25,  # LDX #37
            0x8D,
            0x02,
            0x80,  # vblank_loop: STA WSYNC
            0xCA,  # DEX
            0xD0,
            0xF9,  # BNE vblank_loop
            0x8D,
            0x01,
            0x80,  # STA VBLANK: enable video
            # 192-line visible kernel.
            0xA2,
            0xC0,  # LDX #192
            0x8D,
            0x02,
            0x80,  # visible_loop: STA WSYNC
            0x8A,  # TXA
            0x29,
            0xFC,  # AND #$FC: four-line color bands
            0x8D,
            0x09,
            0x80,  # STA COLUBK
            0xCA,  # DEX
            0xD0,
            0xF5,  # BNE visible_loop
            # 30-line overscan.
            0xA9,
            0x02,  # LDA #$02
            0x8D,
            0x01,
            0x80,  # STA VBLANK
            0xA2,
            0x1E,  # LDX #30
            0x8D,
            0x02,
            0x80,  # overscan_loop: STA WSYNC
            0xCA,  # DEX
            0xD0,
            0xF9,  # BNE overscan_loop
            0x4C,
            0x0D,
            0xF0,  # JMP frame_loop
        ]
    )
    rom[: len(code)] = code

    # 4KB Atari 2600 images store vectors in the final four bytes.
    rom[-4:] = RESET_VECTOR.to_bytes(2, "little") * 2
    return bytes(rom)


def main() -> None:
    output = Path(__file__).with_name("rainbow.bin")
    output.write_bytes(build_rom())
    print(f"Created {output} ({output.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
