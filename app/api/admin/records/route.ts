/**
 * /api/admin/records
 *
 * Maintain Records for the projects table.
 * Creating a project adds one to the site and owner totals.
 * Editing a project does not change those totals or the task and milestone counts.
 */

import { createAdminRecord, listAdminRecords, requireAdmin } from '@/lib/admin';

export async function GET() {
  const access = await requireAdmin();
  if (!access.ok) return access.response;
  try {
    const records = await listAdminRecords(access.db);
    return Response.json({ records }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Admin records failed', error instanceof Error ? error.message : error);
    return Response.json({ error: 'Unable to load projects.' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const access = await requireAdmin();
  if (!access.ok) return access.response;
  try {
    const body = (await req.json()) as {
      title?: string;
      course?: string;
      deadline?: string;
      description?: string;
    };
    const created = await createAdminRecord(access.db, access.adminId, body);
    if (!created.ok) return Response.json({ error: created.error }, { status: 400 });
    return Response.json({ ok: true, id: created.id }, { headers: { 'Cache-Control': 'private, no-store' } });
  } catch (error) {
    console.error('Admin record create failed', error instanceof Error ? error.message : error);
    return Response.json({ error: 'Unable to create that project.' }, { status: 500 });
  }
}
