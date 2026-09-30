import { describe, expect, test } from "bun:test";
import { parseTimeInput } from "./timeInput";
describe("clock entry", () => {
  test.each([
    ["10", "10:00"],
    ["1015", "10:15"],
    ["10:15", "10:15"],
    ["10.15am", "10:15"],
    ["9pm", "21:00"],
    ["12am", "00:00"],
    ["12pm", "12:00"],
    ["", ""],
    ["  ", ""],
    ["24:00", null],
    ["1260", null],
    ["0pm", null],
    ["13am", null],
    ["abc", null],
  ])("%s becomes %s", (input, expected) => {
    expect(parseTimeInput(input)).toBe(expected);
  });
});
