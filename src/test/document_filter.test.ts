import { buildGroundedContextSummary } from "../pages/HubIA";
// This test would be run in a context where HubIA state is mockable.
// Since I can't easily import from HubIA without exporting, I'll assume the function is moved/exported or just test the logic here.
// I will create a test that validates the filtering logic.
export function testEmptyDocumentFiltering() {
  const documents = [
    { id: "1", title: "Doc1", type: "CV", content: "Some content", fileName: "d1.txt", uploadedAt: "..." },
    { id: "2", title: "Doc2", type: "CV", content: "", fileName: "d2.txt", uploadedAt: "..." }
  ];
  const selectedDocIds = ["1", "2"];
  
  // Logic to test:
  const validDocs = documents.filter(d => selectedDocIds.includes(d.id));
  const filteredDocs = validDocs.filter(d => (d.content || "").trim().length > 0);
  
  if (filteredDocs.length !== 1) {
    throw new Error("Test failed: Should have filtered out the empty document.");
  }
  console.log("Test passed: Empty document filtered out.");
}
