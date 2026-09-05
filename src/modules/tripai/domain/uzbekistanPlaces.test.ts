import { describe, expect, it } from "vitest";
import {
  foldUz,
  isAmbiguousDestinationPrompt,
  matchLocalPlace,
  matchPlaceCity,
  matchUzUnit,
  namedCatalogCity,
} from "./uzbekistanPlaces";
import { UZ_LOCAL_PLACES } from "./uzbekistanLocalPlaces";
import { UZ_UNITS } from "./uzbekistanUnits";

const catalog = ["Samarqand", "Buxoro", "Xiva", "Toshkent", "Zomin", "Jizzax"];

describe("foldUz", () => {
  it("strips apostrophes so Farg'ona matches fargona", () => {
    expect(foldUz("Farg'ona")).toBe("fargona");
  });
});

describe("matchPlaceCity", () => {
  it("recognizes tuman and viloyat names", () => {
    expect(matchPlaceCity("Urgut")).toBe("Samarqand");
    expect(matchPlaceCity("Shahrixon")).toBe("Andijon");
    expect(matchPlaceCity("Namangan")).toBe("Namangan");
    expect(matchPlaceCity("Shahrisabz")).toBe("Qarshi");
    expect(matchPlaceCity("Nukus")).toBe("Nukus");
  });
});

describe("namedCatalogCity", () => {
  it("only returns cities that exist in the hotel catalog", () => {
    expect(namedCatalogCity("Urgutga", catalog)).toBe("Samarqand");
    expect(namedCatalogCity("Farg'ona vodiysi", catalog)).toBe("");
    expect(namedCatalogCity("Zomin tog'lariga", catalog)).toBe("Zomin");
  });
});

describe("matchLocalPlace (section 2)", () => {
  it("has Samarqand and Buxoro rows", () => {
    expect(
      UZ_LOCAL_PLACES.filter((p) => p.region === "Samarqand viloyati").length,
    ).toBeGreaterThanOrEqual(14);
    expect(
      UZ_LOCAL_PLACES.filter((p) => p.region === "Buxoro viloyati").length,
    ).toBeGreaterThanOrEqual(14);
    expect(
      UZ_LOCAL_PLACES.filter((p) => p.region === "Xorazm viloyati").length,
    ).toBeGreaterThanOrEqual(14);
    expect(
      UZ_LOCAL_PLACES.filter((p) => p.region === "Jizzax viloyati").length,
    ).toBeGreaterThanOrEqual(14);
    expect(
      UZ_LOCAL_PLACES.filter((p) => p.region.startsWith("Toshkent")).length,
    ).toBeGreaterThanOrEqual(14);
    expect(
      UZ_LOCAL_PLACES.filter((p) => p.region === "Farg'ona viloyati").length,
    ).toBeGreaterThanOrEqual(14);
    expect(
      UZ_LOCAL_PLACES.filter((p) => p.region === "Andijon viloyati").length,
    ).toBeGreaterThanOrEqual(14);
    expect(
      UZ_LOCAL_PLACES.filter((p) => p.region === "Namangan viloyati").length,
    ).toBeGreaterThanOrEqual(14);
    expect(
      UZ_LOCAL_PLACES.filter((p) => p.region === "Sirdaryo viloyati").length,
    ).toBeGreaterThanOrEqual(8);
    expect(
      UZ_LOCAL_PLACES.filter((p) => p.region === "Navoiy viloyati").length,
    ).toBeGreaterThanOrEqual(14);
    expect(
      UZ_LOCAL_PLACES.filter((p) => p.region === "Qashqadaryo viloyati").length,
    ).toBeGreaterThanOrEqual(14);
    expect(
      UZ_LOCAL_PLACES.filter((p) => p.region === "Surxondaryo viloyati").length,
    ).toBeGreaterThanOrEqual(14);
    expect(
      UZ_LOCAL_PLACES.filter((p) => p.region === "Qoraqalpog'iston Respublikasi")
        .length,
    ).toBeGreaterThanOrEqual(14);
  });

  it("maps Urgut, Chor-Chinor and Hazrati Dovud onto Samarqand", () => {
    expect(matchLocalPlace("Urgutga")?.name_uz).toMatch(/Urgut/);
    expect(matchLocalPlace("Chor-Chinor")?.name_uz).toBe("Chor-Chinor");
    expect(matchPlaceCity("Hazrati Dovud gori")).toBe("Samarqand");
    expect(namedCatalogCity("Narpay", catalog)).toBe("Samarqand");
    expect(namedCatalogCity("Paxtachi", catalog)).toBe("Samarqand");
  });

  it("maps G'ijduvon, Labi Hovuz and Chor-Bakr onto Buxoro", () => {
    expect(matchPlaceCity("Gijduvon")).toBe("Buxoro");
    expect(matchLocalPlace("Labi Hovuz")?.name_uz).toBe("Labi Hovuz");
    expect(namedCatalogCity("Chor-Bakr", catalog)).toBe("Buxoro");
    expect(namedCatalogCity("Bahouddin Naqshband", catalog)).toBe("Buxoro");
  });

  it("maps Ichan-Qal'a, Kalta Minor and Urganch onto Xiva", () => {
    expect(matchLocalPlace("Ichan-Qala")?.name_uz).toMatch(/Ichan/);
    expect(matchPlaceCity("Kalta Minor")).toBe("Xiva");
    expect(namedCatalogCity("Urganch", catalog)).toBe("Xiva");
    expect(namedCatalogCity("Hazorasp", catalog)).toBe("Xiva");
  });

  it("maps Zomin park to Zomin and Forish / Aydarko'l to Jizzax", () => {
    expect(matchPlaceCity("Zomin milliy bogi")).toBe("Zomin");
    expect(matchLocalPlace("Suffa plato")?.name_uz).toMatch(/Suffa/);
    expect(namedCatalogCity("Forish", catalog)).toBe("Jizzax");
    expect(namedCatalogCity("Aydarkol", catalog)).toBe("Jizzax");
    expect(namedCatalogCity("Baxmal", catalog)).toBe("Zomin");
  });

  it("maps Chimyon, Chorvoq and Chorsu onto Toshkent", () => {
    expect(matchPlaceCity("Chimgan")).toBe("Toshkent");
    expect(namedCatalogCity("Chorvoq", catalog)).toBe("Toshkent");
    expect(matchLocalPlace("Chorsu")?.name_uz).toMatch(/Chorsu/);
    expect(namedCatalogCity("Amirsoy", catalog)).toBe("Toshkent");
  });

  it("recognizes Rishton, Qo'qon and Shohimardon as Farg'ona without inventing catalog hotels", () => {
    expect(matchLocalPlace("Rishton")?.name_uz).toMatch(/Rishton/);
    expect(matchPlaceCity("Kokand")).toBe("Farg'ona");
    expect(matchLocalPlace("Shahimardan")?.name_uz).toBe("Shohimardon");
    expect(namedCatalogCity("Margilan", catalog)).toBe("");
    expect(namedCatalogCity("Rishton", [...catalog, "Farg'ona"])).toBe("Farg'ona");
  });

  it("recognizes Shahrixon, Asaka and Bobur as Andijon without inventing catalog hotels", () => {
    expect(matchPlaceCity("Shahrixon")).toBe("Andijon");
    expect(matchLocalPlace("Asaka")?.name_uz).toBe("Asaka");
    expect(matchLocalPlace("Bobur bogi")?.name_uz).toMatch(/Bobur/);
    expect(namedCatalogCity("Xonobod", catalog)).toBe("");
    expect(namedCatalogCity("Andijan", [...catalog, "Andijon"])).toBe("Andijon");
  });

  it("recognizes Chortoq, Chust and Axsikent as Namangan without inventing catalog hotels", () => {
    expect(matchPlaceCity("Chartak")).toBe("Namangan");
    expect(matchLocalPlace("Chust")?.name_uz).toBe("Chust");
    expect(matchLocalPlace("Axsikent")?.name_uz).toBe("Axsikent");
    expect(namedCatalogCity("Kosonsoy", catalog)).toBe("");
    expect(namedCatalogCity("Namangan", [...catalog, "Namangan"])).toBe(
      "Namangan",
    );
  });

  it("recognizes Yangiyer and Sardoba as Guliston without inventing catalog hotels", () => {
    expect(matchPlaceCity("Yangiyer")).toBe("Guliston");
    expect(matchLocalPlace("Sardoba suv ombori")?.name_uz).toMatch(/Sardoba/);
    expect(matchPlaceCity("Khavast")).toBe("Guliston");
    expect(namedCatalogCity("Gulistan", catalog)).toBe("");
    expect(namedCatalogCity("Sirdaryo", [...catalog, "Guliston"])).toBe(
      "Guliston",
    );
  });

  it("recognizes Nurota, Sentob and Sarmishsoy as Navoiy without stealing Samarqand Nurobod", () => {
    expect(matchPlaceCity("Nurata")).toBe("Navoiy");
    expect(matchLocalPlace("Sentob")?.name_uz).toMatch(/Sentob/);
    expect(matchPlaceCity("Sarmishsay")).toBe("Navoiy");
    expect(matchPlaceCity("Nurobod")).toBe("Samarqand");
    expect(namedCatalogCity("Karmana", catalog)).toBe("");
    expect(namedCatalogCity("Navoi", [...catalog, "Navoiy"])).toBe("Navoiy");
  });

  it("recognizes Shahrisabz and Oqsaroy as Qarshi without stealing Kosonsoy or Hazrati Imom", () => {
    expect(matchPlaceCity("Shakhrisabz")).toBe("Qarshi");
    expect(matchLocalPlace("Oqsaroy")?.name_uz).toBe("Oqsaroy");
    expect(matchPlaceCity("Langar ota")).toBe("Qarshi");
    expect(matchPlaceCity("Kosonsoy")).toBe("Namangan");
    expect(matchLocalPlace("Hazrati Imom")?.name_uz).toMatch(/Hazrati Imom/);
    expect(namedCatalogCity("Shahrisabz", catalog)).toBe("");
    expect(namedCatalogCity("Nasaf", [...catalog, "Qarshi"])).toBe("Qarshi");
  });

  it("recognizes Termiz, Fayoztepa and Boysun without inventing catalog hotels", () => {
    expect(matchPlaceCity("Termez")).toBe("Termiz");
    expect(matchLocalPlace("Fayoztepa")?.name_uz).toBe("Fayoztepa");
    expect(matchPlaceCity("Baysun")).toBe("Termiz");
    expect(matchLocalPlace("Sangardak")?.name_uz).toMatch(/Sangardak/);
    expect(namedCatalogCity("Denov", catalog)).toBe("");
    expect(namedCatalogCity("Kampirtepa", [...catalog, "Termiz"])).toBe("Termiz");
  });

  it("recognizes Mo'ynoq and Savitskiy as Nukus; Ayozqala stays Xiva", () => {
    expect(matchPlaceCity("Muynak")).toBe("Nukus");
    expect(matchLocalPlace("Savitskiy")?.name_uz).toMatch(/Savitskiy/);
    expect(matchPlaceCity("Chilpik")).toBe("Nukus");
    expect(matchPlaceCity("Ayaz kala")).toBe("Xiva");
    expect(matchPlaceCity("Qirqqiz")).toBe("Termiz");
    expect(namedCatalogCity("Nukus", catalog)).toBe("");
    expect(namedCatalogCity("Moynoq", [...catalog, "Nukus"])).toBe("Nukus");
  });
});

describe("matchUzUnit", () => {
  it("loads all 14 admin units", () => {
    expect(UZ_UNITS).toHaveLength(14);
  });

  it("maps Farg'ona vodiysi to the viloyat without a hotel hub", () => {
    const unit = matchUzUnit("Farg'ona vodiysi");
    expect(unit?.id).toBe("fargona_viloyati");
    expect(unit?.hotel_hub).toBeNull();
    expect(unit?.nearest_hub).toBe("Toshkent");
  });

  it("prefers Toshkent viloyati over the city when the viloyat is named", () => {
    expect(matchUzUnit("Toshkent viloyati")?.id).toBe("toshkent_viloyati");
    expect(matchUzUnit("Toshkent")?.id).toBe("toshkent_shahri");
  });
});

describe("isAmbiguousDestinationPrompt", () => {
  it("treats Silk Road theme without a city as ambiguous", () => {
    expect(isAmbiguousDestinationPrompt("Tarixiy shaharlar", catalog)).toBe(
      true,
    );
    expect(
      isAmbiguousDestinationPrompt("Samarqand tarixiy", catalog),
    ).toBe(false);
  });
});
