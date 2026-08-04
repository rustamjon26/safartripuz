import { describe, expect, it } from "vitest";
import {
  buildWeatherTip,
  formatTempLabel,
  toWeatherAdvice,
  weatherKindFromMain,
} from "./openWeather";

describe("formatTempLabel", () => {
  it("adds sign", () => {
    expect(formatTempLabel(12.4)).toBe("+12°C");
    expect(formatTempLabel(-3.6)).toBe("-4°C");
  });
});

describe("weatherKindFromMain", () => {
  it("maps OpenWeather mains", () => {
    expect(weatherKindFromMain("Clear")).toBe("sun");
    expect(weatherKindFromMain("Clouds")).toBe("cloud");
    expect(weatherKindFromMain("Rain")).toBe("rain");
    expect(weatherKindFromMain("Snow")).toBe("snow");
    expect(weatherKindFromMain("Mist")).toBe("wind");
  });
});

describe("buildWeatherTip / toWeatherAdvice", () => {
  it("mentions destination and temp", () => {
    const tip = buildWeatherTip({
      destination: "Zomin",
      tempC: 10,
      main: "Clouds",
      description: "bulutli",
    });
    expect(tip).toContain("Zomin");
    expect(tip).toContain("+10°C");
  });

  it("maps payload", () => {
    const advice = toWeatherAdvice(
      {
        weather: [{ main: "Clear", description: "ochiq osmon" }],
        main: { temp: 27.2 },
      },
      "Samarqand",
    );
    expect(advice.tempLabel).toBe("+27°C");
    expect(advice.kind).toBe("sun");
    expect(advice.tip).toContain("Samarqand");
  });
});
