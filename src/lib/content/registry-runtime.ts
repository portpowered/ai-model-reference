export * from "./registry-runtime.generated";
  conceptRecordSchema.parse(kvCacheConcept),
  conceptRecordSchema.parse(kvCacheQuantizationConcept),
  conceptRecordSchema.parse(logitConcept),
  conceptRecordSchema.parse(softmaxConcept),
  conceptRecordSchema.parse(entropyConcept),
  conceptRecordSchema.parse(temperatureConcept),
  conceptRecordSchema.parse(samplingOverviewConcept),
  conceptRecordSchema.parse(greedyDecodingConcept),
  conceptRecordSchema.parse(topKSamplingConcept),
  conceptRecordSchema.parse(topPSamplingConcept),
  conceptRecordSchema.parse(parameterConcept),
  conceptRecordSchema.parse(activationConcept),
  conceptRecordSchema.parse(activationQuantizationConcept),
  conceptRecordSchema.parse(computationalGraphConcept),
  conceptRecordSchema.parse(gradientConcept),
  conceptRecordSchema.parse(backpropagationConcept),
  conceptRecordSchema.parse(lossFunctionConcept),
  conceptRecordSchema.parse(optimizerStateConcept),
  conceptRecordSchema.parse(modelConcept),
  conceptRecordSchema.parse(architectureConcept),
  conceptRecordSchema.parse(moduleConcept),
  conceptRecordSchema.parse(componentConcept),
  conceptRecordSchema.parse(modalityConcept),
  conceptRecordSchema.parse(foundationModelConcept),
  conceptRecordSchema.parse(generativeModelConcept),
  conceptRecordSchema.parse(discriminativeModelConcept),
  conceptRecordSchema.parse(dynamicQuantizationConcept),
  conceptRecordSchema.parse(representationConcept),
  conceptRecordSchema.parse(patchConcept),
  conceptRecordSchema.parse(latentConcept),
  conceptRecordSchema.parse(latentSpaceConcept),
  conceptRecordSchema.parse(encoderConcept),
  conceptRecordSchema.parse(decodeConcept),
  conceptRecordSchema.parse(decoderConcept),
  conceptRecordSchema.parse(encoderDecoderConcept),
  conceptRecordSchema.parse(autoregressiveGenerationConcept),
  conceptRecordSchema.parse(prefillConcept),
  conceptRecordSchema.parse(prefillDecodeSplitConcept),
  conceptRecordSchema.parse(denoisingGenerationConcept),
  conceptRecordSchema.parse(conditioningConcept),
  conceptRecordSchema.parse(contextExtensionConcept),
  conceptRecordSchema.parse(contextWindowConcept),
  conceptRecordSchema.parse(alignmentConcept),
  conceptRecordSchema.parse(batchNormConcept),
  conceptRecordSchema.parse(modelCapacityConcept),
  conceptRecordSchema.parse(overfittingConcept),
  conceptRecordSchema.parse(generalizationConcept),
  conceptRecordSchema.parse(groupNormConcept),
  conceptRecordSchema.parse(pageSpecWorkflowSampleConcept),
  conceptRecordSchema.parse(perplexityConcept),
  conceptRecordSchema.parse(scalingLawConcept),
  conceptRecordSchema.parse(emergentBehaviorConcept),
  conceptRecordSchema.parse(absolutePositionalEmbeddingsConcept),
  conceptRecordSchema.parse(learnedPositionalEmbeddingsConcept),
  conceptRecordSchema.parse(longropeConcept),
  conceptRecordSchema.parse(feedForwardNetworkConcept),
  conceptRecordSchema.parse(standardFfnConcept),
  conceptRecordSchema.parse(mixtureOfExpertsConcept),
  conceptRecordSchema.parse(reluConcept),
  conceptRecordSchema.parse(leakyReluConcept),
  conceptRecordSchema.parse(siluConcept),
  conceptRecordSchema.parse(swigluConcept),
  conceptRecordSchema.parse(layerNormConcept),
  conceptRecordSchema.parse(normalizationConcept),
  conceptRecordSchema.parse(qkNormConcept),
  conceptRecordSchema.parse(rmsnormConcept),
  conceptRecordSchema.parse(alibiConcept),
  conceptRecordSchema.parse(calibrationConcept),
  conceptRecordSchema.parse(positionalEncodingsConcept),
  conceptRecordSchema.parse(postTrainingQuantizationConcept),
  conceptRecordSchema.parse(quantizationConcept),
  conceptRecordSchema.parse(quantizationAwareTrainingConcept),
  conceptRecordSchema.parse(relativePositionBiasConcept),
  conceptRecordSchema.parse(t5RelativePositionBiasConcept),
  conceptRecordSchema.parse(nopeConcept),
  conceptRecordSchema.parse(ntkAwareRopeScalingConcept),
  conceptRecordSchema.parse(residualConnectionConcept),
  conceptRecordSchema.parse(skipConnectionConcept),
  conceptRecordSchema.parse(specialTokensConcept),
  conceptRecordSchema.parse(positionalInterpolationConcept),
  conceptRecordSchema.parse(ropeConcept),
  conceptRecordSchema.parse(superhotRopeConcept),
  conceptRecordSchema.parse(sinusoidalPositionalEmbeddingsConcept),
  conceptRecordSchema.parse(transformerArchitectureConcept),
  conceptRecordSchema.parse(transformerConcept),
  conceptRecordSchema.parse(weightOnlyQuantizationConcept),
  conceptRecordSchema.parse(whyFourBitModelsAreNotExactlyFourXFasterConcept),
  conceptRecordSchema.parse(diffusionModelConcept),
  conceptRecordSchema.parse(multimodalModelConcept),
  conceptRecordSchema.parse(whyLongContextIsHardConcept),
  conceptRecordSchema.parse(worldModelConcept),
  conceptRecordSchema.parse(yarnConcept),
];

const modelRecords: ModelRecord[] = [
  modelRecordSchema.parse(gpt3Model),
  modelRecordSchema.parse(deepseekV4ProModel),
  modelRecordSchema.parse(deepseekV4FlashModel),
];
const paperRecords: PaperRecord[] = [paperRecordSchema.parse(deepseekV4Paper)];
const trainingRegimeRecords: TrainingRegimeRecord[] = [
  trainingRegimeRecordSchema.parse(onPolicyDistillationRegime),
  trainingRegimeRecordSchema.parse(specialistTrainingRegime),
  trainingRegimeRecordSchema.parse(fp4QuantizationAwareTrainingRegime),
];
const systemRecords: SystemRecord[] = [
  systemRecordSchema.parse(onDiskKvCacheSystem),
  systemRecordSchema.parse(expertParallelOverlapSystem),
];
const datasetRecords: DatasetRecord[] = [
  datasetRecordSchema.parse(deepseekV4SpecialistCorpus),
];
const organizationRecords: OrganizationRecord[] = [
  organizationRecordSchema.parse(deepseekAiOrganization),
];

const citationRecords: CitationRecord[] = [
  citationRecordSchema.parse(attentionIsAllYouNeedCitation),
  citationRecordSchema.parse(awqCitation),
  citationRecordSchema.parse(bertPreTrainingCitation),
  citationRecordSchema.parse(brownGpt3Citation),
  citationRecordSchema.parse(bpeCitation),
  citationRecordSchema.parse(chenPositionalInterpolationCitation),
  citationRecordSchema.parse(deepseekV2MlaPaperCitation),
  citationRecordSchema.parse(deepseekV4PaperCitation),
  citationRecordSchema.parse(dingLongropeCitation),
  citationRecordSchema.parse(goodfellowDeepLearningCitation),
  citationRecordSchema.parse(gqaPaperCitation),
  citationRecordSchema.parse(kaiokendevSuperhotCitation),
  citationRecordSchema.parse(kaplanScalingLawsCitation),
  citationRecordSchema.parse(katharopoulosLinearAttentionPaperCitation),
  citationRecordSchema.parse(kingmaAdamCitation),
  citationRecordSchema.parse(kiviKvCacheQuantizationCitation),
  citationRecordSchema.parse(kudoSentencePieceCitation),
  citationRecordSchema.parse(pengYarnCitation),
  citationRecordSchema.parse(pressAlibiCitation),
  citationRecordSchema.parse(qloraCitation),
  citationRecordSchema.parse(quantizationIntegerOnlyInferenceCitation),
  citationRecordSchema.parse(raffelT5Citation),
  citationRecordSchema.parse(shazeerMqaPaperCitation),
  citationRecordSchema.parse(smoothquantCitation),
  citationRecordSchema.parse(suRoformerRopeCitation),
  citationRecordSchema.parse(weiEmergentAbilitiesCitation),
];

const modulesById = new Map(moduleRecords.map((record) => [record.id, record]));
const conceptsById = new Map(
  conceptRecords.map((record) => [record.id, record]),
);
const modelsById = new Map(modelRecords.map((record) => [record.id, record]));
const papersById = new Map(paperRecords.map((record) => [record.id, record]));
const trainingRegimesById = new Map(
  trainingRegimeRecords.map((record) => [record.id, record]),
);
const systemsById = new Map(systemRecords.map((record) => [record.id, record]));
const datasetsById = new Map(
  datasetRecords.map((record) => [record.id, record]),
);
const organizationsById = new Map(
  organizationRecords.map((record) => [record.id, record]),
);
const citationsById = new Map(
  citationRecords.map((record) => [record.id, record]),
);

type TaggedRegistryRecord =
  | ModuleRecord
  | ConceptRecord
  | ModelRecord
  | PaperRecord
  | TrainingRegimeRecord
  | SystemRecord
  | DatasetRecord
  | OrganizationRecord;

function getTaggedRecordById(
  registryId: string,
): TaggedRegistryRecord | undefined {
  return (
    modulesById.get(registryId) ??
    conceptsById.get(registryId) ??
    modelsById.get(registryId) ??
    papersById.get(registryId) ??
    trainingRegimesById.get(registryId) ??
    systemsById.get(registryId) ??
    datasetsById.get(registryId) ??
    organizationsById.get(registryId)
  );
}

/** Synchronous module lookup for client MDX components and tests. */
export function getModuleById(registryId: string): ModuleRecord | undefined {
  return modulesById.get(registryId);
}

/** Synchronous concept lookup for client MDX components and tests. */
export function getConceptById(registryId: string): ConceptRecord | undefined {
  return conceptsById.get(registryId);
}

/** Synchronous model lookup for docs components and tests. */
export function getModelById(registryId: string): ModelRecord | undefined {
  return modelsById.get(registryId);
}

export function getPaperById(registryId: string): PaperRecord | undefined {
  return papersById.get(registryId);
}

export function getTrainingRegimeById(
  registryId: string,
): TrainingRegimeRecord | undefined {
  return trainingRegimesById.get(registryId);
}

export function getSystemById(registryId: string): SystemRecord | undefined {
  return systemsById.get(registryId);
}

export function getDatasetById(registryId: string): DatasetRecord | undefined {
  return datasetsById.get(registryId);
}

export function getOrganizationById(
  registryId: string,
): OrganizationRecord | undefined {
  return organizationsById.get(registryId);
}

/** Synchronous citation lookup for source metadata and tests. */
export function getCitationById(
  registryId: string,
): CitationRecord | undefined {
  return citationsById.get(registryId);
}

export function listModuleRecords(): ModuleRecord[] {
  return [...moduleRecords];
}

export function listConceptRecords(): ConceptRecord[] {
  return [...conceptRecords];
}

export function listModelRecords(): ModelRecord[] {
  return [...modelRecords];
}

export function listPaperRecords(): PaperRecord[] {
  return [...paperRecords];
}

export function listTrainingRegimeRecords(): TrainingRegimeRecord[] {
  return [...trainingRegimeRecords];
}

export function listSystemRecords(): SystemRecord[] {
  return [...systemRecords];
}

/** Registry records used for derived related-document groups. */
export function listRelatedRegistryRecords(): RelatedRegistryRecord[] {
  return [
    ...moduleRecords,
    ...conceptRecords,
    ...modelRecords,
    ...paperRecords,
    ...trainingRegimeRecords,
    ...systemRecords,
    ...datasetRecords,
    ...organizationRecords,
  ];
}

/** Synchronous registry lookup for related-doc capable registry records. */
export function getRegistryRecordById(
  registryId: string,
): RelatedRegistryRecord | undefined {
  return getTaggedRecordById(registryId);
}

/** Registry ids with a published docs page (used to avoid broken related links). */
export function getPublishedDocsRegistryIds(): PublishedDocsRegistryIds {
  return PUBLISHED_DOCS_REGISTRY_IDS;
}

/** Tags declared on a registry record, when the record exists. */
export function getRegistryTags(registryId: string): string[] | undefined {
  return getTaggedRecordById(registryId)?.tags;
}

/** Citation IDs declared on a registry record, when the record exists. */
export function getRegistryCitationIds(
  registryId: string,
): string[] | undefined {
  return getTaggedRecordById(registryId)?.citationIds;
}
>>>>>>> 09578f4b (feat: [wordpiece-module-page-001] - Publish the canonical WordPiece module page)
