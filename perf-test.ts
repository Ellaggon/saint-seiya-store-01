import * as fs from 'fs';
import { CatalogQueryService } from "./src/application/services/CatalogQueryService";

async function runTest() {
  console.log("---- STARTING PERF TEST ----");
  const service = new CatalogQueryService();
  
  // By-pass cache trick if necessary, but we just restarted this script, so caches are empty!
  
  console.log("1. Fetching Metadata (Cache Miss)");
  const metStart = performance.now();
  await service.getCatalogMetadata();
  const metTotal = performance.now() - metStart;
  console.log(`> Metadata Total: ${metTotal.toFixed(2)} ms\n`);

  console.log("2. Fetching Products (Cache Miss)");
  const prodStart = performance.now();
  await service.getCatalogProducts({ category: "myth-cloth-ex" });
  const prodTotal = performance.now() - prodStart;
  console.log(`> Products Total: ${prodTotal.toFixed(2)} ms\n`);
  
  console.log("3. Fetching Products Again (Cache Hit)");
  const prodStart2 = performance.now();
  await service.getCatalogProducts({ category: "myth-cloth-ex" });
  const prodTotal2 = performance.now() - prodStart2;
  console.log(`> Products Total (Hit): ${prodTotal2.toFixed(2)} ms\n`);

  console.log("---- PERF TEST DONE ----");
}

runTest().catch(console.error);
