import assert from "node:assert/strict";
import test from "node:test";
import { CUSTOM_FIELD_TYPES } from "./domain/custom-fields";
import {
  ALL_INDUSTRY_PRESETS,
  buildIndustryPresetFieldKey,
  getIndustryPreset,
} from "./industry-presets";

test("industry presets expose unique, valid, intentional configuration", () => {
  const presetIds = ALL_INDUSTRY_PRESETS.map((preset) => preset.id);
  assert.equal(new Set(presetIds).size, presetIds.length);

  for (const preset of ALL_INDUSTRY_PRESETS) {
    const stageKeys = preset.stages.map((stage) => stage.value);
    const sourceKeys = preset.sources.map((source) => source.value);
    const fieldKeys = preset.customFields.map(buildIndustryPresetFieldKey);

    assert.equal(new Set(stageKeys).size, stageKeys.length, `${preset.id} has duplicate stage keys`);
    assert.equal(new Set(sourceKeys).size, sourceKeys.length, `${preset.id} has duplicate source keys`);
    assert.equal(new Set(fieldKeys).size, fieldKeys.length, `${preset.id} has duplicate custom-field keys`);
    assert.ok(preset.leadPreviewFields.length > 0, `${preset.id} has no lead preview guidance`);

    for (const field of preset.customFields) {
      assert.ok(
        CUSTOM_FIELD_TYPES.includes(field.fieldType),
        `${preset.id}.${buildIndustryPresetFieldKey(field)} has an unsupported type`,
      );

      if (field.fieldType === "select" || field.fieldType === "multi_select") {
        assert.ok(field.options?.length, `${preset.id}.${buildIndustryPresetFieldKey(field)} has no options`);
        const optionValues = field.options?.map((option) => option.value) ?? [];
        assert.equal(
          new Set(optionValues).size,
          optionValues.length,
          `${preset.id}.${buildIndustryPresetFieldKey(field)} has duplicate option values`,
        );
      }
    }
  }
});

test("travel preset stores structured, filterable itinerary dates", () => {
  const preset = getIndustryPreset("travel");
  assert.ok(preset);

  const fields = new Map(
    preset.customFields.map((field) => [buildIndustryPresetFieldKey(field), field]),
  );

  assert.equal(fields.has("travel_dates"), false);
  assert.equal(fields.get("journey_type")?.fieldType, "select");
  assert.deepEqual(
    fields.get("journey_type")?.options?.map((option) => option.value),
    ["one_way", "return"],
  );

  for (const key of ["departure_date", "arrival_date", "return_date"]) {
    assert.equal(fields.get(key)?.fieldType, "date");
    assert.equal(fields.get(key)?.filterable, true);
  }

  assert.equal(fields.get("traveller_count")?.fieldType, "number");
  assert.equal(fields.get("journey_type")?.filterable, true);
});

test("preset examples remain deployment-neutral", () => {
  const serialized = JSON.stringify(ALL_INDUSTRY_PRESETS);

  for (const localeSpecificExample of [
    "Zillow",
    "Cars.com",
    "Avvo",
    "Blue Cross",
    "Aetna",
    "UnitedHealthcare",
    "Cigna",
    "Medicare",
    "Medicaid",
    "Lekki",
    "Paris, France",
    "TechCorp",
    "Acme Distribution",
    "$5,000",
  ]) {
    assert.equal(
      serialized.includes(localeSpecificExample),
      false,
      `preset catalog still contains locale-specific example: ${localeSpecificExample}`,
    );
  }
});
