export * from "./schema.js";
export { scan, classifyInput, parseGithubUrl, finish, ScanError, type ScanInput, type ScanOptions } from "./scan.js";
export { buildTombstone, signalsOf } from "./tombstone.js";
export { penalties, vitality, statusOf, graveyardScore, type Signals } from "./scoring.js";
export { FIELDS, lookupField, type PackageFacts } from "./facts.js";
export { SUCCESSORS, successorFor, parseSuccessorFromDeprecation } from "./successors.js";
export { RECIPES, recipeForPackage, resurrect, type Recipe, type SourceFile, type ResurrectInput } from "./recipes/index.js";
export { fetchRepoSources } from "./repoFiles.js";
