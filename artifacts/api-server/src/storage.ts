import { db, usersTable, loginVisitsTable, siteVisitorsTable } from "@workspace/db";
import { desc, eq, gte, sql } from "drizzle-orm";

export type UserRow = typeof usersTable.$inferSelect;
export type VisitRow = typeof loginVisitsTable.$inferSelect;

export const storage = {
  async getUserById(id: number): Promise<UserRow | undefined> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, id));
    return user;
  },

  async getUserByGoogleId(googleId: string): Promise<UserRow | undefined> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.googleId, googleId));
    return user;
  },

  async getUserByEmail(email: string): Promise<UserRow | undefined> {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));
    return user;
  },

  async createUserWithGoogle(data: {
    username: string;
    googleId: string;
    email: string | null;
    displayName: string | null;
  }): Promise<UserRow> {
    const existing = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, data.username));
    const username =
      existing.length > 0
        ? `${data.username}_${data.googleId.substring(0, 6)}`
        : data.username;
    const [user] = await db
      .insert(usersTable)
      .values({
        username,
        googleId: data.googleId,
        email: data.email,
        displayName: data.displayName,
      })
      .returning();
    return user;
  },

  async updateUserGoogle(
    id: number,
    data: { googleId?: string; displayName?: string | null },
  ): Promise<UserRow> {
    const [user] = await db
      .update(usersTable)
      .set(data)
      .where(eq(usersTable.id, id))
      .returning();
    return user;
  },

  async recordVisit(userId: number, email: string | null): Promise<void> {
    await db.insert(loginVisitsTable).values({ userId, email });
  },

  async getVisits(limit: number): Promise<VisitRow[]> {
    return db
      .select()
      .from(loginVisitsTable)
      .orderBy(desc(loginVisitsTable.visitedAt))
      .limit(limit);
  },

  async touchVisitor(visitorId: string): Promise<void> {
    await db
      .insert(siteVisitorsTable)
      .values({ visitorId })
      .onConflictDoUpdate({
        target: siteVisitorsTable.visitorId,
        set: { lastSeenAt: sql`now()` },
      });
  },

  async getUniqueVisitorStats(): Promise<{
    allTime: number;
    last24Hours: number;
    last7Days: number;
    lastMonth: number;
    lastYear: number;
  }> {
    const rows = await db
      .select({ lastSeenAt: siteVisitorsTable.lastSeenAt })
      .from(siteVisitorsTable);
    const now = Date.now();
    const DAY = 24 * 60 * 60 * 1000;
    // "Visitors in the last N days" = distinct browsers ACTIVE in that window
    // (last_seen_at), not just first-time visitors.
    const times = rows.map((r) => new Date(r.lastSeenAt).getTime());
    const since = (ms: number) => times.filter((t) => t >= now - ms).length;
    return {
      allTime: times.length,
      last24Hours: since(DAY),
      last7Days: since(7 * DAY),
      lastMonth: since(30 * DAY),
      lastYear: since(365 * DAY),
    };
  },

  async getVisitTimestampsSince(since: Date | null): Promise<Date[]> {
    const rows = since
      ? await db
          .select({ visitedAt: loginVisitsTable.visitedAt })
          .from(loginVisitsTable)
          .where(gte(loginVisitsTable.visitedAt, since))
      : await db
          .select({ visitedAt: loginVisitsTable.visitedAt })
          .from(loginVisitsTable);
    return rows.map((r) => r.visitedAt);
  },
};
