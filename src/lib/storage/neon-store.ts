import type { IntegrationProvider, LeadPriority } from "@/lib/crm/types";
import type { AdCampaignMetricListFilters, AdCampaignMetricUpsertInput, DashboardTrendPoint, CrmUserUpsertInput, ExternalLeadUpsertInput, ExternalLeadUpsertResult, IntegrationUpsertInput, LeadDuplicateLookupInput, LeadDuplicateListInput, LeadDistributionReport, LeadEventCreateInput, LeadEventCountFilters, LeadListFilters, LeadNoteCreateInput, LeadProfileUpdateInput, LeadSourcePayloadCreateInput, LeadTaskCreateInput, LeadTaskListFilters, LeadTaskQueueRecord, LeadWorkflowUpdateInput, SyncJobCreateInput, SyncJobListFilters, SyncJobUpdateInput } from "./types";

import { getDb, type DatabaseExecutor } from '@/lib/db/client';
import type { LeadStorage } from './types';
import { getById, list, countLeads } from './neon-reads';
import { upsertExternalLead, createExternalLead } from './neon-intake';
import { findDuplicateLead, listDuplicateLeads } from './neon-duplicates';
import { addLeadEvent, listLeadEvents, countLeadEvents, addLeadNote, listLeadNotes, getLeadNoteCounts } from './neon-activity';
import { addLeadTask, listLeadTasks, listLeadTaskQueue, getLeadTaskById, completeLeadTask } from './neon-tasks';
import { assignLead, assignLeadOwners } from './neon-assignments';
import { updateLeadWorkflow } from './neon-workflow';
import { updateLeadProfile } from './neon-profile';
import { softDeleteLead, restoreLead, permanentlyDeleteLead, updateLeadPriority } from './neon-lifecycle';
import { saveSourcePayload, markPayloadProcessing, markPayloadProcessed, markPayloadFailed, listFailedPayloads, retrySourcePayload } from './neon-payloads';
import { createSyncJob, updateSyncJob, listSyncJobs } from './neon-sync';
import { upsertAdCampaignMetric, listAdCampaignMetrics } from './neon-metrics';
import { getDashboardStats, getDashboardTrend } from './neon-dashboard';
import { getSalesPipelineAggregate } from './neon-pipeline';
import { getTeamPerformance } from './neon-team';
import { getSourceReport, getLeadDistributionReport, getCampaignReport, countGoogleAdsCampaignLeads } from './neon-reports';
import { listCrmUsers, getCrmUserByEmail, getCrmUserById, upsertCrmUser, setCrmUserActive } from './neon-users';
import { listIntegrations, getIntegration, upsertIntegration } from './neon-integrations';

/** Postgres storage facade. Domain modules retain the shared transaction executor. */
export class NeonLeadStore implements LeadStorage {
  constructor(private readonly getDatabase: () => DatabaseExecutor = getDb) {}

  getById(id: string) {
    return getById.call(this, this.getDatabase, id);
  }

  list(filters: LeadListFilters = {}) {
    return list.call(this, this.getDatabase, filters);
  }

  countLeads(filters: LeadListFilters = {}) {
    return countLeads.call(this, this.getDatabase, filters);
  }

  upsertExternalLead(input: ExternalLeadUpsertInput): Promise<ExternalLeadUpsertResult> {
    return upsertExternalLead.call(this, this.getDatabase, input);
  }

  createExternalLead(input: ExternalLeadUpsertInput) {
    return createExternalLead.call(this, this.getDatabase, input);
  }

  findDuplicateLead(input: LeadDuplicateLookupInput) {
    return findDuplicateLead.call(this, this.getDatabase, input);
  }

  listDuplicateLeads(input: LeadDuplicateListInput) {
    return listDuplicateLeads.call(this, this.getDatabase, input);
  }

  addLeadEvent(input: LeadEventCreateInput) {
    return addLeadEvent.call(this, this.getDatabase, input);
  }

  listLeadEvents(leadId: string) {
    return listLeadEvents.call(this, this.getDatabase, leadId);
  }

  countLeadEvents(filters: LeadEventCountFilters = {}) {
    return countLeadEvents.call(this, this.getDatabase, filters);
  }

  addLeadNote(input: LeadNoteCreateInput) {
    return addLeadNote.call(this, this.getDatabase, input);
  }

  listLeadNotes(leadId: string) {
    return listLeadNotes.call(this, this.getDatabase, leadId);
  }

  getLeadNoteCounts(leadIds: string[]) {
    return getLeadNoteCounts.call(this, this.getDatabase, leadIds);
  }

  addLeadTask(input: LeadTaskCreateInput) {
    return addLeadTask.call(this, this.getDatabase, input);
  }

  listLeadTasks(filters: LeadTaskListFilters = {}) {
    return listLeadTasks.call(this, this.getDatabase, filters);
  }

  listLeadTaskQueue(filters: LeadTaskListFilters = {}): Promise<LeadTaskQueueRecord[]> {
    return listLeadTaskQueue.call(this, this.getDatabase, filters);
  }

  getLeadTaskById(taskId: string) {
    return getLeadTaskById.call(this, this.getDatabase, taskId);
  }

  completeLeadTask(taskId: string, completedBy?: string | null) {
    return completeLeadTask.call(this, this.getDatabase, taskId, completedBy);
  }

  assignLead(id: string, assignedTo: string | null, changedBy?: string | null) {
    return assignLead.call(this, this.getDatabase, id, assignedTo, changedBy);
  }

  assignLeadOwners(id: string, assignedToList: string[], changedBy?: string | null) {
    return assignLeadOwners.call(this, this.getDatabase, id, assignedToList, changedBy);
  }

  updateLeadWorkflow(id: string, input: LeadWorkflowUpdateInput, changedBy?: string | null) {
    return updateLeadWorkflow.call(this, this.getDatabase, id, input, changedBy);
  }

  updateLeadProfile(id: string, input: LeadProfileUpdateInput, changedBy?: string | null) {
    return updateLeadProfile.call(this, this.getDatabase, id, input, changedBy);
  }

  softDeleteLead(id: string, deletedBy?: string | null) {
    return softDeleteLead.call(this, this.getDatabase, id, deletedBy);
  }

  restoreLead(id: string, restoredBy?: string | null) {
    return restoreLead.call(this, this.getDatabase, id, restoredBy);
  }

  permanentlyDeleteLead(id: string) {
    return permanentlyDeleteLead.call(this, this.getDatabase, id);
  }

  updateLeadPriority(id: string, priority: LeadPriority, changedBy?: string | null) {
    return updateLeadPriority.call(this, this.getDatabase, id, priority, changedBy);
  }

  saveSourcePayload(input: LeadSourcePayloadCreateInput) {
    return saveSourcePayload.call(this, this.getDatabase, input);
  }

  markPayloadProcessing(id: string) {
    return markPayloadProcessing.call(this, this.getDatabase, id);
  }

  markPayloadProcessed(id: string) {
    return markPayloadProcessed.call(this, this.getDatabase, id);
  }

  markPayloadFailed(id: string, errorMessage: string) {
    return markPayloadFailed.call(this, this.getDatabase, id, errorMessage);
  }

  listFailedPayloads(source?: string) {
    return listFailedPayloads.call(this, this.getDatabase, source);
  }

  retrySourcePayload(id: string) {
    return retrySourcePayload.call(this, this.getDatabase, id);
  }

  createSyncJob(input: SyncJobCreateInput) {
    return createSyncJob.call(this, this.getDatabase, input);
  }

  updateSyncJob(id: string, input: SyncJobUpdateInput) {
    return updateSyncJob.call(this, this.getDatabase, id, input);
  }

  listSyncJobs(filters: SyncJobListFilters = {}) {
    return listSyncJobs.call(this, this.getDatabase, filters);
  }

  upsertAdCampaignMetric(input: AdCampaignMetricUpsertInput) {
    return upsertAdCampaignMetric.call(this, this.getDatabase, input);
  }

  listAdCampaignMetrics(filters: AdCampaignMetricListFilters = {}) {
    return listAdCampaignMetrics.call(this, this.getDatabase, filters);
  }

  getDashboardStats(filters: LeadListFilters = {}) {
    return getDashboardStats.call(this, this.getDatabase, filters);
  }

  getDashboardTrend(filters: LeadListFilters = {}, days = 14): Promise<DashboardTrendPoint[]> {
    return getDashboardTrend.call(this, this.getDatabase, filters, days);
  }

  getSalesPipelineAggregate(filters: LeadListFilters = {}) {
    return getSalesPipelineAggregate.call(this, this.getDatabase, filters);
  }

  getTeamPerformance(filters: LeadListFilters = {}) {
    return getTeamPerformance.call(this, this.getDatabase, filters);
  }

  getSourceReport(filters: LeadListFilters = {}) {
    return getSourceReport.call(this, this.getDatabase, filters);
  }

  getLeadDistributionReport(filters: LeadListFilters = {}): Promise<LeadDistributionReport> {
    return getLeadDistributionReport.call(this, this.getDatabase, filters);
  }

  getCampaignReport() {
    return getCampaignReport.call(this, this.getDatabase);
  }

  countGoogleAdsCampaignLeads(input: { campaignId: string; campaignName: string }) {
    return countGoogleAdsCampaignLeads.call(this, this.getDatabase, input);
  }

  listCrmUsers() {
    return listCrmUsers.call(this, this.getDatabase);
  }

  getCrmUserByEmail(email: string) {
    return getCrmUserByEmail.call(this, this.getDatabase, email);
  }

  getCrmUserById(id: string) {
    return getCrmUserById.call(this, this.getDatabase, id);
  }

  upsertCrmUser(input: CrmUserUpsertInput) {
    return upsertCrmUser.call(this, this.getDatabase, input);
  }

  setCrmUserActive(id: string, isActive: boolean) {
    return setCrmUserActive.call(this, this.getDatabase, id, isActive);
  }

  listIntegrations() {
    return listIntegrations.call(this, this.getDatabase);
  }

  getIntegration(provider: IntegrationProvider) {
    return getIntegration.call(this, this.getDatabase, provider);
  }

  upsertIntegration(input: IntegrationUpsertInput) {
    return upsertIntegration.call(this, this.getDatabase, input);
  }
}
