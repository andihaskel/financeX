import { describe, expect, it } from "vitest";

import { bodyFromBullets, bulletsEqual, bulletsFromBody } from "@/lib/month/note-bullets";

describe("note bullets", () => {
  it("parses lines and strips leading markers", () => {
    expect(bulletsFromBody("- trip\n• gift\n* tax")).toEqual(["trip", "gift", "tax"]);
  });

  it("returns one empty bullet for blank body", () => {
    expect(bulletsFromBody("")).toEqual([""]);
  });

  it("serializes non-empty bullets", () => {
    expect(bodyFromBullets(["  trip ", "", "gift"])).toBe("trip\ngift");
  });

  it("compares by serialized body", () => {
    expect(bulletsEqual(["a", "b"], ["a", "", "b "])).toBe(true);
    expect(bulletsEqual(["a"], ["b"])).toBe(false);
  });
});
