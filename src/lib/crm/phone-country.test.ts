import assert from "node:assert/strict";
import test from "node:test";
import { getPhoneCountryProfile, isValidInternationalPhone } from "./phone-country";

test("uses country-aware dialing examples without assuming Nigeria", () => {
  assert.equal(getPhoneCountryProfile("Nigeria").dialCode, "+234");
  assert.equal(getPhoneCountryProfile("Ghana").dialCode, "+233");
  assert.equal(getPhoneCountryProfile("Unknown").dialCode, "+");
});

test("accepts practical international phone formatting", () => {
  assert.equal(isValidInternationalPhone("+234 (801) 234-5678"), true);
  assert.equal(isValidInternationalPhone("+44 7700 900123"), true);
  assert.equal(isValidInternationalPhone("call me"), false);
  assert.equal(isValidInternationalPhone("123"), false);
});
