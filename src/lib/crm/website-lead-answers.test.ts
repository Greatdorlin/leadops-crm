import assert from "node:assert/strict";
import test from "node:test";
import { extractWebsiteLeadAnswers } from "@/lib/crm/website-lead-answers";

test("website lead answers include olevel year and conditional other qualification", () => {
  const answers = extractWebsiteLeadAnswers({
    source: "website_form",
    sourcePayload: {
      answers: {
        nigeriaState: "FCT Abuja",
        highestQualification: "Other",
        highestQualificationOther: "HND",
        degreeClass: "Second Class Lower",
        graduationYear: "2021",
        olevelCompletionYear: "2015",
        passportStatus: "Yes",
      },
    },
  });

  assert.deepEqual(
    answers.map((entry) => [entry.key, entry.value]),
    [
      ["nigeriaState", "FCT Abuja"],
      ["highestQualification", "Other"],
      ["highestQualificationOther", "HND"],
      ["degreeClass", "Second Class Lower"],
      ["graduationYear", "2021"],
      ["olevelCompletionYear", "2015"],
      ["passportStatus", "Yes"],
    ],
  );
});

