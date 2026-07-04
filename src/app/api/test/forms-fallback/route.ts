import { NextResponse } from "next/server";
import { listForms, listFormFields, listFormSubmissions, listFormRules } from "@/lib/crm/form-builder-store";

export const dynamic = "force-dynamic";

export async function GET() {
  const results: Record<string, unknown> = {};
  
  try {
    const forms = await listForms();
    results.listForms = { success: true, count: forms.length };
  } catch (error) {
    results.listForms = { success: false, error: error instanceof Error ? error.message : String(error) };
  }
  
  try {
    const fields = await listFormFields("test-form-id");
    results.listFormFields = { success: true, count: fields.length };
  } catch (error) {
    results.listFormFields = { success: false, error: error instanceof Error ? error.message : String(error) };
  }
  
  try {
    const submissions = await listFormSubmissions("test-form-id");
    results.listFormSubmissions = { success: true, count: submissions.length };
  } catch (error) {
    results.listFormSubmissions = { success: false, error: error instanceof Error ? error.message : String(error) };
  }
  
  try {
    const rules = await listFormRules("test-form-id");
    results.listFormRules = { success: true, count: rules.length };
  } catch (error) {
    results.listFormRules = { success: false, error: error instanceof Error ? error.message : String(error) };
  }
  
  return NextResponse.json(results);
}
