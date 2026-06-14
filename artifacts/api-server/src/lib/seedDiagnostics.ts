import { sql } from "drizzle-orm";
import { db, diagnosticAssessmentsTable } from "@workspace/db";
import { logger } from "./logger";
import { DIAGNOSTIC_SEED } from "./diagnosticContent";

// A stable signature of the desired assessment shells. If the rows currently in
// the database don't match it, we replace them (self-healing) so an existing or
// previously-seeded database picks up the new structure. No template items are
// seeded any more — every attempt's items are generated fresh at runtime.
function desiredSignature(): string {
  return JSON.stringify(
    DIAGNOSTIC_SEED.map((a, i) => [a.instrument, a.phase, a.title, i]),
  );
}

async function existingSignature(): Promise<string> {
  const rows = await db
    .select({
      instrument: diagnosticAssessmentsTable.instrument,
      phase: diagnosticAssessmentsTable.phase,
      title: diagnosticAssessmentsTable.title,
      position: diagnosticAssessmentsTable.position,
    })
    .from(diagnosticAssessmentsTable)
    .orderBy(diagnosticAssessmentsTable.position);
  return JSON.stringify(
    rows.map((r) => [r.instrument, r.phase, r.title, r.position]),
  );
}

export async function seedDiagnosticsIfEmpty(): Promise<void> {
  if ((await existingSignature()) === desiredSignature()) {
    logger.info("Diagnostic seed: up to date, skipping");
    return;
  }

  // Replace any prior assessments (cascades to items/attempts/responses). This
  // removes the legacy ethics/critical assessments and reseeds the new shells.
  logger.info("Diagnostic seed: (re)seeding assessment shells");
  await db.execute(sql`delete from diagnostic_assessments`);

  for (let i = 0; i < DIAGNOSTIC_SEED.length; i++) {
    const a = DIAGNOSTIC_SEED[i]!;
    const [inserted] = await db
      .insert(diagnosticAssessmentsTable)
      .values({
        instrument: a.instrument,
        phase: a.phase,
        title: a.title,
        subtitle: a.subtitle,
        instructions: a.instructions,
        position: i,
      })
      .returning();
    if (!inserted) throw new Error(`Failed to insert assessment ${a.title}`);
  }

  logger.info({ assessments: DIAGNOSTIC_SEED.length }, "Diagnostic seed complete");
}
