import {
  SLOT_CATALOG,
  SLOT_INVENTORY_COUNT,
  SPECIAL_GAME_CATALOG,
  buildPremiumLobbySlides,
  getPremiumGameMedia,
  validatePremiumMediaProfile,
} from "@/data/premiumMedia";

describe("premium media coverage", () => {
  it("covers every slot and special game with a premium-ready media package", () => {
    expect(SLOT_CATALOG).toHaveLength(SLOT_INVENTORY_COUNT);

    const failures = [...SLOT_CATALOG, ...SPECIAL_GAME_CATALOG]
      .map((game) => {
        const profile = getPremiumGameMedia(game);
        return {
          id: game.id,
          validation: validatePremiumMediaProfile(profile),
        };
      })
      .filter(({ validation }) => !validation.ok);

    expect(failures).toEqual([]);
  });

  it("builds a lobby-ready premium showcase from the current slot floor", () => {
    const slides = buildPremiumLobbySlides(SLOT_CATALOG);

    expect(slides).toHaveLength(6);
    slides.forEach((slide) => {
      expect(slide.img).toBeTruthy();
      expect(slide.title).toBeTruthy();
      expect(slide.sub).toBeTruthy();
      expect(slide.accent).toBeTruthy();
    });
  });
});
